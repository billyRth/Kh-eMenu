-- Push notifications to staff devices (installed staff app / browser).
-- New orders and service requests fire the notify-staff edge function via pg_net.
-- The VAPID key pair lives in private.settings (key 'vapid_keys'), inserted outside
-- migrations so it never lands in git.

create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_restaurant_idx on public.push_subscriptions(restaurant_id);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;

create policy "see own devices" on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "remove own devices" on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));
grant select, delete on public.push_subscriptions to authenticated;

-- Register (or move) a device. Upsert by endpoint so re-subscribing never duplicates.
create or replace function public.save_push_subscription(p_restaurant_id uuid, p_endpoint text, p_p256dh text, p_auth text, p_device text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_staff(p_restaurant_id) then raise exception 'NOT_STAFF'; end if;
  insert into public.push_subscriptions (restaurant_id, user_id, endpoint, p256dh, auth, device)
  values (p_restaurant_id, (select auth.uid()), p_endpoint, p_p256dh, p_auth, left(p_device, 120))
  on conflict (endpoint) do update
    set restaurant_id = excluded.restaurant_id, user_id = excluded.user_id,
        p256dh = excluded.p256dh, auth = excluded.auth, device = excluded.device;
end $$;
revoke execute on function public.save_push_subscription(uuid, text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(uuid, text, text, text, text) to authenticated;

-- Each order/request is announced once, even if the function is called twice.
alter table public.orders add column notified_at timestamptz;
alter table public.service_requests add column notified_at timestamptz;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.settings (key text primary key, value text not null);

-- Only the edge function (service_role) can read the push config.
create or replace function public.get_push_config()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_object_agg(key, value) from private.settings where key in ('vapid_keys', 'contact_email');
$$;
revoke execute on function public.get_push_config() from public, anon, authenticated;
grant execute on function public.get_push_config() to service_role;

create or replace function private.notify_staff()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://jlqvzbyrywvqlcrlmphb.supabase.co/functions/v1/notify-staff',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('type', case when tg_table_name = 'orders' then 'order' else 'request' end, 'id', new.id)
  );
  return new;
end $$;

create trigger orders_notify_staff after insert on public.orders
for each row execute function private.notify_staff();
create trigger service_requests_notify_staff after insert on public.service_requests
for each row execute function private.notify_staff();
