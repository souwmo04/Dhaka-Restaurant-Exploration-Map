-- Areas can belong to a named group (e.g. the four Mirpur maps belong to "Mirpur"),
-- used to group them in the area switcher and dashboard.
alter table public.areas add column group_name text;
