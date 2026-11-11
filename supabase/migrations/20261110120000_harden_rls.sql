-- =============================================================================
-- Harden Row Level Security
--
-- 1. Enable RLS (with role/club scoped policies) on every exposed table.
-- 2. Make views respect the caller's RLS (security_invoker).
-- 3. Drop legacy policies that bypassed role checks (permissive policies are OR'ed).
-- 4. Block profile privilege escalation (users editing their own role/club_id).
-- 5. Remove anonymous (not logged in) access to tables and privileged RPCs.
--
-- Roles: admin (global), manager / seller (scoped to profiles.club_id).
-- Helpers used: public.get_current_user_role(), public.get_current_user_club_id()
-- (both SECURITY DEFINER, so they do not recurse into profiles RLS).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Helpers: pin search_path on SECURITY DEFINER functions
-- -----------------------------------------------------------------------------
alter function public.get_my_profile() set search_path = public;
alter function public.create_product(text, text, text, jsonb) set search_path = public;
alter function public.create_inventory_for_variant() set search_path = public;

-- -----------------------------------------------------------------------------
-- 1. Anonymous users get nothing from the public schema
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

revoke execute on function public.create_product(text, text, text, jsonb) from public, anon;
revoke execute on function public.create_purchase_order from public, anon;
revoke execute on function public.create_sale(uuid, uuid, uuid, jsonb, jsonb) from public, anon;
revoke execute on function public.create_return(uuid, uuid, uuid, integer, text) from public, anon;
grant execute on function public.create_product(text, text, text, jsonb) to authenticated;
grant execute on function public.create_purchase_order to authenticated;
grant execute on function public.create_sale(uuid, uuid, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.create_return(uuid, uuid, uuid, integer, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Views: evaluate RLS as the querying user, not the view owner
-- -----------------------------------------------------------------------------
alter view public.daily_sales set (security_invoker = true);
alter view public.club_customers set (security_invoker = true);
alter view public.inventory_view set (security_invoker = true);

-- -----------------------------------------------------------------------------
-- 3. Drop legacy / duplicated policies
-- -----------------------------------------------------------------------------
drop policy if exists "Users see inventory of their club" on public.inventory_items;
drop policy if exists "read inventory_items" on public.inventory_items;

drop policy if exists "Users can view their club products" on public.products;
drop policy if exists "Super admin can see all products" on public.products;
drop policy if exists "Users can insert products" on public.products;

drop policy if exists "read purchase_order_items" on public.purchase_order_items;
drop policy if exists "read purchase_orders" on public.purchase_orders;

drop policy if exists "Users create sales for their club" on public.sales;
drop policy if exists "Users see their club sales" on public.sales;

-- -----------------------------------------------------------------------------
-- 4. Profiles: no self-promotion
--    Profiles are created/updated with role & club by edge functions (service role).
--    Logged-in users may only change their own name.
-- -----------------------------------------------------------------------------
drop policy if exists profiles_insert_policy on public.profiles;
revoke insert, update, delete on public.profiles from authenticated;
grant update (name, updated_at) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- 5. RLS on previously unprotected tables
-- -----------------------------------------------------------------------------

-- clubs ----------------------------------------------------------------------
alter table public.clubs enable row level security;

create policy "clubs select" on public.clubs for select to authenticated
  using (public.get_current_user_role() = 'admin' or id = public.get_current_user_club_id());
create policy "clubs insert" on public.clubs for insert to authenticated
  with check (public.get_current_user_role() = 'admin');
create policy "clubs update" on public.clubs for update to authenticated
  using (public.get_current_user_role() = 'admin')
  with check (public.get_current_user_role() = 'admin');
create policy "clubs delete" on public.clubs for delete to authenticated
  using (public.get_current_user_role() = 'admin');

-- sizes (shared catalogue) -----------------------------------------------------
alter table public.sizes enable row level security;

create policy "sizes select" on public.sizes for select to authenticated
  using (true);
create policy "sizes write" on public.sizes for all to authenticated
  using (public.get_current_user_role() = 'admin')
  with check (public.get_current_user_role() = 'admin');

-- product_variants (scoped through products.club_id) ---------------------------
alter table public.product_variants enable row level security;

create policy "variants select" on public.product_variants for select to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_variants.product_id
      and (public.get_current_user_role() = 'admin' or p.club_id = public.get_current_user_club_id())
  ));
create policy "variants insert" on public.product_variants for insert to authenticated
  with check (exists (
    select 1 from public.products p
    where p.id = product_variants.product_id
      and (public.get_current_user_role() = 'admin'
           or (public.get_current_user_role() = 'manager' and p.club_id = public.get_current_user_club_id()))
  ));
create policy "variants update" on public.product_variants for update to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_variants.product_id
      and (public.get_current_user_role() = 'admin'
           or (public.get_current_user_role() = 'manager' and p.club_id = public.get_current_user_club_id()))
  ))
  with check (exists (
    select 1 from public.products p
    where p.id = product_variants.product_id
      and (public.get_current_user_role() = 'admin'
           or (public.get_current_user_role() = 'manager' and p.club_id = public.get_current_user_club_id()))
  ));
create policy "variants delete" on public.product_variants for delete to authenticated
  using (public.get_current_user_role() = 'admin');

-- customer_clubs -------------------------------------------------------------
alter table public.customer_clubs enable row level security;

create policy "customer_clubs select" on public.customer_clubs for select to authenticated
  using (public.get_current_user_role() = 'admin' or club_id = public.get_current_user_club_id());
create policy "customer_clubs insert" on public.customer_clubs for insert to authenticated
  with check (public.get_current_user_role() = 'admin'
              or (public.get_current_user_role() in ('manager', 'seller')
                  and club_id = public.get_current_user_club_id()));
