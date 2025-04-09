alter table families add arbitraryLength boolean;
update families set arbitraryLength = false;
alter table families alter arbitraryLength set not null;
alter table families add check (not (arbitraryLength = true and needsLengthConfig = false));