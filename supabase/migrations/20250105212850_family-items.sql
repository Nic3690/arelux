create table family_objects (
    tenant              varchar(32) not null,
    familyCode          varchar(32) not null,
    objectCode          varchar(32) not null,

    len                 real,
    angle               real,
    color               varchar(7),
    temperature         integer,

    primary key (tenant, familyCode, objectCode),
    unique (tenant, familyCode, len),
    unique (tenant, familyCode, angle),
    unique (tenant, familyCode, color),
    unique (tenant, familyCode, temperature)
);