-- Catalog data (areas, categories, buildings, restaurants) is loaded from the
-- JSON files in /data by the import script, so it stays reviewable in git:
--
--   npm run db:import
--
-- To make yourself an admin after signing up:
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@example.com');
select 1;
