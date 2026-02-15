export const CATEGORIES = {
  shirts: "Shirts",
  polos: "Polos",
  tshirts: "T-shirts",
  knitwear: "Knitwear",
  overshirts: "Overshirts",
  blazers: "Blazers",
  jackets: "Jackets",
  jeans: "Jeans",
  trousers: "Trousers",
  shoes: "Shoes",
  watches: "Watches",
  headwear: "Headwear",
  scarves: "Scarves",
  eyewear: "Eyewear",
  wallets: "Wallets",
  bags: "Bags",
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
