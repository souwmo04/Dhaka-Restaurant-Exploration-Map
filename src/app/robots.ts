import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/** Lets search engines index the maps; keeps private pages out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/auth/", "/login"] },
    sitemap: new URL("/sitemap.xml", siteConfig.url).toString(),
  };
}
