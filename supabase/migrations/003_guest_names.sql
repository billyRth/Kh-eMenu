-- Who at the table placed each order, so the bill can be split per person.
alter table public.orders add column guest_name text check (char_length(guest_name) <= 40);

drop function public.place_order(text, jsonb, text);

create function public.place_order(p_token text, p_items jsonb, p_note text default null, p_guest text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_table public.dining_tables%rowtype;
  v_restaurant public.restaurants%rowtype;
  v_item public.menu_items%rowtype;
  v_line jsonb;
  v_qty integer;
  v_order_id uuid;
  v_number integer;
  v_total numeric(10,2) := 0;
begin
  select * into v_table from public.dining_tables where token = p_token and is_active;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;

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

    insert into public.order_items (order_id, menu_item_id, name, unit_price_usd, qty, note)
    values (v_order_id, v_item.id, v_item.name, v_item.price_usd, v_qty, left(nullif(btrim(v_line->>'note'), ''), 200));

    v_total := v_total + v_item.price_usd * v_qty;
  end loop;

  update public.orders set total_usd = v_total where id = v_order_id;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_number, 'total_usd', v_total);
end $$;

create or replace function public.get_table_tab(p_token text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(o_json order by o.created_at desc), '[]'::jsonb)
  from public.dining_tables t
  join public.orders o on o.table_id = t.id
  cross join lateral (
    select jsonb_build_object(
      'id', o.id,
      'order_number', o.order_number,
      'status', o.status,
      'total_usd', o.total_usd,
      'guest_name', o.guest_name,
      'created_at', o.created_at,
      'items', (select coalesce(jsonb_agg(jsonb_build_object('name', oi.name, 'qty', oi.qty, 'unit_price_usd', oi.unit_price_usd, 'note', oi.note)), '[]'::jsonb)
                from public.order_items oi where oi.order_id = o.id)
    ) as o_json
  ) j
  where t.token = p_token and t.is_active
    and o.paid_at is null
    and o.created_at > now() - interval '12 hours';
$$;

revoke execute on function public.place_order(text, jsonb, text, text) from public;
grant execute on function public.place_order(text, jsonb, text, text) to anon, authenticated;
