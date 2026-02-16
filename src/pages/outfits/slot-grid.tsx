import { Icon } from "../../components/icon.tsx";
import { SLOT_DEFS, type SlotId } from "../../outfit-slots.ts";
import type { OutfitSlots } from "../../ai/generate-outfits.ts";
import type { ClosetItemDB } from "../../types.ts";

type Props = {
  slots: OutfitSlots;
  extras: string[];
  itemMap: Map<string, ClosetItemDB>;
  onSlotTap?: (slotId: SlotId) => void;
  onExtraTap?: (index: number) => void;
  onAddExtra?: () => void;
  disabled?: boolean;
};

export function SlotGrid({
  slots,
  extras,
  itemMap,
  onSlotTap,
  onExtraTap,
  onAddExtra,
  disabled,
}: Props) {
  const interactive = !disabled && !!onSlotTap;
  const safeSlots = slots ?? {};
  const safeExtras = extras ?? [];

  return (
    <div className="space-y-2">
      {/* Body slots grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {SLOT_DEFS.map((def) => {
          const itemId = safeSlots[def.id];
          const item = itemId ? itemMap.get(itemId) : undefined;

          return (
            <button
              key={def.id}
              type="button"
              onClick={() => onSlotTap?.(def.id)}
              disabled={!interactive}
              className={`
                relative rounded-lg overflow-hidden aspect-square
                ${interactive ? "cursor-pointer hover:ring-2 hover:ring-brand/40" : "cursor-default"}
                ${item ? "bg-canvas2" : "bg-canvas2/50 border border-dashed border-border"}
                transition-all disabled:opacity-100
              `}
              aria-label={item ? `${def.label}: ${item.item}` : `Add ${def.label}`}
            >
              {item ? (
                <>
                  {item.photo ? (
                    <img
                      src={item.photo}
                      alt={item.item}
                      loading="lazy"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                      {item.item}
                    </div>
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate">
                    {def.label}
                  </span>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted">
                  {interactive && <Icon name="plus" size={16} className="opacity-40" />}
                  <span className="text-[10px]">{def.label}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Accessories (extras) row */}
      <ExtrasRow
        extras={safeExtras}
        itemMap={itemMap}
        onExtraTap={onExtraTap}
        onAddExtra={onAddExtra}
        disabled={disabled}
      />
    </div>
  );
}

function ExtrasRow({
  extras,
  itemMap,
  onExtraTap,
  onAddExtra,
  disabled,
}: {
  extras: string[];
  itemMap: Map<string, ClosetItemDB>;
  onExtraTap?: (index: number) => void;
  onAddExtra?: () => void;
  disabled?: boolean;
}) {
  const interactive = !disabled;
  const hasExtras = extras.length > 0;
  const showAdd = interactive && onAddExtra;

  if (!hasExtras && !showAdd) return null;

  return (
    <div>
      <p className="text-[10px] text-muted mb-1 uppercase tracking-wider">Accessories</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {extras.map((id, i) => {
          const item = itemMap.get(id);
          if (!item) return null;
          return (
            <button
              key={`${id}-${i}`}
              type="button"
              onClick={() => onExtraTap?.(i)}
              disabled={!interactive}
              className={`
                shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-canvas2
                ${interactive && onExtraTap ? "cursor-pointer hover:ring-2 hover:ring-brand/40" : "cursor-default"}
                transition-all disabled:opacity-100
              `}
              aria-label={item.item}
            >
              {item.photo ? (
                <img
                  src={item.photo}
                  alt={item.item}
                  loading="lazy"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-muted text-[9px] text-center leading-tight p-0.5">
                  {item.item}
                </span>
              )}
            </button>
          );
        })}
        {showAdd && (
          <button
            type="button"
            onClick={onAddExtra}
            className="shrink-0 w-14 h-14 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-canvas2 transition-colors"
            aria-label="Add accessory"
          >
            <Icon name="plus" size={16} className="text-muted" />
          </button>
        )}
      </div>
    </div>
  );
}