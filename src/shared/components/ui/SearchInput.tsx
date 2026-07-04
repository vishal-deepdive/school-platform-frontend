import { Search, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Compact search field used above lists and tables. Shares the app's input
 * styling and adds a leading icon plus a clear button once text is entered.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  "aria-label": ariaLabel,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
