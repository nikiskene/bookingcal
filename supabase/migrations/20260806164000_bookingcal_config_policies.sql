drop policy if exists "bookingcal config public read" on public.bookingcal_config;
drop policy if exists "bookingcal config authenticated insert" on public.bookingcal_config;
drop policy if exists "bookingcal config authenticated update" on public.bookingcal_config;
drop policy if exists "bookingcal config anon read" on public.bookingcal_config;
drop policy if exists "bookingcal config authenticated write" on public.bookingcal_config;

create policy "bookingcal config anon read"
on public.bookingcal_config
for select
to anon, authenticated
using (true);

create policy "bookingcal config authenticated write"
on public.bookingcal_config
for all
to authenticated
using (true)
with check (true);
