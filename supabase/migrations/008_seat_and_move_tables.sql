-- 008: staff can seat guests at a table (with party size) and move a party to another table.

alter table public.dining_tables
  add column seated_at timestamptz,
  add column party_size smallint check (party_size between 1 and 99);

-- Seating changes show up on every staff phone live (RLS still hides tables from diners).
alter publication supabase_realtime add table public.dining_tables;

-- Move everything the current party has (open orders, open requests, seating) to a free table,
-- in one transaction so two staff phones can't split a bill across both tables.
create or replace function public.move_table(p_from uuid, p_to uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_from public.dining_tables;
  v_to public.dining_tables;
  v_now timestamptz := now();
begin
  if p_from = p_to then raise exception 'SAME_TABLE'; end if;
  -- Lock both rows in a fixed order so two moves at once can't deadlock.
  perform 1 from public.dining_tables where id in (p_from, p_to) order by id for update;
  select * into v_from from public.dining_tables where id = p_from;
  select * into v_to from public.dining_tables where id = p_to;
  if v_from.id is null or v_to.id is null or v_from.restaurant_id <> v_to.restaurant_id then raise exception 'TABLE_NOT_FOUND'; end if;
  if not public.is_staff(v_from.restaurant_id) then raise exception 'NOT_STAFF'; end if;
  if v_to.seated_at is not null
     or exists (select 1 from public.orders where table_id = p_to and paid_at is null and status <> 'cancelled') then
    raise exception 'TABLE_BUSY';
  end if;

  -- Leftovers on the new table (cancelled, never paid) must not show on the moved party's bill.
  update public.orders set paid_at = v_now where table_id = p_to and paid_at is null;

  update public.orders set table_id = p_to
  where table_id = p_from and paid_at is null
    and (v_from.cleared_at is null or created_at > v_from.cleared_at);
  update public.service_requests set table_id = p_to where table_id = p_from and resolved_at is null;

  update public.dining_tables
  set seated_at = coalesce(v_from.seated_at, v_now), party_size = v_from.party_size, cleared_at = v_from.cleared_at
  where id = p_to;
  update public.dining_tables set seated_at = null, party_size = null, cleared_at = v_now where id = p_from;
end;
$$;

revoke execute on function public.move_table(uuid, uuid) from public, anon;
grant execute on function public.move_table(uuid, uuid) to authenticated;
