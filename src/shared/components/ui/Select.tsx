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

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

    return (
      <div className="grid gap-2 w-full relative" ref={dropdownRef}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border border-input dark:border-input/50 bg-background px-3 py-2 cursor-pointer",
            "text-sm text-foreground shadow-sm shadow-black/5 transition-all duration-200",
            "hover:border-primary/50 focus-visible:bg-accent focus-visible:outline-none",
            isOpen && "ring-2 ring-primary/20 border-primary",
            error && "border-destructive ring-0",
            className,
          )}
        >
          <span
            className={cn(
              "truncate",
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
          <div className="absolute top-[calc(100%+4px)] z-50 w-full rounded-md border border-border bg-background text-foreground shadow-md animate-in fade-in-80 slide-in-from-top-1 py-1 max-h-60 overflow-y-auto scrollbar-thin">
            {options.map((opt) => (
              <div
                key={opt.value}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  internalRef.current?.value === opt.value &&
                    "bg-primary/10 text-primary font-medium",
                )}
                onClick={() => handleSelect(opt.value, opt.label)}
              >
                {opt.label}
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
