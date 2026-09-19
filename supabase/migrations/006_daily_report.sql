-- End-of-day report (paid add-on): sales, profit, orders, drinks / starters sold, best sellers.

-- Which report bucket each category counts toward.
alter table public.categories add column report_group text not null default 'main'
  check (report_group in ('starter', 'main', 'drink', 'dessert', 'other'));

-- Optional cost per dish so the report can show profit.
alter table public.menu_items add column cost_usd numeric(10,2) check (cost_usd is null or cost_usd >= 0);

-- Add-on switch, turned on by us when the restaurant pays for reports.
alter table public.restaurants add column reports_enabled boolean not null default false;

create or replace function public.daily_report(p_restaurant_id uuid, p_date date)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_staff(p_restaurant_id) then raise exception 'NOT_STAFF'; end if;
  if not (select reports_enabled from public.restaurants where id = p_restaurant_id) then raise exception 'REPORTS_DISABLED'; end if;

  with day_orders as (
    select o.* from public.orders o
    where o.restaurant_id = p_restaurant_id
      and o.status <> 'cancelled'
      and (o.created_at at time zone 'Asia/Phnom_Penh')::date = p_date
  ),
  lines as (
    select oi.name, oi.qty, oi.unit_price_usd, mi.cost_usd, coalesce(c.report_group, 'other') as grp, o.created_at
    from day_orders o
    join public.order_items oi on oi.order_id = o.id
    left join public.menu_items mi on mi.id = oi.menu_item_id
    left join public.categories c on c.id = mi.category_id
  ),
  by_dish as (
    select name, grp, sum(qty) as qty, sum(qty * unit_price_usd) as sales
    from lines group by name, grp
  ),
  yesterday as (
    select coalesce(sum(total_usd), 0) as sales, count(*) as orders
    from public.orders
    where restaurant_id = p_restaurant_id and status <> 'cancelled'
      and (created_at at time zone 'Asia/Phnom_Penh')::date = p_date - 1
  )
  select jsonb_build_object(
    'date', p_date,
    'orders', (select count(*) from day_orders),
    'sales', (select coalesce(sum(total_usd), 0) from day_orders),
    'collected', (select coalesce(sum(total_usd), 0) from day_orders where paid_at is not null),
    'profit', (select coalesce(sum(qty * (unit_price_usd - cost_usd)), 0) from lines where cost_usd is not null),
    'profit_coverage', (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where cost_usd is not null) / count(*)) end from lines),
    'items_sold', (select coalesce(sum(qty), 0) from lines),
    'groups', (select coalesce(jsonb_object_agg(grp, jsonb_build_object('qty', qty, 'sales', sales)), '{}'::jsonb)
               from (select grp, sum(qty) as qty, sum(qty * unit_price_usd) as sales from lines group by grp) g),
    'top_dish', (select jsonb_build_object('name', name, 'qty', qty) from by_dish where grp <> 'drink' order by qty desc, sales desc limit 1),
    'top_drink', (select jsonb_build_object('name', name, 'qty', qty) from by_dish where grp = 'drink' order by qty desc, sales desc limit 1),
    'top_items', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'qty', qty, 'sales', sales, 'group', grp) order by qty desc, sales desc), '[]'::jsonb)
                  from (select * from by_dish order by qty desc, sales desc limit 8) t),
    'by_hour', (select coalesce(jsonb_agg(jsonb_build_object('hour', h, 'orders', n, 'sales', s) order by h), '[]'::jsonb)
                from (select extract(hour from created_at at time zone 'Asia/Phnom_Penh')::int as h, count(*) as n, sum(total_usd) as s
                      from day_orders group by 1) hh),
    'yesterday', (select jsonb_build_object('sales', sales, 'orders', orders) from yesterday)
  ) into v_result;

  return v_result;
end $$;

revoke execute on function public.daily_report(uuid, date) from public, anon;
grant execute on function public.daily_report(uuid, date) to authenticated;
