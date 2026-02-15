import { useEffect, useState } from "react";
import { CATEGORIES, CATEGORY_ORDER, SEASONS } from "../categories.ts";
import type { CategoryType } from "../categories.ts";
import type { WardrobeItem } from "../types.ts";
import { PhotoUpload } from "./photo-upload.tsx";
import { analyzePhoto } from "../ai/analyze-photo.ts";
import { getGeminiKey } from "../firebase-db.ts";
import clsx from "clsx";

type Props = {
  defaultValues?: Partial<WardrobeItem> & { photo?: string | null };
  onSubmit: (data: WardrobeItem, photoFile: File | null) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitLabel?: string;
};

export function ItemForm({
  defaultValues,
  onSubmit,
  onDelete,
  submitLabel = "Save",
}: Props) {
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [aiValues, setAiValues] = useState<Partial<WardrobeItem> | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(
    defaultValues?.season ?? [...SEASONS],
  );

  const merged = { ...defaultValues, ...aiValues };

  useEffect(() => {
    setAiValues(null);
    setAiError(null);
  }, [photoFile]);

  function toggleSeason(s: string) {
    setSelectedSeasons((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  async function handleAnalyze() {
    if (!photoFile) return;
    setAnalyzing(true);
    setAiError(null);
    try {
      const key = await getGeminiKey();
      if (!key) {
        setAiError("Add Gemini API key in Settings");
        return;
      }
      const result = await analyzePhoto(photoFile, key);
      setAiValues(result);
      if (result.season) setSelectedSeasons(result.season);
      setFormKey((k) => k + 1);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const data: WardrobeItem = {
      item: (fd.get("item") as string).trim(),
      color: (fd.get("color") as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      brand: (fd.get("brand") as string).trim() || null,
      season: selectedSeasons,
      size: (fd.get("size") as string).trim() || null,
      materials: (fd.get("materials") as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      sku: (fd.get("sku") as string).trim() || null,
      photo: defaultValues?.photo ?? null,
      link: (fd.get("link") as string).trim() || null,
      category: fd.get("category") as CategoryType,
    };

    try {
      await onSubmit(data, photoFile);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PhotoUpload
        currentUrl={defaultValues?.photo}
        onSelect={setPhotoFile}
      />

      {photoFile && (
        <div>
          <button
            type="button"
            disabled={analyzing}
            onClick={handleAnalyze}
            className="px-4 py-2 rounded-lg border border-brand text-brand text-sm font-medium hover:bg-brand/5 disabled:opacity-50 transition-colors"
          >
            {analyzing ? "Analyzing..." : "Analyze with AI"}
          </button>
          {aiError && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {aiError}
            </p>
          )}
        </div>
      )}

      <div key={formKey} className="grid grid-cols-2 gap-3">
        <label className="col-span-2">
          <span className="text-xs text-muted block mb-1">Item name</span>
          <input
            name="item"
            required
            defaultValue={merged?.item}
            className="w-full section px-3 py-2 text-sm"
            placeholder="Button-down check shirt"
          />
        </label>

        <label>
          <span className="text-xs text-muted block mb-1">Brand</span>
          <input
            name="brand"
            defaultValue={merged?.brand ?? ""}
            className="w-full section px-3 py-2 text-sm"
            placeholder="GANT"
          />
        </label>

        <label>
          <span className="text-xs text-muted block mb-1">
            Color (comma-separated)
          </span>
          <input
            name="color"
            required
            defaultValue={merged?.color?.join(", ")}
            className="w-full section px-3 py-2 text-sm"
            placeholder="navy, white"
          />
        </label>

        <label>
          <span className="text-xs text-muted block mb-1">Category</span>
          <select
            name="category"
            required
            defaultValue={merged?.category ?? "shirts"}
            className="w-full section px-3 py-2 text-sm"
          >
            {CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORIES[cat]}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="col-span-2">
          <legend className="text-xs text-muted mb-1">Season</legend>
          <div className="flex flex-wrap gap-1.5">
            {SEASONS.map((s) => (
              <label key={s}>
                <input
                  type="checkbox"
                  checked={selectedSeasons.includes(s)}
                  onChange={() => toggleSeason(s)}
                  className="sr-only"
                />
                <span
                  className={clsx(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer select-none",
                    selectedSeasons.includes(s)
                      ? "bg-brand text-on-accent border-brand"
                      : "bg-transparent text-muted border-border hover:border-muted",
                  )}
                >
                  {s}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          <span className="text-xs text-muted block mb-1">Size</span>
          <input
            name="size"
            defaultValue={merged?.size ?? ""}
            className="w-full section px-3 py-2 text-sm"
            placeholder="M"
          />
        </label>

        <label>
          <span className="text-xs text-muted block mb-1">SKU</span>
          <input
            name="sku"
            defaultValue={merged?.sku ?? ""}
            className="w-full section px-3 py-2 text-sm"
            placeholder="M3600"
          />
        </label>

        <label className="col-span-2">
          <span className="text-xs text-muted block mb-1">
            Materials (comma-separated)
          </span>
          <input
            name="materials"
            defaultValue={merged?.materials?.join(", ") ?? ""}
            className="w-full section px-3 py-2 text-sm"
            placeholder="cotton, linen"
          />
        </label>

        <label className="col-span-2">
          <span className="text-xs text-muted block mb-1">Link</span>
          <input
            name="link"
            type="url"
            defaultValue={merged?.link ?? ""}
            className="w-full section px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-brand text-on-accent font-medium text-sm hover:bg-brand-dark disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : submitLabel}
        </button>

        {onDelete && (
          <button
            type="button"
            disabled={saving}
            className="px-5 py-2 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
            onClick={async () => {
              if (confirm("Delete this item?")) {
                setSaving(true);
                try {
                  await onDelete();
                } finally {
                  setSaving(false);
                }
              }
            }}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
