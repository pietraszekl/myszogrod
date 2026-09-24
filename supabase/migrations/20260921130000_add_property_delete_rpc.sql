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
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'Property % was not found or could not be deleted', property_id
      using errcode = 'P0002';
  end if;

  return deleted_id;
end;
$$;

revoke all on function public.delete_property(uuid) from public;
grant execute on function public.delete_property(uuid) to anon;
grant execute on function public.delete_property(uuid) to authenticated;
