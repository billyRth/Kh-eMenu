-- 010: staff can take a free table out of use (broken, reserved...). NULL = available;
-- any text (even empty) = unavailable, with the text as the optional reason shown to staff.
alter table public.dining_tables add column unavailable text check (char_length(unavailable) <= 60);

-- Nobody can be seated at, moved to or combined into an unavailable table, from any phone or function.
alter table public.dining_tables add constraint table_unavailable
  check (unavailable is null or (seated_at is null and joined_to is null));
