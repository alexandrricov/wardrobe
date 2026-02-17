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
  saveSuggestions,
  promoteSuggestion,
  updateOutfit,
  deleteOutfit,
  subscribeOutfits,
} from "../../firebase-db.ts";
import type { UserProfile, SavedOutfit } from "../../firebase-db.ts";
import type { ClosetItemDB } from "../../types.ts";
import { generateOutfits } from "../../ai/generate-outfits.ts";
import type { GeneratedOutfit, OutfitContext } from "../../ai/generate-outfits.ts";
import type { SlotId } from "../../outfit-slots.ts";
import { SlotGrid } from "./slot-grid.tsx";
import { ItemPicker, type PickerTarget } from "./item-picker.tsx";

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

/* ── Editable outfit state ────────────────────────────── */

function emptyOutfit(): GeneratedOutfit {
  return { slots: {}, extras: [], occasion: "", why: "" };
}

/* ── Main component ───────────────────────────────────── */

export function Outfits() {
  const [items, setItems] = useState<ClosetItemDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<SavedOutfit[]>([]);
  const [saved, setSaved] = useState<SavedOutfit[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<UserProfile>({ gender: null, birthDate: null, styleGoal: null });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Weather
  const [useWeather, setUseWeather] = useState(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [day, setDay] = useState<"today" | "tomorrow">(getDefaultDay);
  const [season, setSeason] = useState(getCurrentSeason);

  // Picker
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerOutfitRef, setPickerOutfitRef] = useState<{ kind: "suggestion"; id: string } | { kind: "saved"; id: string } | { kind: "new" } | null>(null);

  // Manual creation
  const [newOutfit, setNewOutfit] = useState<GeneratedOutfit | null>(null);

  // Editing saved
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<GeneratedOutfit | null>(null);

  /* ── Data subscriptions ── */

  useEffect(() => {
    const unsub = subscribeItems((data) => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeOutfits(({ suggestions: s, saved: sv }) => {
      setSuggestions(s);
      setSaved(sv);
    });
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
      .then((w) => { if (!cancelled) setWeather(w); })
      .catch(() => { if (!cancelled) setUseWeather(false); })
      .finally(() => { if (!cancelled) setWeatherLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /* ── Context ── */

  const buildContext = useCallback((): OutfitContext => {
    if (useWeather && weather) {
      const isToday = day === "today";
      const temp = isToday
        ? weather.today.temp
        : Math.round((weather.tomorrow.tempMin + weather.tomorrow.tempMax) / 2);
      const description = isToday ? weather.today.description : weather.tomorrow.description;
      const label = isToday
        ? `${weather.today.temp}°C, ${weather.today.description} (outfit for today)`
        : `${weather.tomorrow.tempMin}–${weather.tomorrow.tempMax}°C, ${weather.tomorrow.description} (outfit for tomorrow)`;
      return { weather: { temp, description, label } };
    }
    return { season };
  }, [useWeather, weather, day, season]);

  /* ── Actions ── */

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const key = await getAiApiKey();
      if (!key) throw new Error("No API key configured");
      const result = await generateOutfits(items, key, profile, buildContext());
      await saveSuggestions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [items, profile, buildContext]);

  const handleSave = useCallback(async (outfit: SavedOutfit) => {
    setSavingId(outfit.id);
    try {
      await updateOutfit(outfit.id, { slots: outfit.slots, extras: outfit.extras, occasion: outfit.occasion, why: outfit.why });
      await promoteSuggestion(outfit.id);
    } finally {
      setSavingId(null);
    }
  }, []);

  const handleSaveNew = useCallback(async () => {
    if (!newOutfit) return;
    setSavingId("new");
    try {
      await saveOutfit(newOutfit);
      setNewOutfit(null);
    } finally {
      setSavingId(null);
    }
  }, [newOutfit]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editDraft) return;
    try {
      await updateOutfit(editingId, editDraft);
      setEditingId(null);
      setEditDraft(null);
    } catch {
      // ignore
    }
  }, [editingId, editDraft]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteOutfit(id);
    } finally {
      setDeletingId(null);
    }
  }, []);

  /* ── Picker handlers ── */

  function openPicker(target: PickerTarget, ref: typeof pickerOutfitRef) {
    setPickerTarget(target);
    setPickerOutfitRef(ref);
  }

  function handlePickerSelect(itemId: string | null) {
    if (!pickerTarget || !pickerOutfitRef) return;

    const apply = (outfit: GeneratedOutfit): GeneratedOutfit => {
      if (pickerTarget.kind === "slot") {
        const newSlots = { ...outfit.slots };
        if (itemId) {
          newSlots[pickerTarget.slotId] = itemId;
        } else {
          delete newSlots[pickerTarget.slotId];
        }
        return { ...outfit, slots: newSlots };
      }
      // extra
      const newExtras = [...outfit.extras];
      if (pickerTarget.index === null) {
        // adding new
        if (itemId) newExtras.push(itemId);
      } else if (itemId) {
        newExtras[pickerTarget.index] = itemId;
      } else {
        newExtras.splice(pickerTarget.index, 1);
      }
      return { ...outfit, extras: newExtras };
    };

    if (pickerOutfitRef.kind === "suggestion") {
      setSuggestions((prev) =>
        prev.map((o) => (o.id === pickerOutfitRef.id ? { ...apply(o), id: o.id, createdAt: o.createdAt, status: o.status } : o)),
      );
    } else if (pickerOutfitRef.kind === "new") {
      setNewOutfit((prev) => (prev ? apply(prev) : prev));
    } else if (pickerOutfitRef.kind === "saved") {
      setEditDraft((prev) => (prev ? apply(prev) : prev));
    }

    setPickerTarget(null);
    setPickerOutfitRef(null);
  }

  function getPickerCurrentId(): string | null {
    if (!pickerTarget || !pickerOutfitRef) return null;

    const getOutfit = (): GeneratedOutfit | null => {
      if (pickerOutfitRef.kind === "suggestion") return suggestions.find((s) => s.id === pickerOutfitRef.id) ?? null;
      if (pickerOutfitRef.kind === "new") return newOutfit;
      if (pickerOutfitRef.kind === "saved") return editDraft;
      return null;
    };

    const outfit = getOutfit();
    if (!outfit) return null;

    if (pickerTarget.kind === "slot") return outfit.slots[pickerTarget.slotId] ?? null;
    if (pickerTarget.index !== null) return outfit.extras[pickerTarget.index] ?? null;
    return null;
  }

  /* ── Loading / empty states ── */

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
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h1 className="text-h1 mr-auto">Outfits</h1>
        <Button
          variation="secondary"
          size="small"
          onClick={() => setNewOutfit(emptyOutfit())}
          disabled={!!newOutfit}
        >
          + New
        </Button>
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

      {/* Weather controls */}
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

      {/* Manual creation */}
      {newOutfit && (
        <section className="mb-6">
          <h2 className="text-h3 mb-3">New outfit</h2>
          <OutfitEditor
            outfit={newOutfit}
            itemMap={itemMap}
            onSlotTap={(slotId) => openPicker({ kind: "slot", slotId }, { kind: "new" })}
            onExtraTap={(i) => openPicker({ kind: "extra", index: i }, { kind: "new" })}
            onAddExtra={() => openPicker({ kind: "extra", index: null }, { kind: "new" })}
            occasionValue={newOutfit.occasion}
            onOccasionChange={(v) => setNewOutfit({ ...newOutfit, occasion: v })}
            actions={
              <>
                <button
                  onClick={handleSaveNew}
                  disabled={savingId === "new" || Object.keys(newOutfit.slots).length === 0}
                  className="text-xs text-brand font-medium hover:underline cursor-pointer disabled:opacity-50"
                >
                  {savingId === "new" ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setNewOutfit(null)}
                  className="text-xs text-muted font-medium hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              </>
            }
          />
        </section>
      )}

      {/* AI suggestions */}
      {generating && suggestions.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Icon name="loading" className="animate-spin text-muted" />
        </div>
      )}

      {suggestions.length > 0 && (
        <section className="mb-6">
          <h2 className="text-h3 mb-3">Suggestions</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
            {suggestions.map((outfit) => (
              <div key={outfit.id} className="shrink-0 w-[85vw] max-w-80 snap-start">
                <OutfitEditor
                  outfit={outfit}
                  itemMap={itemMap}
                  onSlotTap={(slotId) => openPicker({ kind: "slot", slotId }, { kind: "suggestion", id: outfit.id })}
                  onExtraTap={(idx) => openPicker({ kind: "extra", index: idx }, { kind: "suggestion", id: outfit.id })}
                  onAddExtra={() => openPicker({ kind: "extra", index: null }, { kind: "suggestion", id: outfit.id })}
                  subtitle={outfit.why}
                  actions={
                    <>
                      <button
                        onClick={() => handleSave(outfit)}
                        disabled={savingId === outfit.id}
                        className="text-xs text-brand font-medium hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {savingId === outfit.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => handleDelete(outfit.id)}
                        disabled={deletingId === outfit.id}
                        className="text-xs text-muted font-medium hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === outfit.id ? "Dismissing..." : "Dismiss"}
                      </button>
                    </>
                  }
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Saved outfits */}
      {saved.length > 0 && (
        <section>
          <h2 className="text-h3 mb-3">Saved</h2>
          <div className="space-y-4">
            {saved.map((outfit) => {
              const isEditing = editingId === outfit.id;
              const display = isEditing && editDraft ? editDraft : outfit;

              return isEditing ? (
                <OutfitEditor
                  key={outfit.id}
                  outfit={display}
                  itemMap={itemMap}
                  onSlotTap={(slotId) => openPicker({ kind: "slot", slotId }, { kind: "saved", id: outfit.id })}
                  onExtraTap={(idx) => openPicker({ kind: "extra", index: idx }, { kind: "saved", id: outfit.id })}
                  onAddExtra={() => openPicker({ kind: "extra", index: null }, { kind: "saved", id: outfit.id })}
                  occasionValue={display.occasion}
                  onOccasionChange={(v) => setEditDraft(display ? { ...display, occasion: v } : null)}
                  actions={
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="text-xs text-brand font-medium hover:underline cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditDraft(null); }}
                        className="text-xs text-muted font-medium hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  }
                />
              ) : (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  itemMap={itemMap}
                  actions={
                    <>
                      <button
                        onClick={() => { setEditingId(outfit.id); setEditDraft({ slots: outfit.slots, extras: outfit.extras, occasion: outfit.occasion, why: outfit.why }); }}
                        className="text-xs text-brand font-medium hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(outfit.id)}
                        disabled={deletingId === outfit.id}
                        className="text-xs text-red-500 font-medium hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === outfit.id ? "Removing..." : "Remove"}
                      </button>
                    </>
                  }
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!generating && suggestions.length === 0 && saved.length === 0 && !newOutfit && (
        <div className="py-16 text-center text-muted">
          <Icon name="tshirt" size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Generate outfit ideas from your wardrobe</p>
        </div>
      )}

      {/* Item picker modal */}
      {pickerTarget && (
        <ItemPicker
          target={pickerTarget}
          items={items}
          currentItemId={getPickerCurrentId()}
          onSelect={handlePickerSelect}
          onClose={() => { setPickerTarget(null); setPickerOutfitRef(null); }}
        />
      )}
    </div>
  );
}

/* ── Outfit editor (interactive slots) ────────────────── */

function OutfitEditor({
  outfit,
  itemMap,
  onSlotTap,
  onExtraTap,
  onAddExtra,
  occasionValue,
  onOccasionChange,
  subtitle,
  actions,
}: {
  outfit: GeneratedOutfit;
  itemMap: Map<string, ClosetItemDB>;
  onSlotTap: (slotId: SlotId) => void;
  onExtraTap: (index: number) => void;
  onAddExtra: () => void;
  occasionValue?: string;
  onOccasionChange?: (v: string) => void;
  subtitle?: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="section">
      <div className="flex items-center gap-2 mb-3">
        {onOccasionChange ? (
          <input
            type="text"
            value={occasionValue ?? ""}
            onChange={(e) => onOccasionChange(e.target.value)}
            placeholder="Occasion..."
            className="text-sm font-medium bg-transparent border-b border-border flex-1 py-0.5 outline-none focus:border-brand"
          />
        ) : (
          <p className="text-sm font-medium flex-1">{outfit.occasion}</p>
        )}
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      </div>
      <SlotGrid
        slots={outfit.slots}
        extras={outfit.extras}
        itemMap={itemMap}
        onSlotTap={onSlotTap}
        onExtraTap={onExtraTap}
        onAddExtra={onAddExtra}
      />
      {subtitle && (
        <p className="text-xs text-muted mt-2">{subtitle}</p>
      )}
    </div>
  );
}

/* ── Outfit card (read-only view) ─────────────────────── */

function OutfitCard({
  outfit,
  itemMap,
  actions,
}: {
  outfit: GeneratedOutfit;
  itemMap: Map<string, ClosetItemDB>;
  actions: React.ReactNode;
}) {
  return (
    <div className="section">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-medium flex-1">{outfit.occasion}</p>
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      </div>
      <SlotGrid
        slots={outfit.slots}
        extras={outfit.extras}
        itemMap={itemMap}
        disabled
      />
      {outfit.why && (
        <p className="text-xs text-muted mt-2">{outfit.why}</p>
      )}
    </div>
  );
}
