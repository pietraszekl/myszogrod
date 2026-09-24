create policy "Anon users can read properties"
on public.properties
for select
to anon
using (true);

create policy "Anon users can insert properties"
on public.properties
for insert
to anon
with check (true);
