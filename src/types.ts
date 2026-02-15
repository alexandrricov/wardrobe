import type { Timestamp } from "firebase/firestore";
import type { CategoryType } from "./categories.ts";

export type WardrobeItem = {
  item: string;
  color: string;
  brand: string;
  season: string;
  size: string | null;
  materials: string[];
  sku: string | null;
  photo: string | null;
  link: string | null;
  category: CategoryType;
};

export type WardrobeItemDB = WardrobeItem & {
  id: string;
  createdAt: Timestamp;
};
