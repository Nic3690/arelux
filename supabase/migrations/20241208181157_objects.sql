create table junctions (
    id              serial primary key,
    -- The groups of objects to which this junction can connect
    can_connect     text[] not null,
    groups          text[] not null,
    x               decimal not null,
    y               decimal not null,
    z               decimal not null,
    angle           decimal not null
);

create table objects (
    code            text primary key,
    typ             varchar(8) not null
);

create table object_junctions(
    object_code     text not null,
    junction_id     integer not null,

    primary key (object_code, junction_id),
    foreign key (object_code) references objects(code) on delete cascade,
    foreign key (junction_id) references junctions(id) on delete cascade
);

create table object_curve_junctions(
    object_code             text not null,
    junction1_id            integer not null,
    junction_control_id     integer not null,
    junction2_id            integer not null,

    primary key (object_code, junction1_id, junction_control_id, junction2_id),
    foreign key (object_code) references objects(code) on delete cascade,
    foreign key (junction1_id) references junctions(id) on delete cascade,
    foreign key (junction_control_id) references junctions(id) on delete cascade,
    foreign key (junction2_id) references junctions(id) on delete cascade
);

create view view_junctions as
select objects.code, objects.typ, junctions.can_connect, junctions.groups, junctions.angle, junctions.x, junctions.y, junctions.z
from objects
  join object_junctions on objects.code = object_junctions.object_code
  join junctions on object_junctions.junction_id = junctions.id
order by junctions.id;

create view view_curves as select objects.code, objects.typ, junctions.id, junctions.can_connect, junctions.groups, junctions.angle, junctions.x, junctions.y, junctions.z
from objects
  join object_curve_junctions on objects.code = object_curve_junctions.object_code
  join junctions on object_curve_junctions.junction1_id = junctions.id or object_curve_junctions.junction2_id = junctions.id or object_curve_junctions.junction_control_id = junctions.id
order by junctions.id;