import { useEffect, useMemo, useState } from "react";
import { subscribeItems } from "../firebase-db.ts";
import { CATEGORY_ORDER, SEASONS, categoryLabel } from "../categories.ts";
import type { CategoryType } from "../categories.ts";
import type { ClosetItemDB } from "../types.ts";
import { ItemCard } from "../components/item-card.tsx";
import { Select } from "../components/select.tsx";

export function Gallery() {
  const [items, setItems] = useState<ClosetItemDB[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryType | "all">("all");
  const [season, setSeason] = useState<string>("all");

  useEffect(() => subscribeItems(setItems), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (season !== "all" && !item.season.includes(season)) return false;
      if (
        q &&
        !item.item.toLowerCase().includes(q) &&
        !item.brand?.toLowerCase().includes(q) &&
        !item.color.some((c) => c.toLowerCase().includes(q))
      )
        return false;
      return true;
    });
  }, [items, search, category, season]);

  const grouped = useMemo(() => {
    const map = new Map<string, ClosetItemDB[]>();
    for (const item of filtered) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [filtered]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-h2">ClosetBook</h1>
        <span className="text-muted text-sm">{filtered.length} items</span>
      </div>

      <input
        type="search"
        placeholder="Search brand, item, color..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full section px-3 py-2 text-sm mb-4"
      />

      <div className="flex gap-3 mb-6">
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value as CategoryType | "all")}
          options={[
            { value: "all", children: "All categories" },
            ...CATEGORY_ORDER.map((cat) => ({
              value: cat,
              children: categoryLabel(cat),
            })),
          ]}
          className="flex-1"
        >
          Category
        </Select>

        <Select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          options={[
            { value: "all", children: "All seasons" },
            ...SEASONS.map((s) => ({ value: s, children: s })),
          ]}
          className="flex-1"
        >
          Season
        </Select>
      </div>

      {/* Items grid by category */}
      {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => (
        <section key={cat} className="mb-8">
          <h2 className="text-h3 mb-3 pb-2 border-b border-border">
            {categoryLabel(cat)}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {grouped.get(cat)!.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}

      {filtered.length === 0 && (
        <p className="text-center text-muted py-16">No items match filters</p>
      )}
    </div>
  );
}
