import type { Area } from "@/types/domain";

export type AreaSection<T extends { area: Area } | Area> = { group: string | null; items: T[] };

const areaOf = <T extends { area: Area } | Area>(item: T): Area => ("area" in item ? item.area : item);

/**
 * Groups areas for display while keeping their sort order: ungrouped areas
 * stay as single entries, and areas sharing a `group` (e.g. the Mirpur maps)
 * are gathered under one heading at the position of the first of them.
 */
export function groupAreas<T extends { area: Area } | Area>(items: T[]): AreaSection<T>[] {
  const sections: AreaSection<T>[] = [];
  const byGroup = new Map<string, AreaSection<T>>();
  for (const item of items) {
    const group = areaOf(item).group;
    if (!group) {
      sections.push({ group: null, items: [item] });
      continue;
    }
    let section = byGroup.get(group);
    if (!section) {
      section = { group, items: [] };
      byGroup.set(group, section);
      sections.push(section);
    }
    section.items.push(item);
  }
  return sections;
}
