import { ExploreView } from "@/components/explore/ExploreView";
import { getCatalog } from "@/lib/catalog/repository";

/** Home is the map: the first active area (Uttara in V1). */
export default async function HomePage() {
  const catalog = await getCatalog();
  const area = catalog.areas.find((a) => a.active) ?? catalog.areas[0];
  return <ExploreView areaSlug={area.slug} />;
}
