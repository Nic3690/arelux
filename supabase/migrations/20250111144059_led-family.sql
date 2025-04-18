alter table families add isLed boolean;
update families set isLed = false;
alter table families alter isLed set not null;