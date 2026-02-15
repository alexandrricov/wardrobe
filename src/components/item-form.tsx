import { useState } from "react";
import { CATEGORIES, CATEGORY_ORDER, SEASONS } from "../categories.ts";
import type { CategoryType } from "../categories.ts";
import type { WardrobeItem } from "../types.ts";
import { PhotoUpload } from "./photo-upload.tsx";

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const data: WardrobeItem = {
      item: (fd.get("item") as string).trim(),
      color: (fd.get("color") as string).trim(),
      brand: (fd.get("brand") as string).trim(),
      season: fd.get("season") as string,
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

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2">
          <span className="text-xs text-muted block mb-1">Item name</span>
          <input
            name="item"
            required
            defaultValue={defaultValues?.item}
            className="w-full section px-3 py-2 text-sm"
            placeholder="Button-down check shirt"
          />
        </label>

        <label>
          <span className="text-xs text-muted block mb-1">Brand</span>
          <input
            name="brand"
            required
            defaultValue={defaultValues?.brand}
            className="w-full section px-3 py-2 text-sm"
            placeholder="GANT"
          />
        </label>

        <label>
          <span className="text-xs text-muted block mb-1">Color</span>
          <input
            name="color"
            required
            defaultValue={defaultValues?.color}
            className="w-full section px-3 py-2 text-sm"
            placeholder="navy"
          />
        </label>

        <label>
          <span className="text-xs text-muted block mb-1">Category</span>
          <select
            name="category"
            required
            defaultValue={defaultValues?.category ?? "shirts"}
            className="w-full section px-3 py-2 text-sm"
          >
            {CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORIES[cat]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-xs text-muted block mb-1">Season</span>
          <select
            name="season"
            required
            defaultValue={defaultValues?.season ?? "all-season"}
            className="w-full section px-3 py-2 text-sm"
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-xs text-muted block mb-1">Size</span>
          <input
            name="size"
            defaultValue={defaultValues?.size ?? ""}
            className="w-full section px-3 py-2 text-sm"
            placeholder="M"
          />
        </label>

        <label>
          <span className="text-xs text-muted block mb-1">SKU</span>
          <input
            name="sku"
            defaultValue={defaultValues?.sku ?? ""}
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
            defaultValue={defaultValues?.materials?.join(", ") ?? ""}
            className="w-full section px-3 py-2 text-sm"
            placeholder="cotton, linen"
          />
        </label>

        <label className="col-span-2">
          <span className="text-xs text-muted block mb-1">Link</span>
          <input
            name="link"
            type="url"
            defaultValue={defaultValues?.link ?? ""}
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
