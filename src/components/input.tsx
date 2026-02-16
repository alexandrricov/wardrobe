import { clsx } from "clsx";

export function Input({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={clsx(
        "flex relative border rounded-lg border-border",
        className,
      )}
    >
      <span className="absolute left-1 transform -translate-y-1/2  text-muted bg-canvas p-0.5 pointer-events-none whitespace-nowrap text-xs">
        {children}
      </span>
      <input
        className="w-full px-3 py-2 min-w-0 h-9.5 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
        {...props}
      />
    </label>
  );
}
