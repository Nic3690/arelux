alter table objects add column power numeric(6, 2);

update objects set power = 0;
update objects set power = -7 where code = 'XNRS31';

alter table objects alter column power set not null;