create policy "Anon users can update properties during development"
on public.properties
for update
to anon
using (true)
with check (true);
