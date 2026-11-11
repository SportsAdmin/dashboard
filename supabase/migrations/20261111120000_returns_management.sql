-- =============================================================================
-- Returns management
--
-- * delete_return(p_return_id): cancels a return (admin / manager only).
--   Stock that the return had put back is taken out again, with a compensating
--   'return' movement (negative quantity) so the ledger keeps adding up.
--   Sellers can't delete returns (no direct DELETE grant + role check here).
-- * returns.created_by now references profiles, so the UI can show who
--   registered each return (PostgREST embed).
-- =============================================================================

alter table public.returns drop constraint if exists returns_created_by_fkey;
alter table public.returns
  add constraint returns_created_by_fkey foreign key (created_by) references public.profiles (id);

create or replace function public.delete_return(p_return_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff record;
  v_return record;
  v_line record;
begin
  select * into v_staff from public._require_staff(array['admin', 'manager']);

  select id, club_id into v_return from returns where id = p_return_id for update;
  if not found then
    raise exception 'Devolución inexistente' using errcode = 'P0002';
  end if;
  perform public._resolve_club(v_staff.role, v_staff.club_id, v_return.club_id);

  -- Units that went back to stock must still be there to take them out again
  for v_line in
    select ri.variant_id, sum(ri.quantity) as qty, ii.id as inventory_item_id, ii.stock,
           p.name || coalesce(' ' || s.name, '') || coalesce(' ' || pv.color, '') as label
    from return_items ri
    join inventory_items ii on ii.variant_id = ri.variant_id and ii.club_id = v_return.club_id
    join product_variants pv on pv.id = ri.variant_id
    join products p on p.id = pv.product_id
    left join sizes s on s.id = pv.size_id
    where ri.return_id = p_return_id and ri.restocked
    group by ri.variant_id, ii.id, ii.stock, p.name, s.name, pv.color
  loop
    perform 1 from inventory_items where id = v_line.inventory_item_id for update;
    if (select stock from inventory_items where id = v_line.inventory_item_id) < v_line.qty then
      raise exception 'No se puede anular: "%" ya no tiene stock suficiente (disponible %, a descontar %)',
        v_line.label, v_line.stock, v_line.qty using errcode = 'P0001';
    end if;

    update inventory_items set stock = stock - v_line.qty where id = v_line.inventory_item_id;

    insert into stock_movements (club_id, variant_id, inventory_item_id, type, quantity, reference_id, user_id)
    values (v_return.club_id, v_line.variant_id, v_line.inventory_item_id, 'return', -v_line.qty,
            p_return_id, v_staff.user_id);
  end loop;

  delete from return_items where return_id = p_return_id;
  delete from returns where id = p_return_id;
end;
$$;

revoke execute on function public.delete_return(uuid) from public, anon;
grant execute on function public.delete_return(uuid) to authenticated;
