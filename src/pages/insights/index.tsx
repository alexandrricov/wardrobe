import { useState, useEffect, useCallback } from "react";
import { Icon } from "../../components/icon.tsx";
import { Button } from "../../components/action.tsx";
import { useInsights } from "./use-insights.ts";
import type { ComputedInsights, AIInsightReport } from "./types.ts";
import { analyzeWardrobe } from "../../ai/analyze-wardrobe.ts";
import {
  getAiApiKey,
  getUserProfile,
  saveInsightReport,
  getLatestInsightReport,
} from "../../firebase-db.ts";
import type { UserProfile } from "../../firebase-db.ts";

export function Insights() {
  const { stats, loading } = useInsights();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="loading" className="animate-spin text-muted" />
      </div>
    );
  }

  if (!stats || stats.totalItems < 5) {
    return (
      <div className="py-20 text-center text-muted">
        <p className="text-h2 mb-2">Not enough data</p>
        <p>Add at least 5 items to unlock insights.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-h1 mb-4">Insights</h1>
      <OverviewSection stats={stats} />
      <CategorySection stats={stats} />
      <SizesSection stats={stats} />
      <ColorSection stats={stats} />
      <SeasonSection stats={stats} />
      <BrandsAndMaterialsSection stats={stats} />
      <AISection stats={stats} />
    </div>
  );
}

/* ── Shared ────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-canvas2">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-h2 tabular-nums">{value}</p>
      {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
    </div>
  );
}

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="not-last:mb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm">{label}</span>
        <span className="text-sm tabular-nums font-medium">{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-border/30">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Overview ──────────────────────────────────────────── */

function OverviewSection({ stats }: { stats: ComputedInsights }) {
  return (
    <section className="section">
      <h2 className="text-h2 mb-3">Overview</h2>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total items" value={stats.totalItems} />
        <StatCard label="Categories" value={stats.categoriesUsed} />
        <StatCard label="With photo" value={`${stats.photoCoverage}%`} />
      </div>
    </section>
  );
}

/* ── Categories ────────────────────────────────────────── */

