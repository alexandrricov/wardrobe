import type { Timestamp } from "firebase/firestore";
import type { CategoryType } from "./categories.ts";

export type WardrobeItem = {
  item: string;
  color: string[];
  brand: string | null;
  season: string[];
  size: string | null;
  materials: string[];
  sku: string | null;
  photo: string | null;
  link: string | null;
  category: CategoryType;
  subcategory: string | null;
};

export type WardrobeItemDB = WardrobeItem & {
  id: string;
  createdAt: Timestamp;
};
