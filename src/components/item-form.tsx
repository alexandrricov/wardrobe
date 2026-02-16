import { useEffect, useState } from "react";
import { CATEGORIES, CATEGORY_ORDER, SEASONS, categoryLabel, categoryOf, type CategoryType } from "../categories.ts";
import type { ClosetItem } from "../types.ts";
import { PhotoUpload } from "./photo-upload.tsx";
import { analyzePhoto } from "../ai/analyze-photo.ts";
import { getAiApiKey } from "../firebase-db.ts";
import { Button } from "./action.tsx";
import clsx from "clsx";

type Props = {
  defaultValues?: Partial<ClosetItem> & { photo?: string | null };
  onSubmit: (data: ClosetItem, photoFile: File | null) => Promise<void>;
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
  const [aiValues, setAiValues] = useState<Partial<ClosetItem> | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(
    defaultValues?.season ?? [...SEASONS],
  );
  const [selectedValue, setSelectedValue] = useState(
    defaultValues?.subcategory ?? defaultValues?.category ?? "tops",
  );
  const isParent = (CATEGORY_ORDER as string[]).includes(selectedValue);
  const selectedCategory = isParent ? (selectedValue as CategoryType) : categoryOf(selectedValue);
  const selectedSubcategory = isParent ? null : selectedValue;

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

  const photoSource = photoFile ?? defaultValues?.photo ?? null;

  async function handleAnalyze() {
    if (!photoSource) return;
    setAnalyzing(true);
    setAiError(null);
    try {
      const key = await getAiApiKey();
      if (!key) {
        setAiError("Add OpenRouter API key in Settings");
        return;
      }
      const result = await analyzePhoto(photoSource, key);
      setAiValues(result);
      if (result.season) setSelectedSeasons(result.season);
      if (result.subcategory) {
        setSelectedValue(result.subcategory);
      } else if (result.category) {
        setSelectedValue(result.category);
      }
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
    const data: ClosetItem = {
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
      category: selectedCategory,
      subcategory: selectedSubcategory,
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

      {photoSource && (
        <div>
          <Button
            type="button"
            variation="secondary"
            size="medium"
            disabled={analyzing}
            onClick={handleAnalyze}
          >
            {analyzing ? "Analyzing..." : "Analyze with AI"}
          </Button>
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
            value={selectedValue}
            onChange={(e) => setSelectedValue(e.target.value)}
            className="w-full section px-3 py-2 text-sm"
          >
            {CATEGORY_ORDER.map((cat) => (
              <optgroup key={cat} label={categoryLabel(cat)}>
                <option value={cat}>—</option>
                {CATEGORIES[cat].map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label>
          <span className="text-xs text-muted block mb-1">Size</span>
          <input
            name="size"
            defaultValue={merged?.size ?? ""}
            className="w-full section px-3 py-2 text-sm"
            placeholder="M"
          />
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
          <span className="text-xs text-muted block mb-1">SKU</span>
          <input
            name="sku"
            defaultValue={merged?.sku ?? ""}
            className="w-full section px-3 py-2 text-sm"
            placeholder="M3600"
          />
        </label>

        <label>
          <span className="text-xs text-muted block mb-1">Materials</span>
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
        <Button
          type="submit"
          variation="primary"
          size="medium"
          disabled={saving}
        >
          {saving ? "Saving..." : submitLabel}
        </Button>

        {onDelete && (
          <button
            type="button"
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer"
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
