import type { CategoryType } from "./categories.ts";

/* ── Body slots (fixed grid) ──────────────────────────── */

export const SLOT_DEFS = [
  { id: "top", label: "Top", category: "tops" as CategoryType },
  { id: "layer", label: "Layer", category: "knitwear" as CategoryType },
  { id: "outerwear", label: "Outerwear", category: "outerwear" as CategoryType },
  { id: "bottom", label: "Bottom", category: "bottoms" as CategoryType },
  { id: "shoes", label: "Shoes", category: "shoes" as CategoryType },
] as const;

export type SlotId = (typeof SLOT_DEFS)[number]["id"];
export const SLOT_IDS = SLOT_DEFS.map((s) => s.id);

export function slotLabel(id: SlotId): string {
  return SLOT_DEFS.find((s) => s.id === id)!.label;
}

export function slotCategory(id: SlotId): CategoryType {
  return SLOT_DEFS.find((s) => s.id === id)!.category;
}

/* ── Extras (accessories + bags) ──────────────────────── */

/** Categories whose items go into the extras list */
export const EXTRA_CATEGORIES: CategoryType[] = ["bags", "accessories"];
