import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExploreView } from "@/components/explore/ExploreView";
import { siteConfig } from "@/config/site";
import { getCatalog } from "@/lib/catalog/repository";

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return catalog.areas.map((a) => ({ area: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/explore/[area]">): Promise<Metadata> {
  const { area: slug } = await params;
  const area = (await getCatalog()).areas.find((a) => a.slug === slug);
  if (!area) return {};
  return {
    title: `${area.name} restaurant map`,
    description: `How much of ${area.name} have you tasted? Track the restaurants you've visited on ${siteConfig.name}.`,
  };
}

export default async function AreaPage({ params }: PageProps<"/explore/[area]">) {
  const { area: slug } = await params;
  const catalog = await getCatalog();
  if (!catalog.areas.some((a) => a.slug === slug)) notFound();
  return <ExploreView areaSlug={slug} />;
}
