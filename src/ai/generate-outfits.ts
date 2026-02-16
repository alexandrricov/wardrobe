import type { ClosetItemDB } from "../types.ts";
import type { UserProfile } from "../firebase-db.ts";
import { callWithFallback } from "./call-model.ts";

export type GeneratedOutfit = {
  itemIds: string[];
  occasion: string;
  why: string;
};

export type OutfitContext = {
  season?: string;
  weather?: string;
};

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function buildPrompt(
  items: ClosetItemDB[],
  profile: UserProfile,
  context: OutfitContext,
): string {
  const itemList = items.map((item) => ({
    id: item.id,
    name: item.item,
    category: item.category,
    subcategory: item.subcategory,
    colors: item.color,
    season: item.season,
    brand: item.brand,
  }));

  const profileParts: string[] = [];
  if (profile.gender) profileParts.push(`Gender: ${profile.gender}`);
  if (profile.birthDate) profileParts.push(`Age: ${calcAge(profile.birthDate)}`);
  if (profile.styleGoal) profileParts.push(`Desired style: ${profile.styleGoal}`);

  const profileLine = profileParts.length > 0
    ? `\nUSER PROFILE:\n${profileParts.join(" | ")}\nTailor all outfit suggestions to this person.\n`
    : "";

  const contextParts: string[] = [];
  if (context.weather) contextParts.push(`Weather: ${context.weather}`);
  else if (context.season) contextParts.push(`Season: ${context.season}`);

  const contextLine = contextParts.length > 0
    ? `\nCONTEXT:\n${contextParts.join("\n")}\n`
    : "";

  return `You are a fashion stylist. Create 5 outfit combinations from these wardrobe items.
${profileLine}${contextLine}
ITEMS:
${JSON.stringify(itemList)}

Rules:
- Each outfit must include at least a top + bottom (or equivalent full outfit)
- Add shoes and outerwear/accessories when they complement the outfit
- Consider color coordination and style coherence
- Consider the weather/season when choosing layers and outerwear
- Prioritize items appropriate for current conditions
- Each item can appear in multiple outfits
- Reference items ONLY by their exact "id" field from the list above
- Make outfits for different occasions (casual, smart casual, weekend, etc.)

Respond with ONLY valid JSON, no markdown fences:
{
  "outfits": [
    {
      "itemIds": ["exact-id-1", "exact-id-2", "exact-id-3"],
      "occasion": "Short occasion label",
      "why": "1 sentence explaining why these items work together"
    }
  ]
}`;
}

type AIOutfitResponse = {
  outfits: { itemIds: string[]; occasion: string; why: string }[];
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

  const itemIds = new Set(items.map((i) => i.id));
  return result.outfits
    .filter((o) => Array.isArray(o.itemIds) && o.itemIds.length >= 2)
    .map((o) => ({
      itemIds: o.itemIds.filter((id) => itemIds.has(id)),
      occasion: o.occasion ?? "",
      why: o.why ?? "",
    }))
    .filter((o) => o.itemIds.length >= 2);
}
