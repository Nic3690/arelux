drop view view_curves;

create view view_curves as
select
  o.code, o.tenant,
  j1.id j1id, j1.can_connect j1can_connect, j1.groups j1groups, j1.x j1x, j1.y j1y, j1.z j1z,
  j2.id j2id, j2.can_connect j2can_connect, j2.groups j2groups, j2.x j2x, j2.y j2y, j2.z j2z,
  jC.id jCid, jC.can_connect jCcan_connect, jC.groups jCgroups, jC.x jCx, jC.y jCy, jC.z jCz
from objects o
  join object_curve_junctions ocj on o.code = ocj.object_code
  join junctions j1 on ocj.junction1_id = j1.id
  join junctions j2 on ocj.junction2_id = j2.id
  join junctions jC on ocj.junction_control_id = jC.id;

create table families (
    tenant                  varchar(32) not null,
    code                    varchar(32) not null,
    displayName             varchar(32) not null,
    familyGroup             varchar(32) not null,
    hasModel                boolean not null,
    needsColorConfig        boolean not null,
    needsLengthConfig       boolean not null,
    needsCurveConfig        boolean not null,
    needsTemperatureConfig  boolean not null,

    primary key (tenant, code)
);