function CategorySection({ stats }: { stats: ComputedInsights }) {
  const max = Math.max(...stats.categoryDistribution.map((c) => c.count), 1);

  return (
    <section className="section">
      <h2 className="text-h2 mb-1">Categories</h2>
      <p className="text-xs text-muted mb-3">Distribution across your wardrobe</p>
      {stats.categoryDistribution.map((cat) => (
        <div key={cat.category} className="not-last:mb-3">
          <Bar value={cat.count} max={max} label={`${cat.category} (${cat.percentage}%)`} />
          {cat.subcategories.length > 1 && (
            <div className="ml-4 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {cat.subcategories.map((sub) => (
                <span key={sub.name} className="text-xs text-muted">
                  {sub.name} ×{sub.count}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

/* ── Sizes ─────────────────────────────────────────────── */

function SizesSection({ stats }: { stats: ComputedInsights }) {
  if (stats.sizesByCategory.length === 0) return null;

  return (
    <section className="section">
      <h2 className="text-h2 mb-1">Sizes</h2>
      <p className="text-xs text-muted mb-3">Your sizes by category</p>
      <div className="grid grid-cols-2 gap-3">
        {stats.sizesByCategory.map((cat) => (
          <div key={cat.category} className="p-3 rounded-xl bg-canvas2">
            <p className="text-xs text-muted mb-1">{cat.category}</p>
            <div className="flex flex-wrap gap-1.5">
              {cat.sizes.map((s) => (
                <span
                  key={s.size}
                  className={`text-sm tabular-nums px-1.5 py-0.5 rounded ${
                    s.size === cat.mostCommon
                      ? "bg-brand/15 text-brand-dark font-medium"
                      : "bg-border/30"
                  }`}
                >
                  {s.size} <span className="text-xs text-muted">×{s.count}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Colors ────────────────────────────────────────────── */

function ColorSection({ stats }: { stats: ComputedInsights }) {
  return (
    <section className="section">
      <h2 className="text-h2 mb-1">Colors</h2>
      <p className="text-xs text-muted mb-3">
        Top colors · diversity {stats.colorDiversity}
      </p>
      <div className="flex flex-wrap gap-2">
        {stats.topColors.map((c) => (
          <span
            key={c.color}
            className="text-sm px-2 py-1 rounded-lg bg-canvas2"
          >
            {c.color} <span className="text-xs text-muted">×{c.count}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

/* ── Seasons ───────────────────────────────────────────── */

function SeasonSection({ stats }: { stats: ComputedInsights }) {
  const max = Math.max(...stats.seasonCoverage.map((s) => s.count), 1);

  return (
    <section className="section">
      <h2 className="text-h2 mb-1">Seasons</h2>
      <p className="text-xs text-muted mb-3">
        Coverage per season · {stats.allSeasonCount} all-season items
      </p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {stats.seasonCoverage.map((s) => (
          <div
            key={s.season}
            className={`p-3 rounded-xl bg-canvas2 ${
              stats.seasonGaps.includes(s.season)
                ? "ring-1 ring-red-400/50"
                : ""
            }`}
          >
            <p className="text-xs text-muted mb-1 capitalize">{s.season}</p>
            <p className="text-h2 tabular-nums">{s.count}</p>
            <div className="h-1 rounded-full overflow-hidden bg-border/30 mt-2">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${(s.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {stats.seasonGaps.length > 0 && (
        <p className="text-xs text-muted">
          Low coverage: {stats.seasonGaps.join(", ")}
        </p>
      )}
    </section>
  );
}

/* ── Brands & Materials ────────────────────────────────── */

function BrandsAndMaterialsSection({ stats }: { stats: ComputedInsights }) {
  if (stats.topBrands.length === 0 && stats.topMaterials.length === 0)
    return null;

  return (
    <section className="section">
      <div className="grid grid-cols-2 gap-6">
        {stats.topBrands.length > 0 && (
          <div>
            <h2 className="text-h3 mb-2">Top brands</h2>
            {stats.topBrands.map((b) => (
              <div
                key={b.brand}
                className="flex justify-between text-sm not-last:mb-1"
              >
                <span className="capitalize">{b.brand}</span>
                <span className="tabular-nums text-muted">{b.count}</span>
              </div>
            ))}
          </div>
        )}
        {stats.topMaterials.length > 0 && (
          <div>
            <h2 className="text-h3 mb-2">Top materials</h2>
            {stats.topMaterials.map((m) => (
              <div
                key={m.material}
                className="flex justify-between text-sm not-last:mb-1"
              >
                <span className="capitalize">{m.material}</span>
                <span className="tabular-nums text-muted">{m.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── AI Insights ───────────────────────────────────────── */

function AISection({ stats }: { stats: ComputedInsights }) {
  const [report, setReport] = useState<AIInsightReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<UserProfile>({ gender: null, birthDate: null, styleGoal: null });
  const [twinMeta, setTwinMeta] = useState<Record<string, { photo?: string; url?: string }>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [key, prof, saved] = await Promise.all([
        getAiApiKey(),
        getUserProfile(),
        getLatestInsightReport(),
      ]);
      if (cancelled) return;
      setHasKey(!!key);
      setProfile(prof);
      if (saved) {
        setReport(saved);
        fetchTwinPhotos(saved.styleTwins ?? []);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function fetchTwinPhotos(twins: { name: string }[]) {
    for (const twin of twins) {
      const slug = twin.name.replace(/ /g, "_");
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!data) return;
          const photo = data.thumbnail?.source as string | undefined;
          const url = data.content_urls?.desktop?.page as string | undefined;
          if (photo || url) {
            setTwinMeta((prev) => ({ ...prev, [twin.name]: { photo, url } }));
          }
        })
        .catch(() => {});
    }
  }

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const key = await getAiApiKey();
      if (!key) throw new Error("No API key configured");
      const result = await analyzeWardrobe(stats, key, profile);
      await saveInsightReport(result);
      const saved = await getLatestInsightReport();
      if (saved) {
        setReport(saved);
        fetchTwinPhotos(saved.styleTwins ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setGenerating(false);
    }
  }, [stats, profile]);

  if (hasKey === false) {
    return (
      <section className="section">
        <h2 className="text-h2 mb-2">AI Analysis</h2>
        <p className="text-sm text-muted">
          Set up your OpenRouter API key in{" "}
          <a href="/settings" className="text-brand underline">
            Settings
          </a>{" "}
          to unlock AI-powered wardrobe analysis.
        </p>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-h2">AI Analysis</h2>
        <Button
          variation="primary"
          size="small"
          onClick={generate}
          disabled={generating}
        >
          {generating ? (
            <Icon name="loading" size={16} className="animate-spin" />
          ) : report ? (
            "Regenerate"
          ) : (
            "Generate"
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-500 mb-3">{error}</p>
      )}

      {generating && !report && (
        <div className="flex items-center justify-center py-8">
          <Icon name="loading" className="animate-spin text-muted" />
        </div>
      )}

      {report && (
        <div>
          <p className="text-xs text-muted mb-4">
            Based on {report.itemCount} items ·{" "}
            {report.createdAt?.toDate?.().toLocaleDateString() ?? "just now"}
          </p>

          <div className="p-3 rounded-xl bg-canvas2 mb-3">
            <p className="text-xs text-muted mb-1">Your style</p>
            <p className="text-sm font-medium">{report.styleProfile}</p>
          </div>

          {report.gaps.length > 0 && (
            <div className="p-3 rounded-xl bg-canvas2 mb-3">
              <p className="text-xs text-muted mb-1">Wardrobe gaps</p>
              <ul className="text-sm list-disc ml-4 space-y-0.5">
                {report.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-3 rounded-xl bg-canvas2 mb-3">
            <p className="text-xs text-muted mb-1">Versatility</p>
            <p className="text-sm">{report.versatility}</p>
          </div>

          <div className="p-3 rounded-xl bg-canvas2 mb-3">
            <p className="text-xs text-muted mb-1">Color analysis</p>
            <p className="text-sm">{report.colorAnalysis}</p>
          </div>

          <div className="p-3 rounded-xl bg-canvas2 mb-3">
            <p className="text-xs text-muted mb-2">Season readiness</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(report.seasonReadiness).map(([season, note]) => (
                <div key={season}>
                  <p className="text-xs font-medium capitalize mb-0.5">{season}</p>
                  <p className="text-xs text-muted">{note}</p>
                </div>
              ))}
            </div>
          </div>

          {report.recommendations.length > 0 && (
            <div className="p-3 rounded-xl bg-canvas2 mb-3">
              <p className="text-xs text-muted mb-1">Recommendations</p>
              <ul className="text-sm list-disc ml-4 space-y-0.5">
                {report.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {(report.fashionTips?.length ?? 0) > 0 && (
            <div className="p-3 rounded-xl bg-canvas2 mb-3">
              <p className="text-xs text-muted mb-1">Fashion tips</p>
              <ul className="text-sm list-disc ml-4 space-y-0.5">
                {report.fashionTips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {(report.styleTwins?.length ?? 0) > 0 && (
            <div className="p-3 rounded-xl bg-canvas2">
              <p className="text-xs text-muted mb-2">Style twins</p>
              <div className="space-y-3">
                {report.styleTwins.map((twin) => {
                  const meta = twinMeta[twin.name];
                  return (
                    <div key={twin.name} className="flex items-center gap-3">
                      {meta?.photo ? (
                        <img
                          src={meta.photo}
                          alt={twin.name}
                          className="w-12 h-12 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-border/30 flex items-center justify-center shrink-0">
                          <span className="text-sm font-medium text-muted">
                            {twin.name.split(" ").map((w) => w[0]).join("")}
                          </span>
                        </div>
                      )}
                      <div>
                        {meta?.url ? (
                          <a
                            href={meta.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-brand underline"
                          >
                            {twin.name}
                          </a>
                        ) : (
                          <p className="text-sm font-medium">{twin.name}</p>
                        )}
                        <p className="text-xs text-muted">{twin.why}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
