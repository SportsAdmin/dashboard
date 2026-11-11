-- =============================================================================
-- Fix stock flows: sales, restocks (purchase orders), returns, adjustments
--
-- Before: every sale_items insert fired 4 overlapping triggers (two crashed on
-- non-existent columns, one decremented stock in EVERY club) on top of the
-- decrement already done by create_sale.
--
-- After: one RPC per business operation, each atomic, SECURITY DEFINER with
-- explicit role/club checks, row locks against overselling, and a stock
-- movement (signed quantity) for every change:
--   create_sale            -> sale       (-qty)
--   PO status 'delivered'  -> restock    (+qty)   (trigger on purchase_orders)
--   create_return          -> return     (+qty, unless condition = 'damaged')
--   adjust_stock           -> adjustment (+/-qty) (admin / manager)
-- Direct client writes to sales / stock tables are revoked: RPCs are the only path.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Remove the broken / duplicated sale triggers and dead functions
-- -----------------------------------------------------------------------------
drop trigger if exists sale_stock_trigger on public.sale_items;
drop trigger if exists update_stock_after_sale on public.sale_items;
drop trigger if exists register_stock_movement on public.sale_items;
drop trigger if exists validate_stock on public.sale_items;

drop function if exists public.handle_sale_stock();
drop function if exists public.reduce_stock_after_sale();
drop function if exists public.create_stock_movement();
drop function if exists public.check_stock_before_sale();
drop function if exists public.prevent_negative_stock();
drop function if exists public.handle_restock();
drop function if exists public.restock_inventory(uuid, uuid, integer, uuid);
drop function if exists public.create_sale(uuid, uuid, uuid, jsonb, jsonb);
drop function if exists public.create_return(uuid, uuid, uuid, integer, text);

-- -----------------------------------------------------------------------------
-- 2. Data invariants
-- -----------------------------------------------------------------------------
alter table public.inventory_items
  add constraint inventory_items_stock_non_negative check (stock >= 0);
alter table public.sale_items
  add constraint sale_items_quantity_positive check (quantity > 0);
alter table public.purchase_order_items
  add constraint purchase_order_items_quantity_positive check (quantity > 0);
alter table public.return_items
  add constraint return_items_quantity_positive check (quantity > 0);

alter table public.return_items add column if not exists restocked boolean not null default true;
alter table public.returns add column if not exists created_by uuid references auth.users (id);