create policy "customer_clubs delete" on public.customer_clubs for delete to authenticated
  using (public.get_current_user_role() = 'admin'
         or (public.get_current_user_role() = 'manager' and club_id = public.get_current_user_club_id()));

-- customers (scoped through customer_clubs) ------------------------------------
alter table public.customers enable row level security;

create policy "customers select" on public.customers for select to authenticated
  using (public.get_current_user_role() = 'admin' or exists (
    select 1 from public.customer_clubs cc
    where cc.customer_id = customers.id and cc.club_id = public.get_current_user_club_id()
  ));
create policy "customers insert" on public.customers for insert to authenticated
  with check (public.get_current_user_role() in ('admin', 'manager', 'seller'));
create policy "customers update" on public.customers for update to authenticated
  using (public.get_current_user_role() = 'admin' or exists (
    select 1 from public.customer_clubs cc
    where cc.customer_id = customers.id and cc.club_id = public.get_current_user_club_id()
      and public.get_current_user_role() in ('manager', 'seller')
  ));
create policy "customers delete" on public.customers for delete to authenticated
  using (public.get_current_user_role() = 'admin');

-- cash_registers ---------------------------------------------------------------
alter table public.cash_registers enable row level security;

create policy "cash_registers select" on public.cash_registers for select to authenticated
  using (public.get_current_user_role() = 'admin' or club_id = public.get_current_user_club_id());
create policy "cash_registers insert" on public.cash_registers for insert to authenticated
  with check (public.get_current_user_role() = 'admin'
              or (public.get_current_user_role() in ('manager', 'seller')
                  and club_id = public.get_current_user_club_id()));
create policy "cash_registers update" on public.cash_registers for update to authenticated
  using (public.get_current_user_role() = 'admin'
         or (public.get_current_user_role() in ('manager', 'seller')
             and club_id = public.get_current_user_club_id()))
  with check (public.get_current_user_role() = 'admin'
              or (public.get_current_user_role() in ('manager', 'seller')
                  and club_id = public.get_current_user_club_id()));
create policy "cash_registers delete" on public.cash_registers for delete to authenticated
  using (public.get_current_user_role() = 'admin');

-- cash_movements (append-only for staff) ---------------------------------------
alter table public.cash_movements enable row level security;

create policy "cash_movements select" on public.cash_movements for select to authenticated
  using (public.get_current_user_role() = 'admin' or club_id = public.get_current_user_club_id());
create policy "cash_movements insert" on public.cash_movements for insert to authenticated
  with check (public.get_current_user_role() = 'admin'
              or (public.get_current_user_role() in ('manager', 'seller')
                  and club_id = public.get_current_user_club_id()));
create policy "cash_movements admin modify" on public.cash_movements for update to authenticated
  using (public.get_current_user_role() = 'admin')
  with check (public.get_current_user_role() = 'admin');
create policy "cash_movements admin delete" on public.cash_movements for delete to authenticated
  using (public.get_current_user_role() = 'admin');

-- payments (append-only for staff; written by create_sale) ---------------------
alter table public.payments enable row level security;

create policy "payments select" on public.payments for select to authenticated
  using (public.get_current_user_role() = 'admin' or club_id = public.get_current_user_club_id());
create policy "payments insert" on public.payments for insert to authenticated
  with check (public.get_current_user_role() = 'admin'
              or (public.get_current_user_role() in ('manager', 'seller')
                  and club_id = public.get_current_user_club_id()));
create policy "payments admin modify" on public.payments for update to authenticated
  using (public.get_current_user_role() = 'admin')
  with check (public.get_current_user_role() = 'admin');
create policy "payments admin delete" on public.payments for delete to authenticated
  using (public.get_current_user_role() = 'admin');

-- returns (written by create_return) -------------------------------------------
alter table public.returns enable row level security;

create policy "returns select" on public.returns for select to authenticated
  using (public.get_current_user_role() = 'admin' or club_id = public.get_current_user_club_id());
create policy "returns insert" on public.returns for insert to authenticated
  with check (public.get_current_user_role() = 'admin'
              or (public.get_current_user_role() in ('manager', 'seller')
                  and club_id = public.get_current_user_club_id()));
create policy "returns admin modify" on public.returns for update to authenticated
  using (public.get_current_user_role() = 'admin')
  with check (public.get_current_user_role() = 'admin');
create policy "returns admin delete" on public.returns for delete to authenticated
  using (public.get_current_user_role() = 'admin');

-- return_items (scoped through returns.club_id) --------------------------------
alter table public.return_items enable row level security;

create policy "return_items select" on public.return_items for select to authenticated
  using (exists (
    select 1 from public.returns r
    where r.id = return_items.return_id
      and (public.get_current_user_role() = 'admin' or r.club_id = public.get_current_user_club_id())
  ));
create policy "return_items insert" on public.return_items for insert to authenticated
  with check (exists (
    select 1 from public.returns r
    where r.id = return_items.return_id
      and (public.get_current_user_role() = 'admin'
           or (public.get_current_user_role() in ('manager', 'seller')
               and r.club_id = public.get_current_user_club_id()))
  ));
create policy "return_items admin modify" on public.return_items for update to authenticated
  using (public.get_current_user_role() = 'admin')
  with check (public.get_current_user_role() = 'admin');
create policy "return_items admin delete" on public.return_items for delete to authenticated
  using (public.get_current_user_role() = 'admin');

-- v_club_id: empty, unused by the app -> locked down (RLS on, no policies) ------
alter table public.v_club_id enable row level security;
