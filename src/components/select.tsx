import { clsx } from "clsx";

export function Select({
  children,
  options,
  className,
  ...props
}: {
  children?: React.ReactNode;
  options: { value: string; children: React.ReactNode }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label
      className={clsx(
        "flex relative border rounded-lg border-border h-10",
        className
      )}
    >
      {children && (
        <span className="absolute left-1 transform -translate-y-1/2 text-muted bg-canvas p-0.5 pointer-events-none whitespace-nowrap text-xs">
          {children}
        </span>
      )}
      <select className="w-full p-2 appearance-none h-9.5" {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.children}
          </option>
        ))}
      </select>
    </label>
  );
}
