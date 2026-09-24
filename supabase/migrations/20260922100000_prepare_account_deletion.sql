alter table public.projects
drop constraint if exists projects_owner_id_fkey;

alter table public.projects
add constraint projects_owner_id_fkey
foreign key (owner_id)
references auth.users(id)
on delete restrict;

create or replace function public.prepare_account_deletion(target_user_id uuid)
returns table (
  transferred_projects integer,
  deleted_projects integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_project record;
  replacement_member record;
  transferred_count integer := 0;
  deleted_count integer := 0;
begin
  if target_user_id is null then
    raise exception 'target_user_id is required'
      using errcode = '22023';
  end if;

  if auth.role() <> 'service_role' then
    raise exception 'Only the service role can prepare account deletion'
      using errcode = '42501';
  end if;

  for owned_project in
    select id
    from public.projects
    where owner_id = target_user_id
    order by created_at, id
    for update
  loop
    select project_id, user_id, role
    into replacement_member
    from public.project_members
    where project_id = owned_project.id
      and user_id <> target_user_id
    order by
      case role
        when 'admin' then 0
        when 'owner' then 1
        else 2
      end,
      created_at,
      user_id
    limit 1;

    if replacement_member.user_id is null then
      delete from storage.objects
      where bucket_id = 'property-photos'
        and name like owned_project.id::text || '/%';

      delete from public.projects
      where id = owned_project.id;

      deleted_count := deleted_count + 1;
    else
      update public.project_members
      set role = 'owner'
      where project_id = owned_project.id
        and user_id = replacement_member.user_id;

      update public.projects
      set owner_id = replacement_member.user_id
      where id = owned_project.id;

      delete from public.project_members
      where project_id = owned_project.id
        and user_id = target_user_id;

      transferred_count := transferred_count + 1;
    end if;
  end loop;

  delete from public.project_members
  where user_id = target_user_id;

  transferred_projects := transferred_count;
  deleted_projects := deleted_count;
  return next;
end;
$$;

revoke all on function public.prepare_account_deletion(uuid) from public;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
