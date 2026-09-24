create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  property_type text not null check (property_type in ('land', 'house')),
  location text not null,
  price text not null,
  area text not null,
  status text not null check (
    status in ('Do obejrzenia', 'Obiecujące', 'W trakcie', 'Odrzucone')
  ),
  description text not null default '',
  note_count integer not null default 0 check (note_count >= 0),
  photo_count integer not null default 0 check (photo_count >= 0),
  photos jsonb not null default '[]'::jsonb,
  criteria jsonb not null default '[]'::jsonb,
  coordinates jsonb not null,
  x numeric not null default 50,
  y numeric not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_properties_updated_at on public.properties;

create trigger set_properties_updated_at
before update on public.properties
for each row
execute function public.set_updated_at();

alter table public.properties enable row level security;

create policy "Authenticated users can read properties"
on public.properties
for select
to authenticated
using (true);

create policy "Authenticated users can insert properties"
on public.properties
for insert
to authenticated
with check (true);

create policy "Authenticated users can update properties"
on public.properties
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete properties"
on public.properties
for delete
to authenticated
using (true);
