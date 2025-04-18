alter table joiners add column tenant varchar(32);
update joiners set tenant = 'arelux-italia' where tenant is null;
alter table joiners alter column tenant set not null;