insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-photos',
  'property-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Project members can read property photos" on storage.objects;
drop policy if exists "Project members can upload property photos" on storage.objects;
drop policy if exists "Project members can update property photos" on storage.objects;
drop policy if exists "Project admins can delete property photos" on storage.objects;

create policy "Project members can read property photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'property-photos'
  and public.is_project_member((split_part(name, '/', 1))::uuid)
);

create policy "Project members can upload property photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'property-photos'
  and public.is_project_member((split_part(name, '/', 1))::uuid)
);

create policy "Project members can update property photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'property-photos'
  and public.is_project_member((split_part(name, '/', 1))::uuid)
)
with check (
  bucket_id = 'property-photos'
  and public.is_project_member((split_part(name, '/', 1))::uuid)
);

create policy "Project admins can delete property photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'property-photos'
  and public.is_project_admin((split_part(name, '/', 1))::uuid)
);
