create table if not exists public.bookingcal_config (
  id text primary key,
  config jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.bookingcal_config enable row level security;

create policy "bookingcal config public read"
on public.bookingcal_config
for select
using (true);

create policy "bookingcal config authenticated insert"
on public.bookingcal_config
for insert
to authenticated
with check (auth.uid() is not null);

create policy "bookingcal config authenticated update"
on public.bookingcal_config
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);
