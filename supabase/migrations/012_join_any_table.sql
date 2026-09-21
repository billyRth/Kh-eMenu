-- 012: combine any two tables (free or busy). The joining table's open bill and calls move onto the
-- main table, its own guest count stays on it (so the guest total isn't counted twice), and a free
-- main table becomes taken. Unavailable tables are still refused by the table_unavailable check.
create or replace function public.join_table(p_table uuid, p_into uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_table public.dining_tables;
  v_into public.dining_tables;
  v_now timestamptz := now();
begin
  select * into v_into from public.dining_tables where id = p_into;
  if v_into.joined_to is not null then p_into := v_into.joined_to; end if;
  if p_table = p_into then raise exception 'SAME_TABLE'; end if;
  -- Lock both rows in a fixed order so two combines at once can't deadlock.
  perform 1 from public.dining_tables where id in (p_table, p_into) order by id for update;
  select * into v_table from public.dining_tables where id = p_table;
  select * into v_into from public.dining_tables where id = p_into;
  if v_table.id is null or v_into.id is null or v_table.restaurant_id <> v_into.restaurant_id then raise exception 'TABLE_NOT_FOUND'; end if;
  if not public.is_staff(v_table.restaurant_id) then raise exception 'NOT_STAFF'; end if;

  -- The main table's bill view must show the joining table's orders but not its own previous parties'.
  update public.orders set paid_at = v_now
  where table_id = p_into and paid_at is null and v_into.cleared_at is not null and created_at <= v_into.cleared_at;

  update public.orders set table_id = p_into
  where table_id = p_table and paid_at is null
    and (v_table.cleared_at is null or created_at > v_table.cleared_at);
  update public.service_requests set table_id = p_into where table_id = p_table and resolved_at is null;
  update public.dining_tables set joined_to = p_into where joined_to = p_table;

  update public.dining_tables set joined_to = p_into, seated_at = coalesce(seated_at, v_now) where id = p_table;
  update public.dining_tables
  set seated_at = coalesce(seated_at, v_now),
      cleared_at = case when v_into.cleared_at is null or v_table.cleared_at is null then null
                        else least(v_into.cleared_at, v_table.cleared_at) end
  where id = p_into;
end;
$$;
