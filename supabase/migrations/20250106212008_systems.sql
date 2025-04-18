create table systems (
    tenant          varchar(32) not null,
    code            varchar(32) not null,

    primary key (tenant, code)
);
insert into systems values ('arelux-italia', 'XNet');

alter table objects add column system varchar(32);
update objects set system = 'XNet' where tenant = 'arelux-italia';
alter table objects alter column system set not null;
alter table objects add foreign key (tenant, system) references systems(tenant, code);

alter table families add column system varchar(32);
update families set system = 'XNet' where tenant = 'arelux-italia';
alter table families alter column system set not null;
alter table families add foreign key (tenant, system) references systems(tenant, code);
