-- eMenu schema: multi-restaurant QR menu with table ordering.
-- Customers are anonymous: they read the menu directly and write only through
-- the security-definer RPCs below, keyed by the table's secret QR token.
-- Staff (Supabase Auth users listed in restaurant_staff) manage everything else via RLS.

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null,
  tagline text,
  address text,
  phone text,
  hours text,
  khr_rate integer not null default 4100 check (khr_rate > 0),
  show_khr boolean not null default true,
  ordering_enabled boolean not null default true,
  accent_color text not null default '#c2410c',
  logo_url text,
  cover_url text,
  order_seq integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.restaurant_staff (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  primary key (restaurant_id, user_id)
);
create index restaurant_staff_user_idx on public.restaurant_staff(user_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index categories_restaurant_idx on public.categories(restaurant_id);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  description text,
  price_usd numeric(10,2) not null check (price_usd >= 0),
  image_url text,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  spicy_level smallint not null default 0 check (spicy_level between 0 and 3),
  tags text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index menu_items_restaurant_idx on public.menu_items(restaurant_id);
create index menu_items_category_idx on public.menu_items(category_id);

create table public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  label text not null,
  token text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 14),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index dining_tables_restaurant_idx on public.dining_tables(restaurant_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid references public.dining_tables(id) on delete set null,
  order_number integer not null,
  status text not null default 'new' check (status in ('new', 'preparing', 'served', 'cancelled')),
  note text,
  total_usd numeric(10,2) not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_restaurant_created_idx on public.orders(restaurant_id, created_at desc);
create index orders_table_idx on public.orders(table_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name text not null,
  unit_price_usd numeric(10,2) not null,
  qty integer not null check (qty between 1 and 50),
  note text
);
create index order_items_order_idx on public.order_items(order_id);
create index order_items_menu_item_idx on public.order_items(menu_item_id);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid references public.dining_tables(id) on delete cascade,
  kind text not null check (kind in ('waiter', 'bill')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index service_requests_restaurant_idx on public.service_requests(restaurant_id, created_at desc);
create index service_requests_table_idx on public.service_requests(table_id);

-- ---------------------------------------------------------------- helpers

create or replace function public.is_staff(p_restaurant_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.restaurant_staff
    where restaurant_id = p_restaurant_id and user_id = (select auth.uid())
  );
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger orders_touch before update on public.orders
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- RLS

alter table public.restaurants enable row level security;
alter table public.restaurant_staff enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.dining_tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.service_requests enable row level security;

-- Public menu data
create policy "menu is public" on public.restaurants for select using (true);
create policy "staff update restaurant" on public.restaurants for update to authenticated
  using ((select public.is_staff(id))) with check ((select public.is_staff(id)));

create policy "categories are public" on public.categories for select using (true);
create policy "staff insert categories" on public.categories for insert to authenticated
  with check ((select public.is_staff(restaurant_id)));
create policy "staff update categories" on public.categories for update to authenticated
  using ((select public.is_staff(restaurant_id))) with check ((select public.is_staff(restaurant_id)));
create policy "staff delete categories" on public.categories for delete to authenticated
  using ((select public.is_staff(restaurant_id)));

create policy "menu items are public" on public.menu_items for select using (true);
create policy "staff insert items" on public.menu_items for insert to authenticated
  with check ((select public.is_staff(restaurant_id)));
create policy "staff update items" on public.menu_items for update to authenticated
  using ((select public.is_staff(restaurant_id))) with check ((select public.is_staff(restaurant_id)));
create policy "staff delete items" on public.menu_items for delete to authenticated
  using ((select public.is_staff(restaurant_id)));

-- Staff-only data (table tokens are secrets: customers get them from the QR code)
create policy "see own memberships" on public.restaurant_staff for select to authenticated
  using (user_id = (select auth.uid()));

create policy "staff read tables" on public.dining_tables for select to authenticated
  using ((select public.is_staff(restaurant_id)));
create policy "staff insert tables" on public.dining_tables for insert to authenticated
  with check ((select public.is_staff(restaurant_id)));
create policy "staff update tables" on public.dining_tables for update to authenticated
  using ((select public.is_staff(restaurant_id))) with check ((select public.is_staff(restaurant_id)));
create policy "staff delete tables" on public.dining_tables for delete to authenticated
  using ((select public.is_staff(restaurant_id)));

create policy "staff read orders" on public.orders for select to authenticated
  using ((select public.is_staff(restaurant_id)));
create policy "staff update orders" on public.orders for update to authenticated
  using ((select public.is_staff(restaurant_id))) with check ((select public.is_staff(restaurant_id)));

create policy "staff read order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (select public.is_staff(o.restaurant_id))));

create policy "staff read requests" on public.service_requests for select to authenticated
  using ((select public.is_staff(restaurant_id)));
create policy "staff update requests" on public.service_requests for update to authenticated
  using ((select public.is_staff(restaurant_id))) with check ((select public.is_staff(restaurant_id)));

grant select on public.restaurants, public.categories, public.menu_items to anon, authenticated;
grant update on public.restaurants to authenticated;
grant insert, update, delete on public.categories, public.menu_items, public.dining_tables to authenticated;
grant select on public.restaurant_staff, public.dining_tables, public.orders, public.order_items, public.service_requests to authenticated;
grant update on public.orders, public.service_requests to authenticated;

-- ---------------------------------------------------------------- customer RPCs

-- Resolve a QR token to its table and restaurant.
create or replace function public.get_table(p_token text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('label', t.label, 'restaurant_slug', r.slug)
  from public.dining_tables t
  join public.restaurants r on r.id = t.restaurant_id
  where t.token = p_token and t.is_active;
$$;

-- Place an order. Prices come from the database, never from the client.
create or replace function public.place_order(p_token text, p_items jsonb, p_note text default null)
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

  -- Basic flood protection per table.
  if (select count(*) from public.orders
      where table_id = v_table.id and created_at > now() - interval '10 minutes') >= 15 then
    raise exception 'TOO_MANY_ORDERS';
  end if;

  update public.restaurants set order_seq = order_seq + 1
  where id = v_restaurant.id returning order_seq into v_number;

  insert into public.orders (restaurant_id, table_id, order_number, note)
  values (v_restaurant.id, v_table.id, v_number, left(nullif(btrim(p_note), ''), 500))
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

-- Everything this table has ordered and not yet paid for (the shared "table tab").
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
      'created_at', o.created_at,
      'items', (select coalesce(jsonb_agg(jsonb_build_object('name', oi.name, 'qty', oi.qty, 'unit_price_usd', oi.unit_price_usd, 'note', oi.note)), '[]'::jsonb)
                from public.order_items oi where oi.order_id = o.id)
    ) as o_json
  ) j
  where t.token = p_token and t.is_active
    and o.paid_at is null
    and o.created_at > now() - interval '12 hours';
$$;

-- "Call waiter" / "Ask for the bill". Deduplicated while a request is still open.
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

-- Items ordered most in the last 14 days, for the automatic "Popular" badge.
create or replace function public.popular_items(p_restaurant_id uuid)
returns table (menu_item_id uuid, qty bigint)
language sql stable security definer set search_path = ''
as $$
  select oi.menu_item_id, sum(oi.qty) as qty
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.restaurant_id = p_restaurant_id
    and o.status <> 'cancelled'
    and o.created_at > now() - interval '14 days'
    and oi.menu_item_id is not null
  group by oi.menu_item_id
  order by qty desc
  limit 5;
$$;

revoke execute on function public.get_table(text), public.place_order(text, jsonb, text),
  public.get_table_tab(text), public.call_staff(text, text), public.popular_items(uuid),
  public.is_staff(uuid) from public;
grant execute on function public.get_table(text), public.place_order(text, jsonb, text),
  public.get_table_tab(text), public.call_staff(text, text), public.popular_items(uuid)
  to anon, authenticated;
grant execute on function public.is_staff(uuid) to authenticated;

-- ---------------------------------------------------------------- realtime + storage

alter publication supabase_realtime add table public.orders, public.service_requests;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Files live under <restaurant_id>/..., writable only by that restaurant's staff.
create policy "staff upload menu images" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-images' and (select public.is_staff(((storage.foldername(name))[1])::uuid)));
create policy "staff update menu images" on storage.objects for update to authenticated
  using (bucket_id = 'menu-images' and (select public.is_staff(((storage.foldername(name))[1])::uuid)));
create policy "staff delete menu images" on storage.objects for delete to authenticated
  using (bucket_id = 'menu-images' and (select public.is_staff(((storage.foldername(name))[1])::uuid)));
