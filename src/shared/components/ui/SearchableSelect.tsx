import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAnchoredPosition } from "@/shared/hooks/useAnchoredPosition";

export interface SearchableSelectOption {
  label: string;
  value: string;
  sublabel?: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  isLoading?: boolean;
  onSearchChange?: (query: string) => void;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  label,
  error,
  hint,
  className,
  isLoading = false,
  onSearchChange,
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pos = useAnchoredPosition(triggerRef, isOpen);

  // Close on outside mousedown / Escape. The menu lives in a portal, so we check
  // both the trigger and the portaled menu rather than a single wrapper.
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const filteredOptions = onSearchChange
    ? options
    : options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (opt.sublabel &&
            opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase())),
      );

  const [cachedSelectedOption, setCachedSelectedOption] =
    useState<SearchableSelectOption | null>(null);

  useEffect(() => {
    const found = options.find((opt) => opt.value === value);
    if (found) {
      setCachedSelectedOption(found);
    } else if (!value) {
      setCachedSelectedOption(null);
    }
  }, [options, value]);

  const selectedOption =
    options.find((opt) => opt.value === value) || cachedSelectedOption;

  const handleSelect = (val: string) => {
    const selected = options.find((opt) => opt.value === val);
    if (selected) setCachedSelectedOption(selected);
    onChange(val);
    setIsOpen(false);
    setSearchQuery("");
    if (onSearchChange) onSearchChange("");
  };

  return (
    <div className={cn("grid gap-1.5 w-full", className)}>
      {label && (
        <label className="text-sm font-medium leading-none">{label}</label>
      )}

      <button
        type="button"
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input dark:border-input/50 bg-background px-3 py-2 cursor-pointer",
          "text-sm text-foreground shadow-sm shadow-black/5 transition-all duration-200 select-none",
          "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
          isOpen && "ring-2 ring-primary/20 border-primary",
          error && "border-destructive ring-0",
          disabled && "opacity-50 cursor-not-allowed hover:border-input",
        )}
      >
        <span
          className={cn(
            "truncate flex-1 text-left min-w-0",
            !selectedOption && "text-muted-foreground/70",
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 opacity-50 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              transform: pos.placement === "top" ? "translateY(-100%)" : undefined,
            }}
            className="z-[60] flex flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg shadow-black/10 animate-in fade-in-0 zoom-in-95"
          >
            <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (onSearchChange) onSearchChange(e.target.value);
                }}
                autoFocus
              />
            </div>

            <div
              className="overflow-y-auto scrollbar-thin p-1.5"
              style={{ maxHeight: pos.maxHeight - 44 }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center px-3 py-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    className={cn(
                      "flex w-full cursor-pointer select-none flex-col rounded-md px-3 py-2 text-left text-sm outline-none transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      value === opt.value &&
                        "bg-primary/10 text-primary font-medium",
                    )}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{opt.label}</span>
                      {value === opt.value && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </div>
                    {opt.sublabel && (
                      <span className="mt-0.5 truncate text-xs text-muted-foreground">
                        {opt.sublabel}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}

      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
