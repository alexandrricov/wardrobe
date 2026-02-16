import { Link } from "react-router";
import type { ClosetItemDB } from "../types.ts";

export function ItemCard({ item }: { item: ClosetItemDB }) {
  return (
    <Link
      to={`/item/${item.id}`}
      className="section block overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-md no-underline p-0"
    >
      {item.photo ? (
        <img
          src={item.photo}
          alt={item.item}
          loading="lazy"
          className="w-full aspect-square object-contain"
        />
      ) : (
        <div className="w-full aspect-square bg-border/30 flex items-center justify-center text-muted text-xs">
          no photo
        </div>
      )}
      <div className="p-2.5">
        <div className="text-sm font-medium leading-tight truncate">
          {item.item}
        </div>
        {item.brand && (
          <div className="text-xs text-muted font-medium mt-0.5 truncate">
            {item.brand}
          </div>
        )}
        <div className="text-xs text-muted mt-0.5 truncate">
          {item.color.join(", ")}
        </div>
      </div>
    </Link>
  );
}
