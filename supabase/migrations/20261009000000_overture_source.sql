-- Restaurants can come from Overture Maps (open data: Meta, Microsoft, Foursquare … under
-- CDLA-Permissive-2.0 / Apache-2.0). Track its stable id for idempotent re-imports.
alter table public.restaurants add column overture_id text unique;

alter table public.restaurants drop constraint restaurants_source_check;
alter table public.restaurants add constraint restaurants_source_check
  check (source in ('osm', 'overture', 'manual', 'google_places', 'import'));
