import { CATEGORY_ORDER, SEASONS, categoryLabel } from "../../categories.ts";
import type { ClosetItemDB } from "../../types.ts";
import type {
  ComputedInsights,
  CategoryStat,
  SizeByCategoryStat,
  ColorStat,
  SeasonStat,
  BrandStat,
  MaterialStat,
} from "./types.ts";

function topN<T extends { count: number }>(arr: T[], n: number): T[] {
  return [...arr].sort((a, b) => b.count - a.count).slice(0, n);
}

function countMap(values: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const v of values) {
    const key = v.trim().toLowerCase();
    if (key) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function computeCategories(items: ClosetItemDB[]): CategoryStat[] {
  const total = items.length || 1;
  const catMap = new Map<string, ClosetItemDB[]>();

  for (const item of items) {
    const list = catMap.get(item.category) ?? [];
    list.push(item);
    catMap.set(item.category, list);
  }

  return CATEGORY_ORDER
    .filter((cat) => catMap.has(cat))
    .map((cat) => {
      const catItems = catMap.get(cat)!;
      const subMap = countMap(
        catItems.map((i) => i.subcategory ?? "other"),
      );

      return {
        category: categoryLabel(cat),
        count: catItems.length,
        percentage: Math.round((catItems.length / total) * 100),
        subcategories: [...subMap.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
      };
    });
}

function computeSizesByCategory(items: ClosetItemDB[]): SizeByCategoryStat[] {
  const catMap = new Map<string, string[]>();

  for (const item of items) {
    if (!item.size) continue;
    const list = catMap.get(item.category) ?? [];
    list.push(item.size.trim());
    catMap.set(item.category, list);
  }

  return CATEGORY_ORDER
    .filter((cat) => catMap.has(cat))
    .map((cat) => {
      const sizes = catMap.get(cat)!;
      const sizeMap = new Map<string, number>();
      for (const s of sizes) {
        const key = s.toUpperCase();
        sizeMap.set(key, (sizeMap.get(key) ?? 0) + 1);
      }

      const sorted = [...sizeMap.entries()]
        .map(([size, count]) => ({ size, count }))
        .sort((a, b) => b.count - a.count);

      return {
        category: categoryLabel(cat),
        sizes: sorted,
        mostCommon: sorted[0]?.size ?? null,
      };
    });
}

function computeColors(items: ClosetItemDB[]): {
  topColors: ColorStat[];
  colorDiversity: number;
} {
  const all = items.flatMap((i) => i.color);
  const map = countMap(all);
  const total = items.length || 1;
  const unique = map.size;

  return {
    topColors: topN(
      [...map.entries()].map(([color, count]) => ({ color, count })),
      10,
    ),
    colorDiversity: Math.round((unique / total) * 100) / 100,
  };
}

function computeSeasons(items: ClosetItemDB[]): {
  seasonCoverage: SeasonStat[];
  allSeasonCount: number;
  seasonGaps: string[];
} {
  const total = items.length || 1;
  const seasonMap = new Map<string, number>();
  let allSeasonCount = 0;

  for (const season of SEASONS) {
    seasonMap.set(season, 0);
  }

  for (const item of items) {
    const seasons = item.season.map((s) => s.toLowerCase());
    if (SEASONS.every((s) => seasons.includes(s))) {
      allSeasonCount++;
    }
    for (const s of seasons) {
      if (seasonMap.has(s)) {
        seasonMap.set(s, seasonMap.get(s)! + 1);
      }
    }
  }

  const seasonCoverage: SeasonStat[] = SEASONS.map((s) => ({
    season: s,
    count: seasonMap.get(s) ?? 0,
    percentage: Math.round(((seasonMap.get(s) ?? 0) / total) * 100),
  }));

  const seasonGaps = seasonCoverage
    .filter((s) => s.percentage < 10)
    .map((s) => s.season);

  return { seasonCoverage, allSeasonCount, seasonGaps };
}

function computeBrands(items: ClosetItemDB[]): BrandStat[] {
  const brands = items
    .map((i) => i.brand?.trim())
    .filter((b): b is string => !!b);
  const map = countMap(brands);
  return topN(
    [...map.entries()].map(([brand, count]) => ({ brand, count })),
    5,
  );
}

function computeMaterials(items: ClosetItemDB[]): MaterialStat[] {
  const all = items.flatMap((i) => i.materials);
  const map = countMap(all);
  return topN(
    [...map.entries()].map(([material, count]) => ({ material, count })),
    8,
  );
}

export function computeAllInsights(items: ClosetItemDB[]): ComputedInsights {
  const categoriesUsed = new Set(items.map((i) => i.category)).size;
  const photoCoverage = items.length
    ? Math.round((items.filter((i) => i.photo).length / items.length) * 100)
    : 0;

  const { topColors, colorDiversity } = computeColors(items);
  const { seasonCoverage, allSeasonCount, seasonGaps } = computeSeasons(items);

  return {
    totalItems: items.length,
    categoriesUsed,
    photoCoverage,
    categoryDistribution: computeCategories(items),
    sizesByCategory: computeSizesByCategory(items),
    topColors,
    colorDiversity,
    seasonCoverage,
    allSeasonCount,
    seasonGaps,
    topBrands: computeBrands(items),
    topMaterials: computeMaterials(items),
  };
}
