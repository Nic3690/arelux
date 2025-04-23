alter table objects add price_cents int;

update objects set price_cents = 0;

alter table objects alter price_cents set not null;