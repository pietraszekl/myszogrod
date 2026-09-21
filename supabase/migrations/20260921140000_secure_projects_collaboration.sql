create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, email)
);

alter table public.properties
add column if not exists project_id uuid references public.projects(id) on delete cascade;

alter table public.properties
add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.properties
add column if not exists source_url text;

create index if not exists properties_project_id_idx on public.properties(project_id);
create index if not exists project_members_user_id_idx on public.project_members(user_id);
create index if not exists project_invitations_project_id_idx on public.project_invitations(project_id);

create or replace function public.set_project_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;

create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_project_updated_at();

create or replace function public.is_project_member(project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.project_members
    where project_members.project_id = is_project_member.project_id
      and project_members.user_id = auth.uid()
  );
$$;

create or replace function public.is_project_admin(project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.project_members
    where project_members.project_id = is_project_admin.project_id
      and project_members.user_id = auth.uid()
      and project_members.role in ('owner', 'admin')
  );
$$;

create or replace function public.add_project_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (project_id, user_id) do update set role = 'owner';

  return new;
end;
$$;

drop trigger if exists add_project_owner_member on public.projects;

create trigger add_project_owner_member
after insert on public.projects
for each row
execute function public.add_project_owner_member();

do $$
declare
  owner_user_id uuid;
  default_project_id uuid;
begin
  select id into owner_user_id
  from auth.users
  where lower(email) = lower('piver2@gmail.com')
  limit 1;

  if owner_user_id is null then
    raise exception 'Cannot secure data: auth user piver2@gmail.com does not exist yet.';
  end if;

  insert into public.projects (name, owner_id)
  values ('Myszogród', owner_user_id)
  on conflict do nothing
  returning id into default_project_id;

  if default_project_id is null then
    select id into default_project_id
    from public.projects
    where owner_id = owner_user_id
    order by created_at
    limit 1;
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (default_project_id, owner_user_id, 'owner')
  on conflict (project_id, user_id) do update set role = 'owner';

  update public.properties
  set
    project_id = default_project_id,
    created_by = coalesce(created_by, owner_user_id)
  where project_id is null;
end;
$$;

alter table public.properties
alter column project_id set not null;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invitations enable row level security;

drop policy if exists "Anon users can read properties" on public.properties;
drop policy if exists "Anon users can insert properties" on public.properties;
drop policy if exists "Anon users can update properties during development" on public.properties;
drop policy if exists "Authenticated users can read properties" on public.properties;
drop policy if exists "Authenticated users can insert properties" on public.properties;
drop policy if exists "Authenticated users can update properties" on public.properties;
drop policy if exists "Authenticated users can delete properties" on public.properties;

create policy "Project members can read properties"
on public.properties
for select
to authenticated
using (public.is_project_member(project_id));

create policy "Project members can insert properties"
on public.properties
for insert
to authenticated
with check (
  public.is_project_member(project_id)
  and created_by = auth.uid()
);

create policy "Project members can update properties"
on public.properties
for update
to authenticated
using (public.is_project_member(project_id))
with check (public.is_project_member(project_id));

create policy "Project admins can delete properties"
on public.properties
for delete
to authenticated
using (public.is_project_admin(project_id));

create policy "Members can read projects"
on public.projects
for select
to authenticated
using (public.is_project_member(id));

create policy "Authenticated users can create projects"
on public.projects
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "Admins can update projects"
on public.projects
for update
to authenticated
using (public.is_project_admin(id))
with check (public.is_project_admin(id));

create policy "Owners can delete projects"
on public.projects
for delete
to authenticated
using (owner_id = auth.uid());

create policy "Members can read project members"
on public.project_members
for select
to authenticated
using (public.is_project_member(project_id));

create policy "Admins can manage project members"
on public.project_members
for all
to authenticated
using (public.is_project_admin(project_id))
with check (public.is_project_admin(project_id));

create policy "Admins can read invitations"
on public.project_invitations
for select
to authenticated
using (public.is_project_admin(project_id));

create policy "Admins can create invitations"
on public.project_invitations
for insert
to authenticated
with check (
  public.is_project_admin(project_id)
  and invited_by = auth.uid()
);

create policy "Admins can update invitations"
on public.project_invitations
for update
to authenticated
using (public.is_project_admin(project_id))
with check (public.is_project_admin(project_id));

create policy "Admins can delete invitations"
on public.project_invitations
for delete
to authenticated
using (public.is_project_admin(project_id));

create or replace function public.accept_my_project_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted_count integer;
begin
  insert into public.project_members (project_id, user_id, role)
  select project_id, auth.uid(), role
  from public.project_invitations
  where lower(email) = lower(auth.email())
    and accepted_at is null
  on conflict (project_id, user_id) do update set role = excluded.role;

  update public.project_invitations
  set accepted_at = now()
  where lower(email) = lower(auth.email())
    and accepted_at is null;

  get diagnostics accepted_count = row_count;

  return accepted_count;
end;
$$;

revoke all on function public.accept_my_project_invitations() from public;
grant execute on function public.accept_my_project_invitations() to authenticated;

create or replace function public.delete_property(property_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_id uuid;
begin
  delete from public.properties
  where id = property_id
    and public.is_project_admin(project_id)
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'Property % was not found or could not be deleted', property_id
      using errcode = 'P0002';
  end if;

  return deleted_id;
end;
$$;

revoke execute on function public.delete_property(uuid) from anon;
grant execute on function public.delete_property(uuid) to authenticated;
