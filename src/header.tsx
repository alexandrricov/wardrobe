import { NavLink } from "react-router";
import clsx from "clsx";

const NAV = [
  { to: "/", label: "Gallery", end: true },
  { to: "/add", label: "Add" },
  { to: "/settings", label: "Settings" },
] as const;

export function Header() {
  return (
    <header
      className="border-t sm:border-t-0 sm:border-b border-border bg-canvas2 px-4"
      style={{ gridArea: "header" }}
    >
      <nav className="flex justify-center gap-1 sm:gap-2 max-w-4xl mx-auto">
        {NAV.map(({ to, label, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={"end" in rest}
            className={({ isActive }) =>
              clsx(
                "px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "text-brand border-b-2 border-brand sm:border-b-2"
                  : "text-muted hover:text-canvas-text",
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
