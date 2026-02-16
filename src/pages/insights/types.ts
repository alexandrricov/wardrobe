import type { Timestamp } from "firebase/firestore";

export type CategoryStat = {
  category: string;
  count: number;
  percentage: number;
  subcategories: { name: string; count: number }[];
};

export type SizeByCategoryStat = {
  category: string;
  sizes: { size: string; count: number }[];
  mostCommon: string | null;
};

export type ColorStat = { color: string; count: number };
export type SeasonStat = { season: string; count: number; percentage: number };
export type BrandStat = { brand: string; count: number };
export type MaterialStat = { material: string; count: number };

export type ComputedInsights = {
  totalItems: number;
  categoriesUsed: number;
  photoCoverage: number;
  categoryDistribution: CategoryStat[];
  sizesByCategory: SizeByCategoryStat[];
  topColors: ColorStat[];
  colorDiversity: number;
  seasonCoverage: SeasonStat[];
  allSeasonCount: number;
  seasonGaps: string[];
  topBrands: BrandStat[];
  topMaterials: MaterialStat[];
};

export type StyleTwin = {
  name: string;
  why: string;
};

export type AIInsightReport = {
  id: string;
  createdAt: Timestamp;
  itemCount: number;
  styleProfile: string;
  gaps: string[];
  versatility: string;
  colorAnalysis: string;
  seasonReadiness: Record<string, string>;
  recommendations: string[];
  fashionTips: string[];
  styleTwins: StyleTwin[];
};
