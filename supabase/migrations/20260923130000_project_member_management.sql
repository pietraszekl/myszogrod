-- Lets project members see who else is in the project, and lets project
-- admins remove a member — while guaranteeing the project owner can never
-- be removed (which would otherwise strand the project with no admin able
-- to manage it, since RLS on every project-scoped table keys off
-- project_members).

create or replace function public.list_project_members(target_project_id uuid)
returns table (
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    members.user_id,
    users.email,
    members.role,
    members.created_at
  from public.project_members members
  join auth.users users on users.id = members.user_id
  where members.project_id = target_project_id
    and public.is_project_member(target_project_id)
  order by
    case members.role
      when 'owner' then 0
      when 'admin' then 1
      else 2
    end,
    members.created_at;
$$;

revoke all on function public.list_project_members(uuid) from public;
grant execute on function public.list_project_members(uuid) to authenticated;

create or replace function public.remove_project_member(target_project_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  project_owner_id uuid;
  removed_id uuid;
begin
  if not public.is_project_admin(target_project_id) then
    raise exception 'Only project admins can remove members'
      using errcode = '42501';
  end if;

  select owner_id into project_owner_id
  from public.projects
  where id = target_project_id;

  if project_owner_id is null then
    raise exception 'Project was not found'
      using errcode = 'P0002';
  end if;

  if target_user_id = project_owner_id then
    raise exception 'The project owner cannot be removed'
      using errcode = '42501';
  end if;

  delete from public.project_members
  where project_id = target_project_id
    and user_id = target_user_id
  returning user_id into removed_id;

  if removed_id is null then
    raise exception 'Member was not found in this project'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.remove_project_member(uuid, uuid) from public;
grant execute on function public.remove_project_member(uuid, uuid) to authenticated;
