-- Onboard a new restaurant client: creates the restaurant, its owner login and N tables.
-- Run in the Supabase SQL editor after replacing the four values in the first CTE-like block.
-- The owner can then sign in at <site>/#/admin and build their menu.

do $$
declare
  v_slug text := 'new-restaurant';          -- URL name: <site>/#/r/new-restaurant
  v_name text := 'New Restaurant';
  v_email text := 'owner@example.com';
  v_password text := 'change-me-please';    -- give this to the owner; they can change it later
  v_tables int := 10;

  v_restaurant uuid;
  v_user uuid := gen_random_uuid();
begin
  insert into public.restaurants (slug, name) values (v_slug, v_name) returning id into v_restaurant;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated', lower(v_email),
    extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_user, v_user::text,
    jsonb_build_object('sub', v_user::text, 'email', lower(v_email), 'email_verified', true),
    'email', now(), now(), now());

  insert into public.restaurant_staff (restaurant_id, user_id, role) values (v_restaurant, v_user, 'owner');

  insert into public.dining_tables (restaurant_id, label, sort_order)
  select v_restaurant, 'Table ' || n, n from generate_series(1, v_tables) n;
end $$;
