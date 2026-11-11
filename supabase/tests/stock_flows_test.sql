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
  v_return uuid;
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

  if v_admin is null or v_manager is null or v_seller is null or v_other_seller is null then
    raise exception 'Faltan usuarios de prueba (admin, manager+seller del mismo club, seller de otro club)';
  end if;

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

  -- admin marks it delivered
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_admin), true);
  update purchase_orders set status = 'delivered' where id = v_po;
  reset role;

  select stock into v_stock from inventory_items where id = v_item;
  insert into t_results (escenario, ok, detalle)
  values ('1b. Orden entregada suma +10', v_stock = 10, format('stock=%s', v_stock));

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

  -- ================================================================ 3. DEVOLUCIÓN
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', format(c_claims, v_seller), true);
  v_return := public.create_return(v_sale, jsonb_build_array(
    jsonb_build_object('variant_id', v_variant, 'quantity', 1, 'condition', 'new'),
    jsonb_build_object('variant_id', v_variant, 'quantity', 1, 'condition', 'damaged')), 'Prueba');
  reset role;

  select stock into v_stock from inventory_items where id = v_item;
  insert into t_results (escenario, ok, detalle)
  values ('3a. Devolver 1 nueva + 1 dañada suma solo +1', v_stock = 8, format('stock=%s', v_stock));

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
          v_err like 'No se pueden devolver%' and v_stock = 8, coalesce(v_err, 'SIN ERROR'));

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
  values ('4b. Manager ajusta -2 (conteo físico)', v_res = 6, format('stock=%s', v_res));

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

  select stock into v_stock from inventory_items where id = v_item;
  select coalesce(sum(quantity), 0) into v_ledger from stock_movements where inventory_item_id = v_item;
  insert into t_results (escenario, ok, detalle)
  values ('5b. Stock final = suma de movimientos (0 +10 -3 +1 -2 = 6)', v_stock = 6 and v_ledger = 6,
          format('stock=%s movimientos=%s', v_stock, v_ledger));
end;
$test$;

select n, case when ok then '✅' else '❌' end as resultado, escenario, detalle
from t_results order by n;

rollback;
