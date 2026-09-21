-- 011: remember every seating so the Today report can count guests after tables are cleared.
-- One row per party, keyed by when it was seated: moving a party keeps its seated_at, so it isn't counted twice.
create table public.seatings (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  seated_at timestamptz not null,
  party_size smallint,
  primary key (restaurant_id, seated_at)
);
alter table public.seatings enable row level security;
create policy "staff read seatings" on public.seatings for select to authenticated
  using ((select public.is_staff(restaurant_id)));

create function private.log_seating()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.seated_at is not null then
    insert into public.seatings (restaurant_id, seated_at, party_size)
    values (new.restaurant_id, new.seated_at, new.party_size)
    on conflict (restaurant_id, seated_at)
    do update set party_size = coalesce(excluded.party_size, public.seatings.party_size);
  end if;
  return new;
end $$;

create trigger dining_tables_log_seating after insert or update of seated_at, party_size on public.dining_tables
for each row execute function private.log_seating();

-- Parties already seated when this shipped.
insert into public.seatings (restaurant_id, seated_at, party_size)
select restaurant_id, seated_at, party_size from public.dining_tables where seated_at is not null
on conflict do nothing;
