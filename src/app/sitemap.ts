import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getCatalog } from "@/lib/catalog/repository";

/** Home, dashboard and every explorable area map. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const activeAreas = (await getCatalog()).areas.filter((a) => a.active);
  const at = (path: string) => new URL(path, siteConfig.url).toString();
  return [
    { url: at("/"), changeFrequency: "weekly", priority: 1 },
    ...activeAreas.map((a) => ({ url: at(`/explore/${a.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: at("/dashboard"), changeFrequency: "monthly", priority: 0.4 },
  ];
}
