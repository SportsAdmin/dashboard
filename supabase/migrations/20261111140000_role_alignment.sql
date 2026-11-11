-- =============================================================================
-- Role alignment
--
-- Purchase orders
--   * Managers can update their club's orders (including marking them
--     'delivered' = receiving goods) as long as the order is not delivered yet.
--     Before, the USING clause (status = 'pending') was also applied to the new
--     row, so a manager could never change the status at all.
--   * Sellers create orders only through create_purchase_order (RPC); they can no
--     longer add items to existing orders directly.
--   * Nobody deletes orders (unchanged: there is no DELETE policy).
--
-- RPCs create_product / create_purchase_order
--   * Explicit role check (admin, manager, seller) and a club is mandatory:
--     staff use their own club; an admin must pass p_club_id. Before, an admin
--     (no club) silently created products/orders with club_id = NULL.
-- =============================================================================

-- ----------------------------------------------------------------------------- purchase_orders
drop policy if exists "po update" on public.purchase_orders;
create policy "po update" on public.purchase_orders for update to authenticated
  using (
    public.get_current_user_role() = 'admin'
    or (public.get_current_user_role() = 'manager'
        and club_id = public.get_current_user_club_id()
        and status <> 'delivered')
  )
  with check (
    public.get_current_user_role() = 'admin'
    or (public.get_current_user_role() = 'manager'
        and club_id = public.get_current_user_club_id())
  );

drop policy if exists "po items insert" on public.purchase_order_items;
create policy "po items insert" on public.purchase_order_items for insert to authenticated
  with check (exists (
    select 1 from public.purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and (public.get_current_user_role() = 'admin'
           or (public.get_current_user_role() = 'manager'
               and po.club_id = public.get_current_user_club_id()))
  ));

-- ----------------------------------------------------------------------------- create_product
drop function if exists public.create_product(text, text, text, jsonb);

create function public.create_product(
  p_name text,
  p_category text,
  p_description text,
  p_variants jsonb,
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
  v_product_id uuid;
  v_variant jsonb;
begin
  select * into v_staff from public._require_staff(array['admin', 'manager', 'seller']);
  v_club := public._resolve_club(v_staff.role, v_staff.club_id, p_club_id);

  if coalesce(trim(p_name), '') = '' then
    raise exception 'El producto necesita un nombre' using errcode = '22023';
  end if;

  insert into products (name, category, description, club_id)
  values (trim(p_name), p_category, p_description, v_club)
  returning id into v_product_id;

  -- inventory rows (stock 0) are created by the on_variant_created trigger
  for v_variant in select * from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb))
  loop
    insert into product_variants (product_id, size_id, color, price, price_sale)
    values (
      v_product_id,
      nullif(v_variant->>'size_id', '')::uuid,
      v_variant->>'color',
      (v_variant->>'price')::numeric,
      nullif(v_variant->>'price_sale', '')::numeric
    );
  end loop;

  return v_product_id;
end;
$$;

revoke execute on function public.create_product(text, text, text, jsonb, uuid) from public, anon;
grant execute on function public.create_product(text, text, text, jsonb, uuid) to authenticated;

-- ----------------------------------------------------------------------------- create_purchase_order
drop function if exists public.create_purchase_order(text, date, text, jsonb);

create function public.create_purchase_order(
  p_supplier text,
  p_expected_date date,
  p_notes text,
  p_items jsonb,
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
  v_order_id uuid;
begin
  select * into v_staff from public._require_staff(array['admin', 'manager', 'seller']);
  v_club := public._resolve_club(v_staff.role, v_staff.club_id, p_club_id);

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La orden no tiene productos' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) i
    left join inventory_items ii on ii.id = (i->>'inventory_item_id')::uuid
    where ii.id is null or ii.club_id is distinct from v_club
  ) then
    raise exception 'La orden tiene productos que no pertenecen al club' using errcode = '22023';
  end if;

  insert into purchase_orders (supplier, expected_date, notes, club_id, status)
  values (p_supplier, p_expected_date, p_notes, v_club, 'pending')
  returning id into v_order_id;

  insert into purchase_order_items (purchase_order_id, inventory_item_id, quantity)
  select v_order_id, (i->>'inventory_item_id')::uuid, (i->>'quantity')::int
  from jsonb_array_elements(p_items) i;

  return v_order_id;
end;
$$;

revoke execute on function public.create_purchase_order(text, date, text, jsonb, uuid) from public, anon;
grant execute on function public.create_purchase_order(text, date, text, jsonb, uuid) to authenticated;
