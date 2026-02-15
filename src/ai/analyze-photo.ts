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

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export async function analyzePhoto(
  file: File,
  apiKey: string,
): Promise<AnalysisResult> {
  const base64 = await fileToBase64(file);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              {
                inline_data: {
                  mime_type: file.type || "image/jpeg",
                  data: base64,
                },
              },
            ],
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error: ${text}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Empty response from Gemini");

  const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned) as AnalysisResult;
}
