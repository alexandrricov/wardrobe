import { useEffect, useMemo, useState } from "react";
import { subscribeItems } from "../firebase-db.ts";
import { CATEGORIES, CATEGORY_ORDER, SEASONS } from "../categories.ts";
import type { CategoryType } from "../categories.ts";
import type { WardrobeItemDB } from "../types.ts";
import { ItemCard } from "../components/item-card.tsx";
import clsx from "clsx";

export function Gallery() {
  const [items, setItems] = useState<WardrobeItemDB[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryType | "all">("all");
  const [season, setSeason] = useState<string>("all");

  useEffect(() => subscribeItems(setItems), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (season !== "all" && item.season !== season) return false;
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
    const map = new Map<string, WardrobeItemDB[]>();
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
        <h1 className="text-h2">Wardrobe</h1>
        <span className="text-muted text-sm">{filtered.length} items</span>
      </div>

      <input
        type="search"
        placeholder="Search brand, item, color..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full section px-3 py-2 text-sm mb-4"
      />

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Pill active={category === "all"} onClick={() => setCategory("all")}>
          All
        </Pill>
        {CATEGORY_ORDER.map((cat) => (
          <Pill
            key={cat}
            active={category === cat}
            onClick={() => setCategory(cat)}
          >
            {CATEGORIES[cat]}
          </Pill>
        ))}
      </div>

      {/* Season pills */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        <Pill active={season === "all"} onClick={() => setSeason("all")}>
          All seasons
        </Pill>
        {SEASONS.map((s) => (
          <Pill key={s} active={season === s} onClick={() => setSeason(s)}>
            {s}
          </Pill>
        ))}
      </div>

      {/* Items grid by category */}
      {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => (
        <section key={cat} className="mb-8">
          <h2 className="text-h3 mb-3 pb-2 border-b border-border">
            {CATEGORIES[cat]}
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

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
        active
          ? "bg-brand text-on-accent border-brand"
          : "bg-transparent text-muted border-border hover:border-muted",
      )}
    >
      {children}
    </button>
  );
}
