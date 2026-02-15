import { CATEGORIES, SEASONS } from "../categories.ts";
import type { CategoryType } from "../categories.ts";

export type AnalysisResult = {
  item: string;
  category: CategoryType;
  color: string[];
  brand: string | null;
  season: string[];
  materials: string[];
};

const PROMPT = `You are a fashion expert. Analyze this clothing/accessory photo and return a JSON object with these fields:
- "item": short name (e.g. "Oxford shirt", "Desert boots")
- "category": one of [${Object.keys(CATEGORIES).join(", ")}]
- "color": array of colors (e.g. ["navy", "white"])
- "brand": brand name if visible, otherwise null
- "season": array of applicable seasons from [${SEASONS.join(", ")}]
- "materials": array of likely materials (e.g. ["cotton", "linen"])

Return ONLY valid JSON, no markdown fences.`;

const MODELS = [
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
];

async function toDataUrl(source: File | string): Promise<string> {
  if (typeof source === "string") {
    const res = await fetch(source);
    const blob = await res.blob();
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    const mime = blob.type || "image/jpeg";
    return `data:${mime};base64,${btoa(binary)}`;
  }
  const buf = await source.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const mime = source.type || "image/jpeg";
  return `data:${mime};base64,${btoa(binary)}`;
}

async function callModel(
  model: string,
  dataUrl: string,
  apiKey: string,
): Promise<AnalysisResult> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 512,
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
  return JSON.parse(cleaned) as AnalysisResult;
}

export async function analyzePhoto(
  source: File | string,
  apiKey: string,
): Promise<AnalysisResult> {
  const dataUrl = await toDataUrl(source);

  for (const model of MODELS) {
    try {
      return await callModel(model, dataUrl, apiKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.startsWith("429:") && model !== MODELS[MODELS.length - 1]) {
        continue;
      }
      if (msg.startsWith("429:")) {
        throw new Error("All models rate-limited. Try again in a minute.");
      }
      throw err;
    }
  }

  throw new Error("No models available");
}
