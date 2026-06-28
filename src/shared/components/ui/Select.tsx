import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { cn } from "@/shared/lib/utils";
import type { SelectOption } from "@/shared/types/common";
import { ChevronDown } from "lucide-react";
import { useClickOutside } from "@/shared/hooks/useClickOutside";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, options, placeholder, hint, className, id, ...props },
    ref,
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const [isOpen, setIsOpen] = useState(false);
    const [displayValue, setDisplayValue] = useState("");
    const internalRef = useRef<HTMLSelectElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const optionsRef = useRef<(HTMLDivElement | null)[]>([]);

    const [searchQuery, setSearchQuery] = useState("");
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    useClickOutside(dropdownRef, () => setIsOpen(false));

    useEffect(() => {
      if (isOpen) {
        const currentIndex = options.findIndex(o => o.value === internalRef.current?.value);
        setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
        setSearchQuery("");
      }
    }, [isOpen, options]);

    useEffect(() => {
      if (isOpen && focusedIndex >= 0 && optionsRef.current[focusedIndex]) {
        optionsRef.current[focusedIndex]?.scrollIntoView({
          block: "nearest",
        });
      }
    }, [focusedIndex, isOpen]);

    const setRefs = useCallback(
      (node: HTMLSelectElement) => {
        internalRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLSelectElement | null>).current =
            node;
        }
      },
      [ref],
    );

    // Sync display value when the internal select value changes (e.g. via react-hook-form reset)
    useEffect(() => {
      const updateDisplay = () => {
        if (internalRef.current) {
          const val = internalRef.current.value;
          const opt = options.find((o) => o.value === val);
          setDisplayValue(opt ? opt.label : "");
        }
      };
      updateDisplay();
      if (internalRef.current) {
        internalRef.current.addEventListener("change", updateDisplay);
        return () =>
          internalRef.current?.removeEventListener("change", updateDisplay);
      }
    }, [options]);

    const handleSelect = (val: string, label: string) => {
      setDisplayValue(label);
      setIsOpen(false);
      if (internalRef.current) {
        internalRef.current.value = val;
        const event = new Event("change", { bubbles: true });
        internalRef.current.dispatchEvent(event);
        if (props.onChange) {
          props.onChange(event as any);
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (props.disabled) return;

      if (!isOpen) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (focusedIndex >= 0 && options[focusedIndex]) {
          handleSelect(options[focusedIndex].value, options[focusedIndex].label);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const char = e.key.toLowerCase();
        const newQuery = searchQuery + char;
        setSearchQuery(newQuery);

        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
          setSearchQuery("");
        }, 500);

        const matchIndex = options.findIndex((opt) =>
          opt.label.toLowerCase().startsWith(newQuery)
        );

        if (matchIndex !== -1) {
          setFocusedIndex(matchIndex);
        }
      }
    };

    return (
      <div className="grid gap-2 w-full relative" ref={dropdownRef}>
        {label && (
          <label
            htmlFor={selectId}
            className={cn("text-sm font-medium leading-none", props.disabled && "cursor-not-allowed opacity-70")}
          >
            {label}
          </label>
        )}

        {/* Hidden native select for form integration */}
        <select id={selectId} className="hidden" ref={setRefs} {...props}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom UI */}
        <div
          tabIndex={0}
          onClick={() => !props.disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border border-input dark:border-input/50 bg-background px-3 py-2 cursor-pointer select-none",
            "text-sm text-foreground shadow-sm shadow-black/5 transition-all duration-200",
            "hover:border-primary/50 focus-visible:bg-accent focus-visible:outline-none",
            isOpen && "ring-2 ring-primary/20 border-primary",
            error && "border-destructive ring-0",
            props.disabled && "opacity-50 cursor-not-allowed hover:border-input",
            className,
          )}
        >
          <span
            title={displayValue || undefined}
            className={cn(
              "truncate flex-1 text-left min-w-0 mr-2",
              !displayValue && "text-muted-foreground/70",
            )}
          >
            {displayValue || placeholder || "Select an option..."}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 opacity-50 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-[calc(100%+4px)] z-50 w-full rounded-md border border-border bg-background text-foreground shadow-md animate-in fade-in-80 slide-in-from-top-1 py-1 max-h-60 overflow-y-auto overflow-x-hidden scrollbar-thin">
            {options.map((opt, index) => (
              <div
                key={opt.value}
                ref={(el) => { optionsRef.current[index] = el; }}
                title={opt.label}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  focusedIndex === index && "bg-accent text-accent-foreground",
                  internalRef.current?.value === opt.value &&
                    "bg-primary/10 text-primary font-medium",
                )}
                onClick={() => handleSelect(opt.value, opt.label)}
              >
                <span className="truncate">{opt.label}</span>
              </div>
            ))}
          </div>
        )}

        {hint && !error && (
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-destructive font-medium mt-0.5">{error}</p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";
