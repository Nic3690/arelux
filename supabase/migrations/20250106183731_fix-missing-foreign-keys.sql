alter table object_junctions add foreign key (object_code, tenant) references objects (code, tenant);
alter table object_curve_junctions add foreign key (object_code, tenant) references objects (code, tenant);
alter table family_objects add foreign key (familyCode, tenant) references families (code, tenant);
alter table family_objects add foreign key (objectCode, tenant) references objects (code, tenant);