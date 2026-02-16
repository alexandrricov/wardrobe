import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { Icon } from "../../components/icon.tsx";
import { Button } from "../../components/action.tsx";
import { Select } from "../../components/select.tsx";
import { SEASONS } from "../../categories.ts";
import {
  subscribeItems,
  getAiApiKey,
  getUserProfile,
  saveOutfit,
  deleteOutfit,
  subscribeOutfits,
} from "../../firebase-db.ts";
import type { UserProfile, SavedOutfit } from "../../firebase-db.ts";
import type { ClosetItemDB } from "../../types.ts";
import { generateOutfits } from "../../ai/generate-outfits.ts";
import type { GeneratedOutfit, OutfitContext } from "../../ai/generate-outfits.ts";

/* ── Weather helpers ──────────────────────────────────── */

type WeatherData = {
  today: { temp: number; description: string };
  tomorrow: { tempMin: number; tempMax: number; description: string };
};

function weatherCodeToDescription(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 55) return "Drizzle";
  if (code <= 65) return "Rain";
  if (code <= 75) return "Snow";
  if (code <= 82) return "Showers";
  return "Thunderstorm";
}

function getCurrentSeason(): string {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "fall";
  return "winter";
}

function getDefaultDay(): "today" | "tomorrow" {
  return new Date().getHours() < 12 ? "today" : "tomorrow";
}

