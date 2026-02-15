export const CATEGORIES = {
  tops: ["shirts", "polos", "t-shirts"],
  knitwear: ["sweaters", "cardigans", "vests"],
  outerwear: ["overshirts", "blazers", "jackets", "coats"],
  bottoms: ["jeans", "trousers", "shorts"],
  shoes: ["sneakers", "boots", "loafers", "sandals"],
  bags: ["backpacks", "crossbody", "totes"],
  accessories: ["watches", "headwear", "scarves", "eyewear", "wallets", "belts"],
} as const;

export type CategoryType = keyof typeof CATEGORIES;
export const CATEGORY_ORDER = Object.keys(CATEGORIES) as CategoryType[];

export function categoryLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export function categoryOf(subcategory: string): CategoryType {
  for (const [cat, subs] of Object.entries(CATEGORIES)) {
    if ((subs as readonly string[]).includes(subcategory)) return cat as CategoryType;
  }
  return "tops";
}

export const SEASONS = [
  "spring",
  "summer",
  "fall",
  "winter",
] as const;

export type Season = (typeof SEASONS)[number];
