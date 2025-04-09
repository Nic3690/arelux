alter table public.objects enable row level security;
alter table public.junctions enable row level security;
alter table public.object_junctions enable row level security;
alter table public.object_curve_junctions enable row level security;

create policy allow_select on public.objects for select to anon using (true);
create policy allow_select on public.junctions for select to anon using (true);
create policy allow_select on public.object_junctions for select to anon using (true);
create policy allow_select on public.object_curve_junctions for select to anon using (true);

create policy allow_anything_authenticated on public.objects for all to authenticated using (true);
create policy allow_anything_authenticated on public.junctions for all to authenticated using (true);
create policy allow_anything_authenticated on public.object_junctions for all to authenticated using (true);
create policy allow_anything_authenticated on public.object_curve_junctions for all to authenticated using (true);