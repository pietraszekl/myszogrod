drop policy if exists "Anon users can read properties" on public.properties;
drop policy if exists "Anon users can insert properties" on public.properties;
drop policy if exists "Anon users can update properties during development" on public.properties;

alter table public.properties enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invitations enable row level security;

revoke all on table public.properties from anon;
revoke all on table public.projects from anon;
revoke all on table public.project_members from anon;
revoke all on table public.project_invitations from anon;

revoke all on function public.delete_property(uuid) from public;
revoke all on function public.delete_property(uuid) from anon;
grant execute on function public.delete_property(uuid) to authenticated;

revoke all on function public.create_project(text) from public;
revoke all on function public.create_project(text) from anon;
grant execute on function public.create_project(text) to authenticated;

revoke all on function public.accept_my_project_invitations() from public;
revoke all on function public.accept_my_project_invitations() from anon;
grant execute on function public.accept_my_project_invitations() to authenticated;

revoke all on function public.prepare_account_deletion(uuid) from public;
revoke all on function public.prepare_account_deletion(uuid) from anon;
revoke all on function public.prepare_account_deletion(uuid) from authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
