-- BiteAtlas — initial schema
--
--   areas ──< buildings ──< restaurants >── restaurant_categories >── categories
--                              │
--   auth.users ──< user_restaurants (private, RLS: owner only)
--        └── profiles (display name + admin flag)
--
-- Restaurant data is public-read. Writes to catalog tables are admin-only.
-- Per-user visit data is readable/writable only by its owner.

create extension if not exists postgis with schema extensions;

-- ─── helpers ────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── areas ──────────────────────────────────────────────────────────────────

create table public.areas (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null,
  city             text not null default 'Dhaka',
  description      text,
  latitude         double precision not null check (latitude between -90 and 90),
  longitude        double precision not null check (longitude between -180 and 180),
  zoom             real not null default 14,
  -- [west, south, east, north] — used to frame the viewport, never drawn as a boundary.
  bbox             double precision[] check (bbox is null or array_length(bbox, 1) = 4),
  -- Only populated from a verified source (see boundary_source). Never invented.
  boundary_geojson jsonb,
  boundary_source  text,
  active           boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger areas_set_updated_at before update on public.areas
  for each row execute function public.set_updated_at();

-- ─── categories ─────────────────────────────────────────────────────────────

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null,
  emoji      text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ─── buildings ──────────────────────────────────────────────────────────────

create table public.buildings (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  area_id    uuid not null references public.areas (id) on delete restrict,
  name       text not null,
  address    text,
  latitude   double precision not null check (latitude between -90 and 90),
  longitude  double precision not null check (longitude between -180 and 180),
  location   extensions.geography(point, 4326)
             generated always as (
               extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
             ) stored,
  osm_id     text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index buildings_area_id_idx on public.buildings (area_id);
create index buildings_location_idx on public.buildings using gist (location);

create trigger buildings_set_updated_at before update on public.buildings
  for each row execute function public.set_updated_at();

-- ─── restaurants ────────────────────────────────────────────────────────────
-- Our own UUID is the identity. Coordinates are NOT unique: several
-- restaurants can share one building (and one point on the map).

create table public.restaurants (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null check (length(trim(name)) > 0),
  name_bn         text,
  area_id        uuid not null references public.areas (id) on delete restrict,
  building_id     uuid references public.buildings (id) on delete set null,
  latitude        double precision not null check (latitude between -90 and 90),
  longitude       double precision not null check (longitude between -180 and 180),
  location        extensions.geography(point, 4326)
                  generated always as (
                    extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
                  ) stored,
  floor           text,
  address         text,
  phone           text,
  website         text,
  rating          numeric(2, 1) check (rating between 0 and 5),
  rating_count    integer check (rating_count >= 0),
  photo_url       text,
  -- Optional external identifiers. Never used as primary keys.
  google_place_id text unique,
  osm_id          text unique,
  source          text not null default 'manual'
                  check (source in ('osm', 'manual', 'google_places', 'import')),
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index restaurants_area_id_idx on public.restaurants (area_id) where active;
create index restaurants_building_id_idx on public.restaurants (building_id);
create index restaurants_location_idx on public.restaurants using gist (location);
create index restaurants_name_search_idx on public.restaurants using gin (to_tsvector('simple', name));

create trigger restaurants_set_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();

create table public.restaurant_categories (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id   uuid not null references public.categories (id) on delete cascade,
  is_primary    boolean not null default false,
  primary key (restaurant_id, category_id)
);

create index restaurant_categories_category_id_idx on public.restaurant_categories (category_id);

-- ─── profiles ───────────────────────────────────────────────────────────────

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or length(display_name) <= 80),
  avatar_url   text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stable, cheap admin check usable inside RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

-- ─── user_restaurants ───────────────────────────────────────────────────────
-- One row per (user, restaurant). Holds only the user's relationship to the
-- restaurant — never a copy of restaurant data.

create table public.user_restaurants (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  visited       boolean not null default false,
  visited_at    date,
  favorite      boolean not null default false,
  notes         text check (notes is null or length(notes) <= 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, restaurant_id),
  constraint visited_at_requires_visit check (visited or visited_at is null)
);

create index user_restaurants_user_id_idx on public.user_restaurants (user_id);
create index user_restaurants_restaurant_id_idx on public.user_restaurants (restaurant_id);

create trigger user_restaurants_set_updated_at before update on public.user_restaurants
  for each row execute function public.set_updated_at();

-- ─── PostGIS helper (future: "restaurants near me", nearest unvisited, …) ───

create or replace function public.restaurants_near(lat double precision, lng double precision, radius_m double precision default 1000)
returns setof public.restaurants
language sql
stable
set search_path = ''
as $$
  select r.*
  from public.restaurants r
  where r.active
    and extensions.st_dwithin(
      r.location,
      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography,
      least(radius_m, 10000)
    )
  order by r.location operator(extensions.<->) extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography;
$$;

-- ─── Row Level Security ─────────────────────────────────────────────────────

alter table public.areas                 enable row level security;
alter table public.categories            enable row level security;
alter table public.buildings             enable row level security;
alter table public.restaurants           enable row level security;
alter table public.restaurant_categories enable row level security;
alter table public.profiles              enable row level security;
alter table public.user_restaurants      enable row level security;

-- Catalog: anyone can read, only admins can write.
create policy "areas are public" on public.areas for select using (true);
create policy "admins manage areas" on public.areas for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "categories are public" on public.categories for select using (true);
create policy "admins manage categories" on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "buildings are public" on public.buildings for select using (true);
create policy "admins manage buildings" on public.buildings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "active restaurants are public" on public.restaurants for select
  using (active or (select public.is_admin()));
create policy "admins manage restaurants" on public.restaurants for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "restaurant categories are public" on public.restaurant_categories for select using (true);
create policy "admins manage restaurant categories" on public.restaurant_categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Profiles: users see and edit only their own; is_admin is not user-writable.
create policy "users read own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "users update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- Visits: private to their owner.
revoke all on public.user_restaurants from anon;

create policy "users read own visits" on public.user_restaurants for select to authenticated
  using (user_id = (select auth.uid()));
create policy "users insert own visits" on public.user_restaurants for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "users update own visits" on public.user_restaurants for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own visits" on public.user_restaurants for delete to authenticated
  using (user_id = (select auth.uid()));
