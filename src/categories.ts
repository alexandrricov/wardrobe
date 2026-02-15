export const CATEGORIES = {
  tops: "Tops",
  knitwear: "Knitwear",
  outerwear: "Outerwear",
  bottoms: "Bottoms",
  shoes: "Shoes",
  bags: "Bags",
  accessories: "Accessories",
} as const;

export type CategoryType = keyof typeof CATEGORIES;
export const CATEGORY_ORDER = Object.keys(CATEGORIES) as CategoryType[];

export const SEASONS = [
  "spring",
  "summer",
  "fall",
  "winter",
] as const;

export type Season = (typeof SEASONS)[number];
