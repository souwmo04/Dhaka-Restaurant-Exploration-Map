/**
 * Supabase schema types, mirroring supabase/migrations. Regenerate from a
 * running database with `npm run db:types` (writes database.generated.ts)
 * and swap the import if you prefer generated types.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type AreaRow = {
  id: string;
  slug: string;
  name: string;
  city: string;
  description: string | null;
  latitude: number;
  longitude: number;
  zoom: number;
  bbox: number[] | null;
  boundary_geojson: Json | null;
  boundary_source: string | null;
  active: boolean;
  sort_order: number;
} & Timestamps;

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  created_at: string;
};

export type BuildingRow = {
  id: string;
  slug: string;
  area_id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  location: unknown;
  osm_id: string | null;
} & Timestamps;

export type RestaurantRow = {
  id: string;
  slug: string;
  name: string;
  name_bn: string | null;
  area_id: string;
  building_id: string | null;
  latitude: number;
  longitude: number;
  location: unknown;
  floor: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  rating_count: number | null;
  photo_url: string | null;
  google_place_id: string | null;
  osm_id: string | null;
  source: "osm" | "manual" | "google_places" | "import";
  active: boolean;
} & Timestamps;

export type RestaurantCategoryRow = {
  restaurant_id: string;
  category_id: string;
  is_primary: boolean;
};

export type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
} & Timestamps;

export type UserRestaurantRow = {
  id: string;
  user_id: string;
  restaurant_id: string;
  visited: boolean;
  visited_at: string | null;
  favorite: boolean;
  notes: string | null;
} & Timestamps;

type Insert<Row, Required extends keyof Row, Generated extends keyof Row = never> = Pick<Row, Required> &
  Partial<Omit<Row, Required | Generated>>;

type Table<Row, I, Rel extends unknown[] = []> = {
  Row: Row;
  Insert: I;
  Update: Partial<I>;
  Relationships: Rel;
};

export type Database = {
  public: {
    Tables: {
      areas: Table<AreaRow, Insert<AreaRow, "slug" | "name" | "latitude" | "longitude">>;
      categories: Table<CategoryRow, Insert<CategoryRow, "slug" | "name">>;
      buildings: Table<
        BuildingRow,
        Insert<BuildingRow, "slug" | "area_id" | "name" | "latitude" | "longitude", "location">,
        [
          {
            foreignKeyName: "buildings_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
        ]
      >;
      restaurants: Table<
        RestaurantRow,
        Insert<RestaurantRow, "slug" | "name" | "area_id" | "latitude" | "longitude", "location">,
        [
          {
            foreignKeyName: "restaurants_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restaurants_building_id_fkey";
            columns: ["building_id"];
            isOneToOne: false;
            referencedRelation: "buildings";
            referencedColumns: ["id"];
          },
        ]
      >;
      restaurant_categories: Table<
        RestaurantCategoryRow,
        Insert<RestaurantCategoryRow, "restaurant_id" | "category_id">,
        [
          {
            foreignKeyName: "restaurant_categories_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restaurant_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ]
      >;
      profiles: Table<ProfileRow, Insert<ProfileRow, "id">>;
      user_restaurants: Table<
        UserRestaurantRow,
        Insert<UserRestaurantRow, "restaurant_id">,
        [
          {
            foreignKeyName: "user_restaurants_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ]
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      restaurants_near: {
        Args: { lat: number; lng: number; radius_m?: number };
        Returns: RestaurantRow[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
