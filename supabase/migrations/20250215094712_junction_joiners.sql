create table joiners (
    group_code      varchar(32) not null,
    object_code     text not null,
    primary key (group_code, object_code)
);

create policy allow_select on public.joiners for select to anon using (true);
create policy allow_anything_authenticated on public.joiners for all to authenticated using (true);
alter table public.joiners enable row level security;