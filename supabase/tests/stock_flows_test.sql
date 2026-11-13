-- =============================================================================
-- Stock flow scenarios: restock (purchase order), sale, return, adjustment.
--
-- Safe to run against ANY environment (including production): everything runs
-- inside a transaction that ends in ROLLBACK, so no data is kept.
--
-- Run:  Supabase Dashboard -> SQL Editor -> paste & run
--       or: psql "$DATABASE_URL" -f supabase/tests/stock_flows_test.sql
--
-- Requires: an admin, and a club with one manager + one seller, plus a seller
-- from a different club (used to test cross-club isolation).
-- =============================================================================
begin;

create temp table t_results (n serial, escenario text, ok boolean, detalle text);

do $test$
declare
  v_admin uuid;
  v_club uuid;
  v_manager uuid;
  v_seller uuid;
  v_other_seller uuid;
  v_product uuid;
  v_variant uuid;
  v_item uuid;
  v_po uuid;
  v_sale uuid;
  v_split_sale uuid;
  v_return uuid;
  v_err2 text;
  v_seller_product uuid;
  v_admin_product uuid;
  v_admin_po uuid;
  v_today date;
  v_base jsonb;
  v_sum jsonb;
  v_list jsonb;
  v_week jsonb;
  v_year jsonb;
  v_other jsonb;
  v_other_manager uuid;
  v_num numeric;
  v_num2 numeric;
  v_num3 numeric;
  v_num4 numeric;
  v_stock int;
  v_ledger int;
  v_err text;
  v_res int;

  -- helpers (inline)
  c_claims constant text := '{"sub":"%s","role":"authenticated"}';
