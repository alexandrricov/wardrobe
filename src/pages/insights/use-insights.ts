import { useEffect, useMemo, useState } from "react";
import { subscribeItems } from "../../firebase-db.ts";
import type { ClosetItemDB } from "../../types.ts";
import { computeAllInsights } from "./compute-stats.ts";

export function useInsights() {
  const [items, setItems] = useState<ClosetItemDB[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeItems((data) => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const stats = useMemo(
    () => (items.length ? computeAllInsights(items) : null),
    [items],
  );

  return { stats, loading };
}
