import { useMemo } from "react";
import { Icon } from "../../components/icon.tsx";
import { SLOT_DEFS, EXTRA_CATEGORIES, type SlotId } from "../../outfit-slots.ts";
import type { ClosetItemDB } from "../../types.ts";

type SlotPick = { kind: "slot"; slotId: SlotId };
type ExtraPick = { kind: "extra"; index: number | null }; // null = add new

export type PickerTarget = SlotPick | ExtraPick;

type Props = {
  target: PickerTarget;
  items: ClosetItemDB[];
  currentItemId: string | null;
  onSelect: (itemId: string | null) => void;
  onClose: () => void;
};

export function ItemPicker({ target, items, currentItemId, onSelect, onClose }: Props) {
  const filtered = useMemo(() => {
    if (target.kind === "slot") {
      const def = SLOT_DEFS.find((s) => s.id === target.slotId);
      if (!def) return [];
      return items.filter((i) => i.category === def.category);
    }
    // Extra: show all bags + accessories
    return items.filter((i) => EXTRA_CATEGORIES.includes(i.category));
  }, [target, items]);

  const title =
    target.kind === "slot"
      ? SLOT_DEFS.find((s) => s.id === target.slotId)?.label ?? ""
      : "Accessories";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Pick ${title}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-150 bg-canvas rounded-t-2xl max-h-[70vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium">{title}</h3>
          <div className="flex items-center gap-3">
            {currentItemId && (
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="text-xs text-red-500 font-medium cursor-pointer hover:underline"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer p-1"
              aria-label="Close"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* Items grid */}
        <div className="overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">
              No items in this category
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filtered.map((item) => {
                const selected = item.id === currentItemId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={`
                      rounded-lg overflow-hidden text-left cursor-pointer
                      transition-all
                      ${selected ? "ring-2 ring-brand bg-brand/10" : "bg-canvas2 hover:ring-2 hover:ring-brand/30"}
                    `}
                  >
                    {item.photo ? (
                      <img
                        src={item.photo}
                        alt={item.item}
                        loading="lazy"
                        className="w-full aspect-square object-contain"
                      />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center text-muted text-xs p-1 text-center">
                        no photo
                      </div>
                    )}
                    <div className="px-1.5 py-1">
                      <p className="text-[11px] leading-tight truncate">{item.item}</p>
                      <p className="text-[10px] text-muted truncate">
                        {item.subcategory ?? item.category}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
