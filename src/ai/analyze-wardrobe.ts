import type { ComputedInsights, StyleTwin } from "../pages/insights/types.ts";
import type { UserProfile } from "../firebase-db.ts";

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

const MODELS = [
  "deepseek/deepseek-chat-v3.1",
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.3-70b-instruct",
];

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

async function callModel(
  model: string,
  prompt: string,
  apiKey: string,
): Promise<AIRawResponse> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}:${text}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty response from AI");

  const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned) as AIRawResponse;
}

export async function analyzeWardrobe(
  stats: ComputedInsights,
  apiKey: string,
  profile: UserProfile,
): Promise<WardrobeAnalysis> {
  const prompt = buildPrompt(stats, profile);

  for (const model of MODELS) {
    try {
      const result = await callModel(model, prompt, apiKey);
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const retryable = /^(429|404|502|503):/.test(msg);
      if (retryable && model !== MODELS[MODELS.length - 1]) {
        continue;
      }
      if (retryable) {
        throw new Error("All models unavailable. Try again in a minute.");
      }
      throw err;
    }
  }

  throw new Error("No models available");
}
