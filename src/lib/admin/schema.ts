/** Admin restaurant form payload + validation (shared by the form and the server action). */
export type RestaurantInput = {
  id: string | null;
  name: string;
  nameBn: string;
  areaId: string;
  /** Existing building id, "" for none, or "new" with `newBuildingName`. */
  buildingId: string;
  newBuildingName: string;
  latitude: string;
  longitude: string;
  floor: string;
  address: string;
  phone: string;
  website: string;
  categoryIds: string[];
  active: boolean;
};

export type FieldErrors = Partial<Record<keyof RestaurantInput, string>>;

export function validateRestaurantInput(input: RestaurantInput): FieldErrors {
  const errors: FieldErrors = {};
  const lat = Number(input.latitude);
  const lng = Number(input.longitude);
  if (!input.name.trim()) errors.name = "Name is required.";
  if (input.name.length > 120) errors.name = "Keep the name under 120 characters.";
  if (!input.areaId) errors.areaId = "Choose an area.";
  if (input.latitude.trim() === "" || !Number.isFinite(lat) || lat < -90 || lat > 90) errors.latitude = "Enter a latitude, e.g. 23.8686.";
  if (input.longitude.trim() === "" || !Number.isFinite(lng) || lng < -180 || lng > 180) errors.longitude = "Enter a longitude, e.g. 90.3987.";
  if (input.buildingId === "new" && !input.newBuildingName.trim()) errors.newBuildingName = "Name the new building.";
  if (input.website && !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(input.website.trim())) errors.website = "That doesn't look like a web address.";
  if (input.categoryIds.length === 0) errors.categoryIds = "Pick at least one category.";
  return errors;
}
