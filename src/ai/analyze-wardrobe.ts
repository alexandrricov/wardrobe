import type { ComputedInsights, StyleTwin } from "../pages/insights/types.ts";
import type { UserProfile } from "../firebase-db.ts";
import { callWithFallback } from "./call-model.ts";

export type WardrobeAnalysis = {
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

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function buildPrompt(stats: ComputedInsights, profile: UserProfile): string {
  const cats = stats.categoryDistribution
    .map((c) => {
      const subs = c.subcategories.map((s) => `${s.name} ×${s.count}`).join(", ");
      return `${c.category}: ${c.count} (${c.percentage}%)${subs ? ` [${subs}]` : ""}`;
    })
    .join("\n");

  const sizes = stats.sizesByCategory
    .map((s) => `${s.category}: ${s.sizes.map((sz) => `${sz.size} ×${sz.count}`).join(", ")}`)
    .join("\n");

  const colors = stats.topColors
    .map((c) => `${c.color} (${c.count})`)
    .join(", ");

  const seasons = stats.seasonCoverage
    .map((s) => `${s.season}: ${s.count} items (${s.percentage}%)`)
    .join("\n");

  const brands = stats.topBrands
    .map((b) => `${b.brand} (${b.count})`)
    .join(", ");

  const materials = stats.topMaterials
    .map((m) => `${m.material} (${m.count})`)
    .join(", ");

  const profileParts: string[] = [];
  if (profile.gender) profileParts.push(`Gender: ${profile.gender}`);
  if (profile.birthDate) profileParts.push(`Age: ${calcAge(profile.birthDate)}`);
  if (profile.styleGoal) profileParts.push(`Desired style: ${profile.styleGoal}`);

  const profileLine = profileParts.length > 0
    ? `\nUSER PROFILE:\n${profileParts.join(" | ")}\nTailor ALL advice, recommendations, and celebrity comparisons to this person. Compare their current wardrobe against their desired style and suggest how to bridge the gap.\n`
    : "";

  return `You are a fashion consultant. Analyze this wardrobe data and provide actionable insights.
${profileLine}
WARDROBE SUMMARY (${stats.totalItems} total items, ${stats.categoriesUsed} categories):

CATEGORY DISTRIBUTION:
${cats}

SIZES BY CATEGORY:
${sizes || "No size data"}

TOP COLORS: ${colors || "No data"}
Color diversity: ${stats.colorDiversity}

SEASON COVERAGE:
${seasons}
All-season items: ${stats.allSeasonCount}
${stats.seasonGaps.length > 0 ? `Low coverage: ${stats.seasonGaps.join(", ")}` : ""}

TOP BRANDS: ${brands || "No data"}
TOP MATERIALS: ${materials || "No data"}

Respond with ONLY valid JSON, no markdown fences:
{
  "styleProfile": "1-2 sentence description of the dominant style(s)",
  "gaps": ["specific gap 1", "specific gap 2", "specific gap 3"],
  "versatility": "1 sentence about outfit-making potential",
  "colorAnalysis": "1 sentence about color palette coherence and suggestions",
  "seasonReadiness": {
    "spring": "1 sentence",
    "summer": "1 sentence",
    "fall": "1 sentence",
    "winter": "1 sentence"
  },
  "recommendations": ["specific purchase recommendation 1", "specific purchase recommendation 2", "specific purchase recommendation 3"],
  "fashionTips": ["actionable tip on how to dress better 1", "tip 2", "tip 3"],
  "styleTwins": [
    { "name": "Celebrity full name", "why": "1 sentence why their style matches" },
    { "name": "Another celebrity", "why": "1 sentence why" }
  ]
}`;
}

type AIRawResponse = {
  styleProfile: string;
  gaps: string[];
  versatility: string;
  colorAnalysis: string;
  seasonReadiness: Record<string, string>;
  recommendations: string[];
  fashionTips: string[];
  styleTwins: { name: string; why: string }[];
};

export async function analyzeWardrobe(
  stats: ComputedInsights,
  apiKey: string,
  profile: UserProfile,
): Promise<WardrobeAnalysis> {
  const prompt = buildPrompt(stats, profile);
  const result = await callWithFallback<AIRawResponse>(prompt, apiKey, 1500);

  return {
    itemCount: stats.totalItems,
    styleProfile: result.styleProfile ?? "",
    gaps: Array.isArray(result.gaps) ? result.gaps : [],
    versatility: result.versatility ?? "",
    colorAnalysis: result.colorAnalysis ?? "",
    seasonReadiness: result.seasonReadiness ?? {},
    recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
    fashionTips: Array.isArray(result.fashionTips) ? result.fashionTips : [],
    styleTwins: Array.isArray(result.styleTwins) ? result.styleTwins : [],
  };
}
