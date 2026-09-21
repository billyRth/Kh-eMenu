-- 009: combine tables. A free table can join a busy one (guests push tables together):
-- orders, waiter calls and the bill view from the joined table's QR all go to the main table.

alter table public.dining_tables add column joined_to uuid references public.dining_tables(id) on delete set null;

-- Staff: join a free table to another table's party. Always joins to the main table, one level deep.
create or replace function public.join_table(p_table uuid, p_into uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_table public.dining_tables;
  v_into public.dining_tables;
begin
  perform 1 from public.dining_tables where id in (p_table, p_into) order by id for update;
  select * into v_table from public.dining_tables where id = p_table;
  select * into v_into from public.dining_tables where id = p_into;
  if v_table.id is null or v_into.id is null or v_table.restaurant_id <> v_into.restaurant_id then raise exception 'TABLE_NOT_FOUND'; end if;
  if not public.is_staff(v_table.restaurant_id) then raise exception 'NOT_STAFF'; end if;
  if v_into.joined_to is not null then p_into := v_into.joined_to; end if;
  if p_table = p_into then raise exception 'SAME_TABLE'; end if;
  if v_table.seated_at is not null or v_table.joined_to is not null
     or exists (select 1 from public.dining_tables where joined_to = p_table)
     or exists (select 1 from public.orders where table_id = p_table and paid_at is null and status <> 'cancelled') then
    raise exception 'TABLE_BUSY';
  end if;
  update public.dining_tables set joined_to = p_into, seated_at = now(), party_size = null where id = p_table;
end;
$$;

revoke execute on function public.join_table(uuid, uuid) from public, anon;
grant execute on function public.join_table(uuid, uuid) to authenticated;

-- Moving a party also brings its joined tables along; a joined table itself can't be moved or be a target.
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
  if v_from.joined_to is not null then raise exception 'TABLE_JOINED'; end if;
  if v_to.seated_at is not null or v_to.joined_to is not null
     or exists (select 1 from public.dining_tables where joined_to = p_to)
     or exists (select 1 from public.orders where table_id = p_to and paid_at is null and status <> 'cancelled') then
    raise exception 'TABLE_BUSY';
  end if;

  -- Leftovers on the new table (cancelled, never paid) must not show on the moved party's bill.
  update public.orders set paid_at = v_now where table_id = p_to and paid_at is null;

  update public.orders set table_id = p_to
  where table_id = p_from and paid_at is null
    and (v_from.cleared_at is null or created_at > v_from.cleared_at);
  update public.service_requests set table_id = p_to where table_id = p_from and resolved_at is null;
  update public.dining_tables set joined_to = p_to where joined_to = p_from;

  update public.dining_tables
  set seated_at = coalesce(v_from.seated_at, v_now), party_size = v_from.party_size, cleared_at = v_from.cleared_at
  where id = p_to;
  update public.dining_tables set seated_at = null, party_size = null, cleared_at = v_now where id = p_from;
end;
$$;

-- place_order: unchanged except that a joined table orders onto its main table.
create or replace function public.place_order(p_token text, p_items jsonb, p_note text default null, p_guest text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_table public.dining_tables%rowtype;
  v_restaurant public.restaurants%rowtype;
  v_item public.menu_items%rowtype;
  v_line jsonb;
  v_group jsonb;
  v_selected jsonb;
  v_snapshot jsonb;
  v_group_snapshot jsonb;
  v_group_delta numeric(10,2);
  v_delta numeric(10,2);
  v_count integer;
  v_qty integer;
  v_order_id uuid;
  v_number integer;
  v_total numeric(10,2) := 0;
begin
  select * into v_table from public.dining_tables where token = p_token and is_active;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  if v_table.joined_to is not null then
    select * into v_table from public.dining_tables where id = v_table.joined_to;
  end if;

  select * into v_restaurant from public.restaurants where id = v_table.restaurant_id;
  if not v_restaurant.ordering_enabled then raise exception 'ORDERING_DISABLED'; end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'INVALID_ITEMS';
  end if;

  if (select count(*) from public.orders
      where table_id = v_table.id and created_at > now() - interval '10 minutes') >= 15 then
    raise exception 'TOO_MANY_ORDERS';
  end if;

  update public.restaurants set order_seq = order_seq + 1
  where id = v_restaurant.id returning order_seq into v_number;

  insert into public.orders (restaurant_id, table_id, order_number, note, guest_name)
  values (v_restaurant.id, v_table.id, v_number, left(nullif(btrim(p_note), ''), 500), left(nullif(btrim(p_guest), ''), 40))
  returning id into v_order_id;

  for v_line in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_line->>'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 50 then raise exception 'INVALID_QTY'; end if;

    select * into v_item from public.menu_items
    where id = (v_line->>'item_id')::uuid and restaurant_id = v_restaurant.id;
    if not found then raise exception 'ITEM_NOT_FOUND'; end if;
    if not v_item.is_available then raise exception 'ITEM_SOLD_OUT:%', v_item.name; end if;

    -- Options: validate every picked choice id against the item's own groups; prices come from the DB.
    v_selected := coalesce(v_line->'options', '[]'::jsonb);
    if jsonb_typeof(v_selected) <> 'array' then raise exception 'OPTION_INVALID'; end if;
    v_snapshot := '[]'::jsonb;
    v_delta := 0;
    for v_group in select value from jsonb_array_elements(v_item.options) loop
      select count(*), coalesce(sum((c->>'price')::numeric), 0),
             coalesce(jsonb_agg(jsonb_build_object('group', v_group->>'name', 'choice', c->>'name', 'price', (c->>'price')::numeric)), '[]'::jsonb)
        into v_count, v_group_delta, v_group_snapshot
      from jsonb_array_elements(v_group->'choices') c
      where (c->>'id') in (select jsonb_array_elements_text(v_selected));
      if coalesce((v_group->>'required')::boolean, false) and v_count = 0 then
        raise exception 'OPTION_REQUIRED:%', v_group->>'name';
      end if;
      if not coalesce((v_group->>'multi')::boolean, false) and v_count > 1 then raise exception 'OPTION_INVALID'; end if;
      v_delta := v_delta + v_group_delta;
      v_snapshot := v_snapshot || v_group_snapshot;
    end loop;
    if jsonb_array_length(v_selected) <> jsonb_array_length(v_snapshot) then raise exception 'OPTION_INVALID'; end if;

    insert into public.order_items (order_id, menu_item_id, name, unit_price_usd, qty, note, options)
    values (v_order_id, v_item.id, v_item.name, v_item.price_usd + v_delta, v_qty,
            left(nullif(btrim(v_line->>'note'), ''), 200), v_snapshot);

    v_total := v_total + (v_item.price_usd + v_delta) * v_qty;
  end loop;

  update public.orders set total_usd = v_total where id = v_order_id;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_number, 'total_usd', v_total);
end $$;

-- The bill view: a joined table shows its main table's bill.
create or replace function public.get_table_tab(p_token text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(o_json order by o.created_at desc), '[]'::jsonb)
  from public.dining_tables s
  join public.dining_tables t on t.id = coalesce(s.joined_to, s.id)
  join public.orders o on o.table_id = t.id
  cross join lateral (
    select jsonb_build_object(
      'id', o.id,
      'order_number', o.order_number,
      'status', o.status,
      'total_usd', o.total_usd,
      'guest_name', o.guest_name,
      'created_at', o.created_at,
      'items', (select coalesce(jsonb_agg(jsonb_build_object('name', oi.name, 'qty', oi.qty, 'unit_price_usd', oi.unit_price_usd, 'note', oi.note, 'options', oi.options)), '[]'::jsonb)
                from public.order_items oi where oi.order_id = o.id)
    ) as o_json
  ) j
  where s.token = p_token and s.is_active
    and o.paid_at is null
    and (t.cleared_at is null or o.created_at > t.cleared_at)
    and o.created_at > now() - interval '12 hours';
$$;

-- "Call waiter" / "Ask for the bill" from a joined table goes to the main table.
create or replace function public.call_staff(p_token text, p_kind text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_table public.dining_tables%rowtype;
begin
  if p_kind not in ('waiter', 'bill') then raise exception 'INVALID_KIND'; end if;
  select * into v_table from public.dining_tables where token = p_token and is_active;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  if v_table.joined_to is not null then
    select * into v_table from public.dining_tables where id = v_table.joined_to;
  end if;

  if not exists (
    select 1 from public.service_requests
    where table_id = v_table.id and kind = p_kind and resolved_at is null
      and created_at > now() - interval '2 hours'
  ) then
    insert into public.service_requests (restaurant_id, table_id, kind)
    values (v_table.restaurant_id, v_table.id, p_kind);
  end if;
  return jsonb_build_object('ok', true);
end $$;
