-- Replace the implicit "auto-accept every pending invite on login" flow with an
-- explicit accept/decline flow the invitee controls.

drop function if exists public.accept_my_project_invitations();

create or replace function public.list_my_pending_invitations()
returns table (
  id uuid,
  project_id uuid,
  project_name text,
  role text,
  invited_by_email text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    invitations.id,
    invitations.project_id,
    projects.name as project_name,
    invitations.role,
    inviter.email as invited_by_email,
    invitations.created_at
  from public.project_invitations invitations
  join public.projects projects on projects.id = invitations.project_id
  left join auth.users inviter on inviter.id = invitations.invited_by
  where lower(invitations.email) = lower(auth.email())
    and invitations.accepted_at is null
  order by invitations.created_at desc;
$$;

revoke all on function public.list_my_pending_invitations() from public;
grant execute on function public.list_my_pending_invitations() to authenticated;

create or replace function public.accept_project_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation record;
begin
  select *
  into invitation
  from public.project_invitations
  where id = invitation_id
    and lower(email) = lower(auth.email())
    and accepted_at is null
  for update;

  if invitation.id is null then
    raise exception 'Invitation was not found or has already been handled'
      using errcode = 'P0002';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (invitation.project_id, auth.uid(), invitation.role)
  on conflict (project_id, user_id) do nothing;

  update public.project_invitations
  set accepted_at = now()
  where id = invitation.id;
end;
$$;

revoke all on function public.accept_project_invitation(uuid) from public;
grant execute on function public.accept_project_invitation(uuid) to authenticated;

create or replace function public.decline_project_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  declined_id uuid;
begin
  delete from public.project_invitations
  where id = invitation_id
    and lower(email) = lower(auth.email())
    and accepted_at is null
  returning id into declined_id;

  if declined_id is null then
    raise exception 'Invitation was not found or has already been handled'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.decline_project_invitation(uuid) from public;
grant execute on function public.decline_project_invitation(uuid) to authenticated;