-- -----------------------------------------------------------------------------
-- 3. Helper: current staff member (raises if not logged in / no profile)
-- -----------------------------------------------------------------------------
create or replace function public._require_staff(p_allowed_roles text[] default array['admin', 'manager', 'seller'])
returns table (user_id uuid, role text, club_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  return query select p.id, p.role, p.club_id from profiles p where p.id = v_uid;
  if not found then
    raise exception 'El usuario no tiene perfil' using errcode = '42501';
  end if;

  if not exists (select 1 from profiles p where p.id = v_uid and p.role = any (p_allowed_roles)) then
    raise exception 'Permiso denegado para este rol' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public._require_staff(text[]) from public, anon, authenticated;

-- Resolve the club an operation applies to: staff -> their own club; admin -> p_club_id.
create or replace function public._resolve_club(p_role text, p_own_club uuid, p_requested uuid)
returns uuid
language plpgsql
immutable
as $$
begin
  if p_role = 'admin' then
    if coalesce(p_requested, p_own_club) is null then
      raise exception 'Indicá el club (p_club_id)' using errcode = '22023';
    end if;
    return coalesce(p_requested, p_own_club);
  end if;

  if p_own_club is null then
    raise exception 'El usuario no tiene club asignado' using errcode = '42501';
  end if;
  if p_requested is not null and p_requested <> p_own_club then
    raise exception 'No podés operar sobre otro club' using errcode = '42501';
  end if;
  return p_own_club;
end;
$$;

revoke execute on function public._resolve_club(text, uuid, uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. create_sale
--   p_items:    [{ "variant_id": uuid, "quantity": int }]   (price comes from the DB)
--   p_payments: [{ "method": "cash|card|transfer|mercadopago", "amount": numeric }]
--               must add up to the sale total.
-- -----------------------------------------------------------------------------
create or replace function public.create_sale(
  p_items jsonb,
  p_payments jsonb,
  p_customer_id uuid default null,
  p_club_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff record;
  v_club uuid;
  v_sale_id uuid;
  v_total numeric(12, 2) := 0;
  v_paid numeric(12, 2) := 0;
  v_line record;
  v_methods text[];
  v_cash numeric(12, 2);
  v_register uuid;
begin
  select * into v_staff from public._require_staff();
  v_club := public._resolve_club(v_staff.role, v_staff.club_id, p_club_id);

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos' using errcode = '22023';
  end if;
  if p_payments is null or jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then
    raise exception 'La venta no tiene pagos' using errcode = '22023';
  end if;

  -- Group lines by variant, lock inventory rows (ordered to avoid deadlocks)
  create temp table _sale_lines on commit drop as
  select (i->>'variant_id')::uuid as variant_id, sum((i->>'quantity')::int) as quantity
  from jsonb_array_elements(p_items) i
  group by 1;

  if exists (select 1 from _sale_lines where variant_id is null or quantity is null or quantity <= 0) then
    raise exception 'Cantidad inválida en la venta' using errcode = '22023';
  end if;

  for v_line in
    select l.variant_id, l.quantity, ii.id as inventory_item_id, ii.stock,
           coalesce(pv.price_sale, pv.price) as unit_price,
           p.name || coalesce(' ' || s.name, '') || coalesce(' ' || pv.color, '') as label,
           p.active, p.club_id as product_club
    from _sale_lines l
    left join inventory_items ii on ii.variant_id = l.variant_id and ii.club_id = v_club
    left join product_variants pv on pv.id = l.variant_id
    left join products p on p.id = pv.product_id
    left join sizes s on s.id = pv.size_id
    order by l.variant_id
  loop
    if v_line.inventory_item_id is null or v_line.product_club is distinct from v_club then
      raise exception 'Producto % no disponible en este club', v_line.variant_id using errcode = 'P0002';
    end if;
    if not coalesce(v_line.active, false) then
      raise exception 'El producto "%" está inactivo', v_line.label using errcode = '22023';
    end if;
    if v_line.unit_price is null or v_line.unit_price <= 0 then
      raise exception 'El producto "%" no tiene precio', v_line.label using errcode = '22023';
    end if;

    perform 1 from inventory_items where id = v_line.inventory_item_id for update;
  end loop;

  -- Re-read stock after locking and validate
  for v_line in
    select l.variant_id, l.quantity, ii.stock,
           p.name || coalesce(' ' || s.name, '') || coalesce(' ' || pv.color, '') as label
    from _sale_lines l
    join inventory_items ii on ii.variant_id = l.variant_id and ii.club_id = v_club
    join product_variants pv on pv.id = l.variant_id
    join products p on p.id = pv.product_id
    left join sizes s on s.id = pv.size_id
  loop
    if v_line.stock < v_line.quantity then
      raise exception 'Stock insuficiente para "%": disponible %, solicitado %',
        v_line.label, v_line.stock, v_line.quantity using errcode = 'P0001';
    end if;
  end loop;

  select sum(l.quantity * coalesce(pv.price_sale, pv.price))
  into v_total
  from _sale_lines l join product_variants pv on pv.id = l.variant_id;

  -- Payments
  if exists (
    select 1 from jsonb_array_elements(p_payments) x
    where (x->>'method') not in ('cash', 'transfer', 'card', 'mercadopago')
       or (x->>'amount') is null or (x->>'amount')::numeric <= 0
  ) then
    raise exception 'Pago inválido' using errcode = '22023';
  end if;

  select sum((x->>'amount')::numeric), array_agg(distinct x->>'method')
  into v_paid, v_methods
  from jsonb_array_elements(p_payments) x;

  if v_paid <> v_total then
    raise exception 'Los pagos (%) no coinciden con el total de la venta (%)', v_paid, v_total
      using errcode = '22023';
  end if;

  if p_customer_id is not null and not exists (select 1 from customers where id = p_customer_id) then
    raise exception 'Cliente inexistente' using errcode = 'P0002';
  end if;

  -- Write everything
  insert into sales (club_id, seller_id, customer_id, total, payment_method)
  values (v_club, v_staff.user_id, p_customer_id, v_total,
          case when array_length(v_methods, 1) = 1 then v_methods[1] end)
  returning id into v_sale_id;

  insert into sale_items (sale_id, variant_id, quantity, price)
  select v_sale_id, l.variant_id, l.quantity, coalesce(pv.price_sale, pv.price)
  from _sale_lines l join product_variants pv on pv.id = l.variant_id;

  update inventory_items ii
  set stock = ii.stock - l.quantity
  from _sale_lines l
  where ii.variant_id = l.variant_id and ii.club_id = v_club;

  insert into stock_movements (club_id, variant_id, inventory_item_id, type, quantity, reference_id, user_id)
  select v_club, l.variant_id, ii.id, 'sale', -l.quantity, v_sale_id, v_staff.user_id
  from _sale_lines l
  join inventory_items ii on ii.variant_id = l.variant_id and ii.club_id = v_club;

  insert into payments (sale_id, club_id, method, amount)
  select v_sale_id, v_club, x->>'method', (x->>'amount')::numeric
  from jsonb_array_elements(p_payments) x;

  -- Cash goes to the open register, if there is one
  select sum((x->>'amount')::numeric) into v_cash
  from jsonb_array_elements(p_payments) x where x->>'method' = 'cash';

  if v_cash > 0 then
    select id into v_register from cash_registers
    where club_id = v_club and status = 'open'
    order by opened_at desc limit 1;

    if v_register is not null then
      insert into cash_movements (cash_register_id, club_id, type, amount, reference_id, notes)
      values (v_register, v_club, 'sale', v_cash, v_sale_id, 'Venta');
    end if;
  end if;

  if p_customer_id is not null then
    insert into customer_clubs (customer_id, club_id) values (p_customer_id, v_club)
    on conflict (customer_id, club_id) do nothing;
  end if;

  drop table _sale_lines;
  return v_sale_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. create_return
--   p_items: [{ "variant_id": uuid, "quantity": int, "condition": "new|used|damaged" }]
--   'damaged' items are recorded but NOT put back into stock.
-- -----------------------------------------------------------------------------
create or replace function public.create_return(
  p_sale_id uuid,
  p_items jsonb,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff record;
  v_sale record;
  v_return_id uuid;
  v_line record;
begin
  select * into v_staff from public._require_staff();

  select id, club_id, customer_id into v_sale from sales where id = p_sale_id for update;
  if not found then
    raise exception 'Venta inexistente' using errcode = 'P0002';
  end if;
  perform public._resolve_club(v_staff.role, v_staff.club_id, v_sale.club_id);

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La devolución no tiene productos' using errcode = '22023';
  end if;

  create temp table _return_lines on commit drop as
  select (i->>'variant_id')::uuid as variant_id,
         coalesce(i->>'condition', 'new') as condition,
         sum((i->>'quantity')::int) as quantity
  from jsonb_array_elements(p_items) i
  group by 1, 2;

  if exists (select 1 from _return_lines where variant_id is null or quantity is null or quantity <= 0
             or condition not in ('new', 'used', 'damaged')) then
    raise exception 'Ítem de devolución inválido' using errcode = '22023';
  end if;

  -- Can't return more than was sold (minus previous returns)
  for v_line in
    select r.variant_id, sum(r.quantity) as requested,
           coalesce((select sum(si.quantity) from sale_items si
                     where si.sale_id = p_sale_id and si.variant_id = r.variant_id), 0) as sold,
           coalesce((select sum(ri.quantity) from return_items ri join returns rt on rt.id = ri.return_id
                     where rt.sale_id = p_sale_id and ri.variant_id = r.variant_id), 0) as already_returned
    from _return_lines r
    group by r.variant_id
  loop
    if v_line.sold = 0 then
      raise exception 'El producto % no forma parte de la venta', v_line.variant_id using errcode = '22023';
    end if;
    if v_line.requested > v_line.sold - v_line.already_returned then
      raise exception 'No se pueden devolver % unidades: vendidas %, ya devueltas %',
        v_line.requested, v_line.sold, v_line.already_returned using errcode = '22023';
    end if;
  end loop;

  insert into returns (sale_id, club_id, customer_id, reason, created_by)
  values (p_sale_id, v_sale.club_id, v_sale.customer_id, p_reason, v_staff.user_id)
  returning id into v_return_id;

  insert into return_items (return_id, variant_id, quantity, condition, restocked)
  select v_return_id, variant_id, quantity, condition, condition <> 'damaged'
  from _return_lines;

  update inventory_items ii
  set stock = ii.stock + r.qty
  from (select variant_id, sum(quantity) qty from _return_lines where condition <> 'damaged' group by 1) r
  where ii.variant_id = r.variant_id and ii.club_id = v_sale.club_id;

  insert into stock_movements (club_id, variant_id, inventory_item_id, type, quantity, reference_id, user_id)
  select v_sale.club_id, r.variant_id, ii.id, 'return', r.qty, v_return_id, v_staff.user_id
  from (select variant_id, sum(quantity) qty from _return_lines where condition <> 'damaged' group by 1) r
  join inventory_items ii on ii.variant_id = r.variant_id and ii.club_id = v_sale.club_id;

  drop table _return_lines;
  return v_return_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. adjust_stock: manual correction (inventory count, loss, initial load)
-- -----------------------------------------------------------------------------
create or replace function public.adjust_stock(
  p_inventory_item_id uuid,
  p_delta integer,
  p_reason text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff record;
  v_item record;
  v_new_stock integer;
begin
  select * into v_staff from public._require_staff(array['admin', 'manager']);

  select id, club_id, variant_id, stock into v_item
  from inventory_items where id = p_inventory_item_id for update;
  if not found then
    raise exception 'Ítem de inventario inexistente' using errcode = 'P0002';
  end if;
  perform public._resolve_club(v_staff.role, v_staff.club_id, v_item.club_id);

  if p_delta is null or p_delta = 0 then
    raise exception 'El ajuste debe ser distinto de 0' using errcode = '22023';
  end if;
  if v_item.stock + p_delta < 0 then
    raise exception 'El ajuste deja el stock negativo (actual %, ajuste %)', v_item.stock, p_delta
      using errcode = 'P0001';
  end if;

  update inventory_items set stock = stock + p_delta where id = p_inventory_item_id
  returning stock into v_new_stock;

  insert into stock_movements (club_id, variant_id, inventory_item_id, type, quantity, reference_id, user_id)
  values (v_item.club_id, v_item.variant_id, v_item.id, 'adjustment', p_delta, null, v_staff.user_id);

  return v_new_stock;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Purchase orders: restock once, when the order becomes 'delivered'
-- -----------------------------------------------------------------------------
create or replace function public.handle_purchase_order_delivered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'delivered' and new.status is distinct from 'delivered' then
    raise exception 'Una orden entregada no puede cambiar de estado' using errcode = '22023';
  end if;

  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    if exists (
      select 1 from purchase_order_items poi
      join inventory_items ii on ii.id = poi.inventory_item_id
      where poi.purchase_order_id = new.id and ii.club_id is distinct from new.club_id
    ) then
      raise exception 'La orden tiene ítems de otro club' using errcode = '22023';
    end if;

    update inventory_items ii
    set stock = ii.stock + agg.qty
    from (
      select inventory_item_id, sum(quantity) qty
      from purchase_order_items where purchase_order_id = new.id
      group by 1
    ) agg
    where ii.id = agg.inventory_item_id;

    insert into stock_movements (club_id, variant_id, inventory_item_id, type, quantity, reference_id, user_id)
    select ii.club_id, ii.variant_id, ii.id, 'restock', agg.qty, new.id, auth.uid()
    from (
      select inventory_item_id, sum(quantity) qty
      from purchase_order_items where purchase_order_id = new.id
      group by 1
    ) agg
    join inventory_items ii on ii.id = agg.inventory_item_id;
  end if;

  return new;
end;
$$;

-- Items of a delivered order are frozen (stock was already applied)
create or replace function public.lock_delivered_purchase_order_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from purchase_orders
    where id = coalesce(new.purchase_order_id, old.purchase_order_id) and status = 'delivered'
  ) then
    raise exception 'No se pueden modificar los ítems de una orden entregada' using errcode = '22023';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists lock_delivered_po_items on public.purchase_order_items;
create trigger lock_delivered_po_items
  before insert or update or delete on public.purchase_order_items
  for each row execute function public.lock_delivered_purchase_order_items();

-- -----------------------------------------------------------------------------
-- 8. Permissions: RPCs are the only way to move stock or record sales
-- -----------------------------------------------------------------------------
revoke insert, update, delete on public.sales, public.sale_items, public.payments,
  public.stock_movements, public.returns, public.return_items, public.inventory_items
  from authenticated;

revoke execute on function public.create_sale(jsonb, jsonb, uuid, uuid) from public, anon;
revoke execute on function public.create_return(uuid, jsonb, text) from public, anon;
revoke execute on function public.adjust_stock(uuid, integer, text) from public, anon;
revoke execute on function public.handle_purchase_order_delivered() from public, anon, authenticated;
revoke execute on function public.lock_delivered_purchase_order_items() from public, anon, authenticated;
revoke execute on function public.create_inventory_for_variant() from public, anon, authenticated;

grant execute on function public.create_sale(jsonb, jsonb, uuid, uuid) to authenticated;
grant execute on function public.create_return(uuid, jsonb, text) to authenticated;
grant execute on function public.adjust_stock(uuid, integer, text) to authenticated;
