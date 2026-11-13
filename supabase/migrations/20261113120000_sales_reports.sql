-- =============================================================================
-- Sales reports: daily cash and period summary (week / month / year)
--
-- All filtering, aggregation and pagination happens here, so changing a filter
-- or a page runs a new query instead of hiding rows in the browser.
--
-- Dates are LOCAL (Argentina) calendar days: created_at is stored as UTC
-- (timestamp without time zone, server TZ = UTC), so a local day D covers
-- [D 00:00 ART, D+1 00:00 ART) = [D 03:00 UTC, D+1 03:00 UTC).
--
-- SECURITY INVOKER: RLS decides what each user sees (manager: own club,
-- admin: every club or the one passed in p_club_id). Only admin / manager may
-- call them.
-- =============================================================================

-- Local [from, to] dates -> UTC bounds [from_utc, to_utc)
create or replace function public._local_day_bounds(p_from date, p_to date,
                                                    out from_utc timestamp, out to_utc timestamp)
language sql
immutable
as $$
  select (p_from::timestamp at time zone 'America/Argentina/Buenos_Aires') at time zone 'UTC',
         ((p_to + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires') at time zone 'UTC'
$$;

-- UTC timestamp (as stored) -> local wall-clock timestamp
create or replace function public._to_local(p_ts timestamp)
returns timestamp
language sql
immutable
as $$ select (p_ts at time zone 'UTC') at time zone 'America/Argentina/Buenos_Aires' $$;

create or replace function public._require_report_role()
returns void
language plpgsql
stable
as $$
begin
  if coalesce(public.get_current_user_role(), '') not in ('admin', 'manager') then
    raise exception 'Solo admin y manager pueden ver los reportes de ventas' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public._local_day_bounds(date, date) from public, anon;
revoke execute on function public._to_local(timestamp) from public, anon;
revoke execute on function public._require_report_role() from public, anon;
grant execute on function public._local_day_bounds(date, date) to authenticated;
grant execute on function public._to_local(timestamp) to authenticated;
grant execute on function public._require_report_role() to authenticated;

-- -----------------------------------------------------------------------------
-- Summary for a date range: totals, payment methods, time series, top
-- products, sellers and returns. Series bucket: day (<= 62 days) or month.
-- -----------------------------------------------------------------------------
create or replace function public.sales_summary(p_from date, p_to date, p_club_id uuid default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  b record;
  v_bucket text;
  v_result jsonb;
begin
  perform public._require_report_role();
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Rango de fechas inválido' using errcode = '22023';
  end if;
  if p_to - p_from > 366 then
    raise exception 'El rango máximo es de un año' using errcode = '22023';
  end if;

  select * into b from public._local_day_bounds(p_from, p_to);
  v_bucket := case when p_to - p_from > 62 then 'month' else 'day' end;

  with s as (
    select * from sales
    where created_at >= b.from_utc and created_at < b.to_utc
      and (p_club_id is null or club_id = p_club_id)
  ),
  r as (
    select * from returns
    where created_at >= b.from_utc and created_at < b.to_utc
      and (p_club_id is null or club_id = p_club_id)
  ),
  buckets as (
    select g::date as bucket
    from generate_series(date_trunc(v_bucket, p_from::timestamp), p_to::timestamp,
                         case when v_bucket = 'month' then interval '1 month' else interval '1 day' end) g
  )
  select jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'bucket', v_bucket,
    'totals', (
      select jsonb_build_object(
        'sales', count(*),
        'amount', coalesce(sum(total), 0),
        'avg_ticket', coalesce(round(avg(total), 2), 0),
        'units', coalesce((select sum(si.quantity) from sale_items si join s on s.id = si.sale_id), 0))
      from s),
    'by_method', (
      select coalesce(jsonb_agg(x order by x.amount desc), '[]'::jsonb)
      from (select p.method, count(distinct p.sale_id) as sales, sum(p.amount) as amount
            from payments p join s on s.id = p.sale_id
            group by p.method) x),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object('bucket', bk.bucket, 'sales', coalesce(t.sales, 0),
                                                   'amount', coalesce(t.amount, 0)) order by bk.bucket), '[]'::jsonb)
      from buckets bk
      left join (select date_trunc(v_bucket, public._to_local(created_at))::date as bucket,
                        count(*) as sales, sum(total) as amount
                 from s group by 1) t on t.bucket = bk.bucket),
    'top_products', (
      select coalesce(jsonb_agg(x order by x.units desc, x.amount desc), '[]'::jsonb)
      from (select p.name as product, sz.name as size, pv.color,
                   sum(si.quantity) as units, sum(si.quantity * si.price) as amount
            from sale_items si
            join s on s.id = si.sale_id
            join product_variants pv on pv.id = si.variant_id
            join products p on p.id = pv.product_id
            left join sizes sz on sz.id = pv.size_id
            group by p.name, sz.name, pv.color
            order by sum(si.quantity) desc, sum(si.quantity * si.price) desc
            limit 10) x),
    'by_seller', (
      select coalesce(jsonb_agg(x order by x.amount desc), '[]'::jsonb)
      from (select s.seller_id, coalesce(pr.name, 'Sin vendedor') as seller,
                   count(*) as sales, sum(s.total) as amount
            from s left join profiles pr on pr.id = s.seller_id
            group by s.seller_id, pr.name) x),
    'returns', (
      select jsonb_build_object(
        'count', count(distinct r.id),
        'units', coalesce(sum(ri.quantity), 0),
        'restocked_units', coalesce(sum(ri.quantity) filter (where ri.restocked), 0),
        'amount', coalesce(sum(ri.quantity * (select max(si.price) from sale_items si
                                              where si.sale_id = r.sale_id and si.variant_id = ri.variant_id)), 0))
      from r left join return_items ri on ri.return_id = r.id)
  ) into v_result;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- Paginated list of sales in a date range (newest first)