async function fetchWeather(): Promise<WeatherData> {
  const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }),
  );

  const { latitude, longitude } = pos.coords;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=2`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");
  const data = await res.json();

  return {
    today: {
      temp: Math.round(data.current.temperature_2m),
      description: weatherCodeToDescription(data.current.weather_code),
    },
    tomorrow: {
      tempMin: Math.round(data.daily.temperature_2m_min[1]),
      tempMax: Math.round(data.daily.temperature_2m_max[1]),
      description: weatherCodeToDescription(data.daily.weather_code[1]),
    },
  };
}

/* ── Main component ───────────────────────────────────── */

export function Outfits() {
  const [items, setItems] = useState<ClosetItemDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<GeneratedOutfit[]>([]);
  const [saved, setSaved] = useState<SavedOutfit[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<UserProfile>({ gender: null, birthDate: null, styleGoal: null });
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [useWeather, setUseWeather] = useState(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [day, setDay] = useState<"today" | "tomorrow">(getDefaultDay);
  const [season, setSeason] = useState(getCurrentSeason);

  useEffect(() => {
    const unsub = subscribeItems((data) => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeOutfits(setSaved);
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAiApiKey(), getUserProfile()]).then(([key, prof]) => {
      if (cancelled) return;
      setHasKey(!!key);
      setProfile(prof);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchWeather()
      .then((w) => {
        if (!cancelled) setWeather(w);
      })
      .catch(() => {
        if (!cancelled) setUseWeather(false);
      })
      .finally(() => {
        if (!cancelled) setWeatherLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const buildContext = useCallback((): OutfitContext => {
    if (useWeather && weather) {
      const w = day === "today"
        ? `${weather.today.temp}°C, ${weather.today.description} (outfit for today)`
        : `${weather.tomorrow.tempMin}–${weather.tomorrow.tempMax}°C, ${weather.tomorrow.description} (outfit for tomorrow)`;
      return { weather: w };
    }
    return { season };
  }, [useWeather, weather, day, season]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const key = await getAiApiKey();
      if (!key) throw new Error("No API key configured");
      const result = await generateOutfits(items, key, profile, buildContext());
      setSuggestions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [items, profile, buildContext]);

  const handleSave = useCallback(async (outfit: GeneratedOutfit, idx: number) => {
    setSavingIdx(idx);
    try {
      await saveOutfit(outfit);
      setSuggestions((prev) => prev.filter((_, i) => i !== idx));
    } finally {
      setSavingIdx(null);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteOutfit(id);
    } finally {
      setDeletingId(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="loading" className="animate-spin text-muted" />
      </div>
    );
  }

  if (items.length < 5) {
    return (
      <div className="py-20 text-center text-muted">
        <p className="text-h2 mb-2">Not enough items</p>
        <p>Add at least 5 items to generate outfit ideas.</p>
      </div>
    );
  }

  if (hasKey === false) {
    return (
      <div className="space-y-4">
        <h1 className="text-h1">Outfits</h1>
        <div className="section">
          <p className="text-sm text-muted">
            Set up your OpenRouter API key in{" "}
            <Link to="/settings" className="text-brand underline">
              Settings
            </Link>{" "}
            to generate AI outfit combinations.
          </p>
        </div>
      </div>
    );
  }

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const weatherAvailable = weather !== null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-h1">Outfits</h1>
        <Button
          variation="primary"
          size="small"
          onClick={generate}
          disabled={generating}
        >
          {generating ? (
            <Icon name="loading" size={16} className="animate-spin" />
          ) : (
            "Generate"
          )}
        </Button>
      </div>

      {/* Context controls */}
      {!weatherLoading && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={useWeather}
              onChange={(e) => setUseWeather(e.target.checked)}
              disabled={!weatherAvailable}
              className="accent-brand"
            />
            <span className="text-sm">Use weather</span>
          </label>

          {useWeather && weatherAvailable ? (
            <>
              <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                <button
                  onClick={() => setDay("today")}
                  className={`px-3 py-1 cursor-pointer transition-colors ${day === "today" ? "bg-brand text-on-accent" : "hover:bg-canvas2"}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDay("tomorrow")}
                  className={`px-3 py-1 cursor-pointer transition-colors ${day === "tomorrow" ? "bg-brand text-on-accent" : "hover:bg-canvas2"}`}
                >
                  Tomorrow
                </button>
              </div>
              <span className="text-sm text-muted">
                {day === "today"
                  ? `${weather!.today.temp}°C, ${weather!.today.description}`
                  : `${weather!.tomorrow.tempMin}–${weather!.tomorrow.tempMax}°C, ${weather!.tomorrow.description}`}
              </span>
            </>
          ) : (
            <Select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              options={SEASONS.map((s) => ({ value: s, children: s.charAt(0).toUpperCase() + s.slice(1) }))}
              className="w-32"
              aria-label="Season"
            >
              Season
            </Select>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 mb-3" role="alert">{error}</p>
      )}

      {/* Suggestions from AI */}
      {generating && suggestions.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Icon name="loading" className="animate-spin text-muted" />
        </div>
      )}

      {suggestions.length > 0 && (
        <section className="mb-6">
          <h2 className="text-h3 mb-3">Suggestions</h2>
          <div className="space-y-3">
            {suggestions.map((outfit, i) => (
              <OutfitCard
                key={i}
                outfit={outfit}
                itemMap={itemMap}
                action={
                  <button
                    onClick={() => handleSave(outfit, i)}
                    disabled={savingIdx === i}
                    className="text-xs text-brand font-medium hover:underline cursor-pointer disabled:opacity-50"
                    aria-label="Save outfit"
                  >
                    {savingIdx === i ? "Saving..." : "Save"}
                  </button>
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Saved outfits */}
      {saved.length > 0 && (
        <section>
          <h2 className="text-h3 mb-3">Saved</h2>
          <div className="space-y-3">
            {saved.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                itemMap={itemMap}
                action={
                  <button
                    onClick={() => handleDelete(outfit.id)}
                    disabled={deletingId === outfit.id}
                    className="text-xs text-red-500 font-medium hover:underline cursor-pointer disabled:opacity-50"
                    aria-label="Remove outfit"
                  >
                    {deletingId === outfit.id ? "Removing..." : "Remove"}
                  </button>
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!generating && suggestions.length === 0 && saved.length === 0 && (
        <div className="py-16 text-center text-muted">
          <Icon name="tshirt" size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Generate outfit ideas from your wardrobe</p>
        </div>
      )}
    </div>
  );
}

/* ── Outfit card ──────────────────────────────────────── */

function OutfitCard({
  outfit,
  itemMap,
  action,
}: {
  outfit: GeneratedOutfit;
  itemMap: Map<string, ClosetItemDB>;
  action: React.ReactNode;
}) {
  const outfitItems = outfit.itemIds
    .map((id) => itemMap.get(id))
    .filter((item): item is ClosetItemDB => !!item);

  if (outfitItems.length === 0) return null;

  return (
    <div className="section">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">{outfit.occasion}</p>
        {action}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {outfitItems.map((item) => (
          <Link
            key={item.id}
            to={`/item/${item.id}`}
            className="shrink-0 w-24 no-underline"
          >
            {item.photo ? (
              <img
                src={item.photo}
                alt={item.item}
                loading="lazy"
                className="w-24 h-24 object-contain rounded-lg bg-canvas2"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-border/30 flex items-center justify-center text-muted text-xs">
                no photo
              </div>
            )}
            <p className="text-xs mt-1 truncate">{item.item}</p>
          </Link>
        ))}
      </div>
      <p className="text-xs text-muted mt-2">{outfit.why}</p>
    </div>
  );
}
