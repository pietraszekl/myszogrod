create or replace function public.create_project(project_name text)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  created_project public.projects;
begin
  if auth.uid() is null then
    raise exception 'Authentication required to create a project'
      using errcode = '28000';
  end if;

  if project_name is null or length(trim(project_name)) = 0 then
    raise exception 'Project name is required'
      using errcode = '22023';
  end if;

  insert into public.projects (name, owner_id)
  values (trim(project_name), auth.uid())
  returning * into created_project;

  insert into public.project_members (project_id, user_id, role)
  values (created_project.id, auth.uid(), 'owner')
  on conflict (project_id, user_id) do update set role = 'owner';

  return created_project;
end;
$$;

revoke all on function public.create_project(text) from public;
grant execute on function public.create_project(text) to authenticated;
