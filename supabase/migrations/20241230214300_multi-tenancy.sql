alter table objects add column tenant varchar(32);
alter table object_junctions add column tenant varchar(32);
alter table object_curve_junctions add column tenant varchar(32);

update objects set tenant = 'arelux-italia';
update object_junctions set tenant = 'arelux-italia';
update object_curve_junctions set tenant = 'arelux-italia';

alter table objects alter column tenant set not null;
alter table object_junctions alter column tenant set not null;
alter table object_curve_junctions alter column tenant set not null;

alter table objects drop constraint objects_pkey cascade;
alter table object_junctions drop constraint object_junctions_pkey cascade;
alter table object_curve_junctions drop constraint object_curve_junctions_pkey cascade;
alter table objects add constraint objects_pkey primary key (code, tenant);
alter table object_junctions add constraint object_junctions_pkey primary key (object_code, junction_id, tenant);
alter table object_curve_junctions add constraint object_curve_junctions_pkey primary key (object_code, junction1_id, junction2_id, junction_control_id, tenant);

create or replace view view_junctions as
select objects.code, objects.typ, junctions.can_connect, junctions.groups, junctions.angle, junctions.x, junctions.y, junctions.z, objects.tenant
from objects
  join object_junctions on objects.code = object_junctions.object_code
                       and objects.tenant = object_junctions.tenant
  join junctions on object_junctions.junction_id = junctions.id
order by junctions.id;

create or replace view view_curves as select objects.code, objects.typ, junctions.id, junctions.can_connect, junctions.groups, junctions.angle, junctions.x, junctions.y, junctions.z, objects.tenant
from objects
  join object_curve_junctions on objects.code = object_curve_junctions.object_code
                             and objects.tenant = object_curve_junctions.tenant
  join junctions on object_curve_junctions.junction1_id = junctions.id or object_curve_junctions.junction2_id = junctions.id or object_curve_junctions.junction_control_id = junctions.id
order by junctions.id;