-- -----------------------------------------------------------------------------
create or replace function public.sales_list(p_from date, p_to date, p_club_id uuid default null,
                                             p_page integer default 1, p_page_size integer default 20)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  b record;
  v_size integer := least(greatest(coalesce(p_page_size, 20), 5), 100);
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_total integer;
  v_rows jsonb;
begin
  perform public._require_report_role();
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Rango de fechas inválido' using errcode = '22023';
  end if;
  if p_to - p_from > 366 then
    raise exception 'El rango máximo es de un año' using errcode = '22023';
  end if;

  select * into b from public._local_day_bounds(p_from, p_to);

  select count(*) into v_total
  from sales
  where created_at >= b.from_utc and created_at < b.to_utc
    and (p_club_id is null or club_id = p_club_id);

  select coalesce(jsonb_agg(row_data order by created_at desc, id), '[]'::jsonb) into v_rows
  from (
    select s.id, s.created_at,
           jsonb_build_object(
             'id', s.id,
             'number', upper(left(replace(s.id::text, '-', ''), 8)),
             'created_at', s.created_at at time zone 'UTC',
             'total', s.total,
             'club', c.name,
             'seller', pr.name,
             'customer', cu.name,
             'items', (select coalesce(jsonb_agg(jsonb_build_object(
                          'product', p.name, 'size', sz.name, 'color', pv.color,
                          'quantity', si.quantity, 'price', si.price) order by p.name), '[]'::jsonb)
                       from sale_items si
                       join product_variants pv on pv.id = si.variant_id
                       join products p on p.id = pv.product_id
                       left join sizes sz on sz.id = pv.size_id
                       where si.sale_id = s.id),
             'payments', (select coalesce(jsonb_agg(jsonb_build_object('method', pa.method, 'amount', pa.amount)
                                                    order by pa.amount desc), '[]'::jsonb)
                          from payments pa where pa.sale_id = s.id),
             'returned_units', (select coalesce(sum(ri.quantity), 0)
                                from returns rt join return_items ri on ri.return_id = rt.id
                                where rt.sale_id = s.id)
           ) as row_data
    from sales s
    left join clubs c on c.id = s.club_id
    left join profiles pr on pr.id = s.seller_id
    left join customers cu on cu.id = s.customer_id
    where s.created_at >= b.from_utc and s.created_at < b.to_utc
      and (p_club_id is null or s.club_id = p_club_id)
    order by s.created_at desc, s.id
    limit v_size offset (v_page - 1) * v_size
  ) x;

  return jsonb_build_object(
    'total_count', v_total,
    'page', v_page,
    'page_size', v_size,
    'page_count', greatest(ceil(v_total::numeric / v_size)::int, 1),
    'rows', v_rows
  );
end;
$$;

revoke execute on function public.sales_summary(date, date, uuid) from public, anon;
revoke execute on function public.sales_list(date, date, uuid, integer, integer) from public, anon;
grant execute on function public.sales_summary(date, date, uuid) to authenticated;
grant execute on function public.sales_list(date, date, uuid, integer, integer) to authenticated;
