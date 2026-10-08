import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExploreSkeleton } from "@/components/explore/ExploreSkeleton";
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

export default function AreaPage({ params }: PageProps<"/explore/[area]">) {
  // The area comes from the URL, so it streams in behind a boundary; the
  // skeleton (header + map placeholder) shows instantly on navigation.
  return (
    <Suspense fallback={<ExploreSkeleton />}>
      <Area params={params} />
    </Suspense>
  );
}

async function Area({ params }: { params: PageProps<"/explore/[area]">["params"] }) {
  const { area: slug } = await params;
  const catalog = await getCatalog();
  if (!catalog.areas.some((a) => a.slug === slug)) notFound();
  return <ExploreView areaSlug={slug} />;
}