begin
  -- ---------------------------------------------------------------- actors
  select id into v_admin from profiles where role = 'admin' limit 1;
  select p.club_id, p.id into v_club, v_manager
  from profiles p
  where p.role = 'manager' and p.club_id is not null
    and exists (select 1 from profiles s where s.role = 'seller' and s.club_id = p.club_id)
  limit 1;
  select id into v_seller from profiles where role = 'seller' and club_id = v_club limit 1;
  select id into v_other_seller from profiles where role = 'seller' and club_id <> v_club limit 1;
  select id into v_other_manager from profiles where role = 'manager' and club_id <> v_club limit 1;

  if v_admin is null or v_manager is null or v_seller is null or v_other_seller is null then
    raise exception 'Faltan usuarios de prueba (admin, manager+seller del mismo club, seller de otro club)';
  end if;

  -- Sales report baseline for today (real sales may already exist)
  v_today := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_manager), true);
  v_base := public.sales_summary(v_today, v_today);
  reset role;

  -- ---------------------------------------------------------------- fixture (as postgres)
  insert into products (club_id, name, category, description, active)
  values (v_club, 'TEST Remera', 'test', 'Producto de prueba', true)
  returning id into v_product;

  insert into product_variants (product_id, color, price, price_sale)
  values (v_product, 'TEST', 1000, null)
  returning id into v_variant;

  select id, stock into v_item, v_stock from inventory_items where variant_id = v_variant and club_id = v_club;
  insert into t_results (escenario, ok, detalle)
  values ('0. Al crear una variante se crea su inventario en 0', v_item is not null and v_stock = 0,
          format('stock=%s', v_stock));

  -- ================================================================ 1. INGRESO DE STOCK
  -- manager creates a purchase order for 10 units
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_manager), true);
  v_po := public.create_purchase_order('Proveedor TEST', current_date, 'test',
            jsonb_build_array(jsonb_build_object('inventory_item_id', v_item, 'quantity', 10)));
  reset role;

  select stock into v_stock from inventory_items where id = v_item;
  insert into t_results (escenario, ok, detalle)
  values ('1a. Orden de compra pendiente NO suma stock', v_stock = 0, format('stock=%s', v_stock));

  -- seller can't change the order status
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
  update purchase_orders set status = 'delivered' where id = v_po;
  reset role;
  insert into t_results (escenario, ok, detalle)
  select '1a2. Un seller no puede marcar una orden como entregada', status = 'pending', format('status=%s', status)
  from purchase_orders where id = v_po;

  -- seller can't add items to an existing order
  v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
    insert into purchase_order_items (purchase_order_id, inventory_item_id, quantity) values (v_po, v_item, 99);
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  insert into t_results (escenario, ok, detalle)
  values ('1a3. Un seller no puede agregar ítems a una orden existente', v_err is not null, coalesce(v_err, 'SIN ERROR'));

  -- manager receives the goods (marks it delivered)
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_manager), true);
  update purchase_orders set status = 'delivered' where id = v_po;
  reset role;

  select stock into v_stock from inventory_items where id = v_item;
  insert into t_results (escenario, ok, detalle)
  values ('1b. Manager recibe la mercadería (orden entregada) y suma +10', v_stock = 10, format('stock=%s', v_stock));

  -- manager can't edit it anymore once delivered
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_manager), true);
  update purchase_orders set supplier = 'CAMBIADO' where id = v_po;
  reset role;
  insert into t_results (escenario, ok, detalle)
  select '1b2. Una orden entregada ya no la puede editar el manager', supplier = 'Proveedor TEST', format('supplier=%s', supplier)
  from purchase_orders where id = v_po;

  -- delivered is final
  v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_admin), true);
    update purchase_orders set status = 'shipped' where id = v_po;
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  select stock into v_stock from inventory_items where id = v_item;
  insert into t_results (escenario, ok, detalle)
  values ('1c. Una orden entregada no puede volver atrás (no duplica stock)',
          v_err is not null and v_stock = 10, coalesce(v_err, 'SIN ERROR'));

  -- ================================================================ 2. VENTA
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
  v_sale := public.create_sale(
    jsonb_build_array(jsonb_build_object('variant_id', v_variant, 'quantity', 3)),
    jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 3000)));
  reset role;

  select stock into v_stock from inventory_items where id = v_item;
  insert into t_results (escenario, ok, detalle)
  select '2a. Venta de 3 unidades descuenta -3 (una sola vez)', v_stock = 7, format('stock=%s', v_stock);

  insert into t_results (escenario, ok, detalle)
  select '2b. Venta registrada con total, vendedor y pago correctos',
         s.total = 3000 and s.seller_id = v_seller and s.club_id = v_club
           and (select count(*) from payments where sale_id = v_sale) = 1
           and (select count(*) from sale_items where sale_id = v_sale) = 1,
         format('total=%s seller_ok=%s', s.total, s.seller_id = v_seller)
  from sales s where s.id = v_sale;

  -- oversell
  v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
    perform public.create_sale(
      jsonb_build_array(jsonb_build_object('variant_id', v_variant, 'quantity', 8)),
      jsonb_build_array(jsonb_build_object('method', 'card', 'amount', 8000)));
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  select stock into v_stock from inventory_items where id = v_item;
  insert into t_results (escenario, ok, detalle)
  values ('2c. Vender más que el stock (8 de 7) falla y no toca el stock',
          v_err like 'Stock insuficiente%' and v_stock = 7, coalesce(v_err, 'SIN ERROR'));

  -- payments must match total
  v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
    perform public.create_sale(
      jsonb_build_array(jsonb_build_object('variant_id', v_variant, 'quantity', 1)),
      jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 500)));
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  insert into t_results (escenario, ok, detalle)
  values ('2d. Pago que no coincide con el total falla', v_err like 'Los pagos%', coalesce(v_err, 'SIN ERROR'));

  -- price comes from DB, client cannot set it
  insert into t_results (escenario, ok, detalle)
  select '2e. El precio sale de la base (no del cliente)', price = 1000, format('price=%s', price)
  from sale_items where sale_id = v_sale;

  -- other club's seller
  v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_other_seller), true);
    perform public.create_sale(
      jsonb_build_array(jsonb_build_object('variant_id', v_variant, 'quantity', 1)),
      jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 1000)));
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  select stock into v_stock from inventory_items where id = v_item;
  insert into t_results (escenario, ok, detalle)
  values ('2f. Vendedor de otro club no puede vender este stock', v_err is not null and v_stock = 7,
          coalesce(v_err, 'SIN ERROR'));

  -- split payment: cash + transfer
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
  v_split_sale := public.create_sale(
    jsonb_build_array(jsonb_build_object('variant_id', v_variant, 'quantity', 2)),
    jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 1200),
                      jsonb_build_object('method', 'transfer', 'amount', 800)));
  reset role;
  select stock into v_stock from inventory_items where id = v_item;
  insert into t_results (escenario, ok, detalle)
  select '2g. Pago mixto (1200 efectivo + 800 transferencia) se registra en 2 pagos',
         v_stock = 5 and count(*) = 2 and sum(amount) = 2000
           and (select payment_method from sales where id = v_split_sale) is null,
         format('stock=%s pagos=%s suma=%s', v_stock, count(*), sum(amount))
  from payments where sale_id = v_split_sale;

  -- tampered amounts (client says total is lower) are rejected
  v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
    perform public.create_sale(
      jsonb_build_array(jsonb_build_object('variant_id', v_variant, 'quantity', 2)),
      jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 1000),
                        jsonb_build_object('method', 'transfer', 'amount', 500)));
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  select stock into v_stock from inventory_items where id = v_item;
  insert into t_results (escenario, ok, detalle)
  values ('2h. Pago mixto con montos alterados (1500 de 2000) se rechaza',
          v_err like 'Los pagos%' and v_stock = 5, coalesce(v_err, 'SIN ERROR'));

  -- ================================================================ 3. DEVOLUCIÓN
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
  v_return := public.create_return(v_sale, jsonb_build_array(
    jsonb_build_object('variant_id', v_variant, 'quantity', 1, 'condition', 'new'),
    jsonb_build_object('variant_id', v_variant, 'quantity', 1, 'condition', 'damaged')), 'Prueba');
  reset role;

  select stock into v_stock from inventory_items where id = v_item;
  insert into t_results (escenario, ok, detalle)
  values ('3a. Devolver 1 nueva + 1 dañada suma solo +1', v_stock = 6, format('stock=%s', v_stock));

  v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
    perform public.create_return(v_sale, jsonb_build_array(
      jsonb_build_object('variant_id', v_variant, 'quantity', 2, 'condition', 'new')), 'De más');
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  select stock into v_stock from inventory_items where id = v_item;
  insert into t_results (escenario, ok, detalle)
  values ('3b. No se puede devolver más de lo vendido (3 vendidas, 2 devueltas, pide 2)',
          v_err like 'No se pueden devolver%' and v_stock = 6, coalesce(v_err, 'SIN ERROR'));

  -- seller can't delete a return (neither via RPC nor directly)
  v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
    perform public.delete_return(v_return);
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  v_err2 := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
    delete from returns where id = v_return;
  exception when others then v_err2 := sqlerrm;
  end;
  reset role;
  insert into t_results (escenario, ok, detalle)
  values ('3c. Un seller no puede eliminar una devolución',
          v_err is not null and v_err2 is not null and exists (select 1 from returns where id = v_return),
          format('rpc: %s / delete directo: %s', coalesce(v_err, 'SIN ERROR'), coalesce(v_err2, 'SIN ERROR')));

  -- manager cancels it: the +1 restocked unit is taken out again
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_manager), true);
  perform public.delete_return(v_return);
  reset role;
  select stock into v_stock from inventory_items where id = v_item;
  insert into t_results (escenario, ok, detalle)
  values ('3d. Manager anula la devolución y el stock vuelve (-1)',
          v_stock = 5 and not exists (select 1 from returns where id = v_return),
          format('stock=%s', v_stock));

  -- ================================================================ 4. AJUSTE MANUAL
  v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
    perform public.adjust_stock(v_item, 5, 'seller intenta');
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  insert into t_results (escenario, ok, detalle)
  values ('4a. Un seller no puede ajustar stock', v_err is not null, coalesce(v_err, 'SIN ERROR'));

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_manager), true);
  v_res := public.adjust_stock(v_item, -2, 'Conteo físico');
  reset role;
  insert into t_results (escenario, ok, detalle)
  values ('4b. Manager ajusta -2 (conteo físico)', v_res = 3, format('stock=%s', v_res));

  v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_manager), true);
    perform public.adjust_stock(v_item, -100, 'negativo');
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  insert into t_results (escenario, ok, detalle)
  values ('4c. Un ajuste no puede dejar stock negativo', v_err is not null, coalesce(v_err, 'SIN ERROR'));

  -- ================================================================ 5. INTEGRIDAD
  v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_manager), true);
    update inventory_items set stock = 999 where id = v_item;
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  insert into t_results (escenario, ok, detalle)
  values ('5a. Nadie puede editar el stock directo desde el cliente', v_err is not null,
          coalesce(v_err, 'SIN ERROR'));

  -- ================================================================ 6. PRODUCTOS POR ROL
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
  v_seller_product := public.create_product('TEST Seller', 'test', null,
    jsonb_build_array(jsonb_build_object('color', 'Azul', 'price', 500)));
  reset role;
  insert into t_results (escenario, ok, detalle)
  select '6a. Un seller puede crear productos (en su club, con inventario en 0)',
         p.club_id = v_club and exists (
           select 1 from product_variants pv join inventory_items ii on ii.variant_id = pv.id
           where pv.product_id = p.id and ii.club_id = v_club and ii.stock = 0),
         format('club_ok=%s', p.club_id = v_club)
  from products p where p.id = v_seller_product;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
  update products set name = 'EDITADO POR SELLER' where id = v_seller_product;
  reset role;
  insert into t_results (escenario, ok, detalle)
  select '6b. Un seller no puede editar productos', name = 'TEST Seller', format('name=%s', name)
  from products where id = v_seller_product;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_manager), true);
  update products set name = 'TEST Seller (editado)' where id = v_seller_product;
  delete from products where id = v_seller_product;
  reset role;
  insert into t_results (escenario, ok, detalle)
  select '6c. Manager edita productos de su club pero no los elimina',
         name = 'TEST Seller (editado)', format('name=%s', name)
  from products where id = v_seller_product;

  v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_admin), true);
    perform public.create_product('TEST Admin', 'test', null, '[]'::jsonb);
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  insert into t_results (escenario, ok, detalle)
  values ('6d. Admin sin club debe indicar el club (no crea productos huérfanos)',
          v_err like 'Indicá el club%', coalesce(v_err, 'SIN ERROR'));

  -- admin choosing the club (what the club selector sends as p_club_id)
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_admin), true);
  v_admin_product := public.create_product('TEST Admin', 'test', null,
    jsonb_build_array(jsonb_build_object('color', 'Rojo', 'price', 700)), v_club);
  v_admin_po := public.create_purchase_order('Proveedor admin', current_date, null,
    jsonb_build_array(jsonb_build_object('inventory_item_id', v_item, 'quantity', 1)), v_club);
  reset role;
  insert into t_results (escenario, ok, detalle)
  select '6e. Admin que elige el club crea producto y orden en ese club',
         (select club_id from products where id = v_admin_product) = v_club
           and (select club_id from purchase_orders where id = v_admin_po) = v_club,
         'ok';

  -- the order's products must belong to the chosen club
  v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_admin), true);
    perform public.create_purchase_order('Proveedor admin', current_date, null,
      jsonb_build_array(jsonb_build_object('inventory_item_id', v_item, 'quantity', 1)),
      (select id from clubs where id <> v_club limit 1));
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  insert into t_results (escenario, ok, detalle)
  values ('6f. Una orden no puede mezclar productos de otro club', v_err like 'La orden tiene productos%',
          coalesce(v_err, 'SIN ERROR'));

  -- ================================================================ 8. REPORTES DE VENTAS
  -- Test sales today in this club: 2a (3 units, $3.000 cash) and 2g (2 units, $1.200 cash + $800 transfer)
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_manager), true);
  v_sum := public.sales_summary(v_today, v_today);
  v_list := public.sales_list(v_today, v_today, null, 1, 5);
  v_week := public.sales_summary(date_trunc('week', v_today)::date, (date_trunc('week', v_today) + interval '6 day')::date);
  v_year := public.sales_summary(date_trunc('year', v_today)::date, (date_trunc('year', v_today) + interval '1 year - 1 day')::date);
  reset role;
  insert into t_results (escenario, ok, detalle)
  values ('8a. Caja diaria del manager: 2 ventas más, $5.000 más, 5 unidades más',
          (v_sum#>>'{totals,sales}')::int - (v_base#>>'{totals,sales}')::int = 2
            and (v_sum#>>'{totals,amount}')::numeric - (v_base#>>'{totals,amount}')::numeric = 5000
            and (v_sum#>>'{totals,units}')::int - (v_base#>>'{totals,units}')::int = 5,
          format('ventas=%s monto=%s unidades=%s', v_sum#>>'{totals,sales}', v_sum#>>'{totals,amount}',
                 v_sum#>>'{totals,units}'));

  select coalesce(sum((x->>'amount')::numeric) filter (where x->>'method' = 'cash'), 0),
         coalesce(sum((x->>'amount')::numeric) filter (where x->>'method' = 'transfer'), 0)
  into v_num, v_num2 from jsonb_array_elements(v_sum->'by_method') x;
  select coalesce(sum((x->>'amount')::numeric) filter (where x->>'method' = 'cash'), 0),
         coalesce(sum((x->>'amount')::numeric) filter (where x->>'method' = 'transfer'), 0)
  into v_num3, v_num4 from jsonb_array_elements(v_base->'by_method') x;
  insert into t_results (escenario, ok, detalle)
  values ('8b. Por medio de pago: el pago mixto suma a efectivo (+4.200) y transferencia (+800)',
          v_num - v_num3 = 4200 and v_num2 - v_num4 = 800,
          format('efectivo=%s transferencia=%s', v_num, v_num2));

  insert into t_results (escenario, ok, detalle)
  values ('8c. Paginado en la base: página de 5, total y cantidad de páginas correctos',
          (v_list->>'total_count')::int = (v_sum#>>'{totals,sales}')::int
            and jsonb_array_length(v_list->'rows') = least((v_list->>'total_count')::int, 5)
            and (v_list->>'page_count')::int = greatest(ceil((v_list->>'total_count')::numeric / 5)::int, 1)
            and (v_list#>>'{rows,0,payments}') is not null,
          format('total=%s filas=%s paginas=%s', v_list->>'total_count', jsonb_array_length(v_list->'rows'),
                 v_list->>'page_count'));

  insert into t_results (escenario, ok, detalle)
  values ('8d. Semana (7 días) y año (12 meses): la serie cambia de granularidad y suma lo mismo que el total',
          jsonb_array_length(v_week->'series') = 7 and v_week->>'bucket' = 'day'
            and jsonb_array_length(v_year->'series') = 12 and v_year->>'bucket' = 'month'
            and (select sum((x->>'amount')::numeric) from jsonb_array_elements(v_year->'series') x)
                = (v_year#>>'{totals,amount}')::numeric,
          format('semana=%s %s / año=%s %s', jsonb_array_length(v_week->'series'), v_week->>'bucket',
                 jsonb_array_length(v_year->'series'), v_year->>'bucket'));

  v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
    perform public.sales_summary(v_today, v_today);
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_other_manager), true);
  v_other := public.sales_summary(v_today, v_today, v_club);
  reset role;
  insert into t_results (escenario, ok, detalle)
  values ('8e. Un seller no ve reportes; un manager de otro club no ve ventas de este club aunque lo pida',
          v_err like 'Solo admin y manager%' and (v_other#>>'{totals,sales}')::int = 0,
          format('seller: %s / otro manager: %s ventas', coalesce(v_err, 'SIN ERROR'), v_other#>>'{totals,sales}'));

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_admin), true);
  v_other := public.sales_summary(v_today, v_today, v_club);
  reset role;
  insert into t_results (escenario, ok, detalle)
  values ('8f. El admin filtra por club y ve lo mismo que el manager de ese club',
          v_other->'totals' = v_sum->'totals', format('admin=%s manager=%s', v_other->'totals', v_sum->'totals'));

  select stock into v_stock from inventory_items where id = v_item;
  select coalesce(sum(quantity), 0) into v_ledger from stock_movements where inventory_item_id = v_item;
  insert into t_results (escenario, ok, detalle)
  values ('5b. Stock final = suma de movimientos (0 +10 -3 -2 +1 -1 -2 = 3)', v_stock = 3 and v_ledger = 3,
          format('stock=%s movimientos=%s', v_stock, v_ledger));
end;
$test$;

select n, case when ok then '✅' else '❌' end as resultado, escenario, detalle
from t_results order by n;

rollback;
