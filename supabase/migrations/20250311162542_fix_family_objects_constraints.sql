alter table family_objects drop constraint "family_objects_tenant_familycode_angle_key";
alter table family_objects drop constraint "family_objects_tenant_familycode_color_key";
alter table family_objects drop constraint "family_objects_tenant_familycode_len_key";
alter table family_objects drop constraint "family_objects_tenant_familycode_temperature_key";

alter table family_objects add unique nulls not distinct
    (tenant, familycode, len, angle, color, temperature, radius);