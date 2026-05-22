-- Run if your floorplans table already exists without series:
alter table floorplans add column if not exists series text;
