export const MODELS = [
  "deepseek/deepseek-chat-v3.1",
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.3-70b-instruct",
];

export async function callModel<T>(
  model: string,
  prompt: string,
  apiKey: string,
  maxTokens: number,
): Promise<T> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
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
  return JSON.parse(cleaned) as T;
}

export async function callWithFallback<T>(
  prompt: string,
  apiKey: string,
  maxTokens: number,
): Promise<T> {
  for (const model of MODELS) {
    try {
      return await callModel<T>(model, prompt, apiKey, maxTokens);
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
