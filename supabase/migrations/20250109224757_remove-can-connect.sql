drop view view_junctions;
drop view view_curves;

alter table junctions drop column can_connect;
alter table junctions drop column groups;
alter table object_junctions add column groups varchar(32);
alter table object_curve_junctions add column groups varchar(32);
update object_junctions set groups = '';
update object_curve_junctions set groups = '';
alter table object_junctions alter column groups set not null;
alter table object_curve_junctions alter column groups set not null;

create view view_junctions with (security_invoker = true) as
select
  o.code, o.tenant, oj.groups,
  j.angle, j.x, j.y, j.z
from objects o
  join object_junctions oj on o.code = oj.object_code and o.tenant = oj.tenant
  join junctions j on oj.junction_id = j.id
order by j.id;

create view view_curves with (security_invoker = true) as
select
  o.code, o.tenant, ocj.groups,
  j1.id j1id, j1.x j1x, j1.y j1y, j1.z j1z,
  j2.id j2id, j2.x j2x, j2.y j2y, j2.z j2z,
  jC.id jCid, jC.x jCx, jC.y jCy, jC.z jCz
from objects o
  join object_curve_junctions ocj on o.code = ocj.object_code
  join junctions j1 on ocj.junction1_id = j1.id
  join junctions j2 on ocj.junction2_id = j2.id
  join junctions jC on ocj.junction_control_id = jC.id;
