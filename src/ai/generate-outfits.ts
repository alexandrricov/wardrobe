import type { ClosetItemDB } from "../types.ts";
import type { UserProfile } from "../firebase-db.ts";
import { callWithFallback } from "./call-model.ts";
import { SLOT_DEFS, EXTRA_CATEGORIES, type SlotId } from "../outfit-slots.ts";

/* ── Public types ─────────────────────────────────────── */

export type OutfitSlots = Partial<Record<SlotId, string>>;

export type GeneratedOutfit = {
  slots: OutfitSlots;
  extras: string[];
  occasion: string;
  why: string;
};

export type OutfitContext = {
  season?: string;
  weather?: { temp: number; description: string; label: string };
};

/* ── Conditions derived from context ──────────────────── */

type Conditions = {
  season: string;
  isSunny: boolean;
  isHot: boolean;
  isCold: boolean;
  contextLabel: string;
};

function deriveConditions(context: OutfitContext): Conditions {
  if (context.weather) {
    const { temp, description, label } = context.weather;
    const isSunny = /clear|partly cloudy/i.test(description);
    const season =
      temp >= 25 ? "summer" : temp >= 15 ? "spring" : temp >= 5 ? "fall" : "winter";
    return { season, isSunny, isHot: temp >= 25, isCold: temp <= 5, contextLabel: label };
  }
  const season = context.season ?? "spring";
  return {
    season,
    isSunny: season === "summer" || season === "spring",
    isHot: season === "summer",
    isCold: season === "winter",
    contextLabel: `Season: ${season}`,
  };
}

/* ── Helpers ──────────────────────────────────────────── */

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

type ItemEntry = { id: string; label: string; offSeason: boolean };

function formatItem(item: ClosetItemDB, season: string): ItemEntry {
  const sub = item.subcategory ?? item.category;
  const colors = item.color.join("/");
  const label = `${item.item} (${sub}, ${colors})`;
  const offSeason =
    item.season.length > 0 && !item.season.includes(season);
  return { id: item.id, label, offSeason };
}

function formatEntries(entries: ItemEntry[]): string {
  return entries
    .map((e) => `  - ${e.id}: ${e.label}${e.offSeason ? " [off-season]" : ""}`)
    .join("\n");
}

/* ── Prompt builder ───────────────────────────────────── */

function buildPrompt(
  items: ClosetItemDB[],
  profile: UserProfile,
  context: OutfitContext,
): string {
  const cond = deriveConditions(context);
  const byCategory = Map.groupBy(items, (i) => i.category);

  // ── Body slots ──
  const slotSections: string[] = [];

  for (const def of SLOT_DEFS) {
    // Skip outerwear and layer in hot weather
    if (cond.isHot && (def.id === "outerwear" || def.id === "layer")) continue;

    let pool = byCategory.get(def.category) ?? [];

    // Summer bottoms: only shorts + summer-tagged
    if (cond.isHot && def.id === "bottom") {
      const filtered = pool.filter(
        (i) =>
          i.subcategory === "shorts" ||
          i.season.includes("summer") ||
          i.season.length === 0,
      );
      if (filtered.length > 0) pool = filtered;
    }

    if (pool.length === 0) continue;

    const entries = pool.map((i) => formatItem(i, cond.season));
    const required = def.id === "top" || def.id === "bottom" || def.id === "shoes";
    const tag = required ? "required" : cond.isCold && def.id === "outerwear" ? "required — cold weather" : "optional";

    slotSections.push(`${def.label.toUpperCase()} (${tag} — pick one):\n${formatEntries(entries)}`);
  }

  // ── Accessories (extras) ──
  const extraItems: ClosetItemDB[] = [];
  for (const cat of EXTRA_CATEGORIES) {
    const pool = byCategory.get(cat) ?? [];
    for (const item of pool) {
      // Skip eyewear when not sunny
      if (item.subcategory === "eyewear" && !cond.isSunny) continue;
      extraItems.push(item);
    }
  }

  let extrasSection = "";
  if (extraItems.length > 0) {
    const entries = extraItems.map((i) => formatItem(i, cond.season));
    const rules = [
      "Always include a watch if available",
      "Always include a bag if available",
      cond.isSunny ? "Include eyewear (sunny conditions)" : null,
      "Add headwear, scarves, belts when they complement the outfit",
    ]
      .filter(Boolean)
      .join(". ");

    extrasSection = `\nACCESSORIES (pick any that fit — ${rules}):\n${formatEntries(entries)}`;
  }

  // ── Profile ──
  const profileParts: string[] = [];
  if (profile.gender) profileParts.push(`Gender: ${profile.gender}`);
  if (profile.birthDate) profileParts.push(`Age: ${calcAge(profile.birthDate)}`);
  if (profile.styleGoal) profileParts.push(`Desired style: ${profile.styleGoal}`);
  const profileBlock = profileParts.length > 0
    ? `\nUSER PROFILE:\n${profileParts.join(" | ")}\nTailor all outfits to this person.\n`
    : "";

  return `You are a fashion stylist. Create 5 outfit combinations from the wardrobe items below.
${profileBlock}
CONTEXT: ${cond.contextLabel}

WARDROBE (grouped by slot):

${slotSections.join("\n\n")}
${extrasSection}

Rules:
- Follow each group's instruction (required slots MUST be filled)
- Prefer items without [off-season] tag, but off-season items may be used if they fit
- Consider color coordination and style coherence
- "slots" maps slot names to item IDs; "extras" is a list of accessory IDs
- Reference items ONLY by their exact "id" from the list
- Make outfits for different occasions (casual, smart casual, weekend, etc.)
- Each item can appear in multiple outfits

Respond with ONLY valid JSON, no markdown fences:
{
  "outfits": [
    {
      "slots": { "top": "id", "bottom": "id", "shoes": "id" },
      "extras": ["accessory-id-1", "accessory-id-2"],
      "occasion": "Short occasion label",
      "why": "1 sentence explaining why these items work together"
    }
  ]
}`;
}

/* ── Generate + validate ──────────────────────────────── */

type AIOutfitResponse = {
  outfits: {
    slots: Record<string, string>;
    extras?: string[];
    occasion: string;
    why: string;
  }[];
};

export async function generateOutfits(
  items: ClosetItemDB[],
  apiKey: string,
  profile: UserProfile,
  context: OutfitContext = {},
): Promise<GeneratedOutfit[]> {
  const prompt = buildPrompt(items, profile, context);
  const result = await callWithFallback<AIOutfitResponse>(prompt, apiKey, 2000);

  if (!Array.isArray(result.outfits)) return [];

  const validIds = new Set(items.map((i) => i.id));
  const slotIds = new Set(SLOT_DEFS.map((s) => s.id));

  return result.outfits
    .map((o) => {
      const slots: OutfitSlots = {};
      if (o.slots && typeof o.slots === "object") {
        for (const [key, val] of Object.entries(o.slots)) {
          if (slotIds.has(key as SlotId) && validIds.has(val)) {
            slots[key as SlotId] = val;
          }
        }
      }
      const extras = Array.isArray(o.extras)
        ? o.extras.filter((id) => validIds.has(id))
        : [];

      return {
        slots,
        extras,
        occasion: o.occasion ?? "",
        why: o.why ?? "",
      };
    })
    .filter((o) => Object.keys(o.slots).length >= 2);
}
