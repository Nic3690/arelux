alter table families add column visible boolean;
update families set visible = true;
alter table families alter column visible set not null;

alter table families add column needsledconfig boolean;
update families set needsledconfig = false;
alter table families alter column needsledconfig set not null;

alter table families add column ledFamily varchar(32);
alter table families add foreign key (tenant, code) references families(tenant, code);

alter table families add check (not (needsLedConfig and ledFamily is null));
