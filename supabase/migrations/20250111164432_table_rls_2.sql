create policy allow_select on public.systems for select to anon using (true);
create policy allow_select on public.families for select to anon using (true);
create policy allow_select on public.family_objects for select to anon using (true);

create policy allow_anything_authenticated on public.systems for all to authenticated using (true);
create policy allow_anything_authenticated on public.families for all to authenticated using (true);
create policy allow_anything_authenticated on public.family_objects for all to authenticated using (true);

alter table public.systems enable row level security;
alter table public.families enable row level security;
alter table public.family_objects enable row level security;