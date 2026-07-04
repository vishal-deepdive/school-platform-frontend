import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/utils";
import type { SelectOption } from "@/shared/types/common";
import { ChevronDown } from "lucide-react";
import { useAnchoredPosition } from "@/shared/hooks/useAnchoredPosition";

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
    const triggerRef = useRef<HTMLDivElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const optionsRef = useRef<(HTMLDivElement | null)[]>([]);
    const pos = useAnchoredPosition(triggerRef, isOpen);

    const [searchQuery, setSearchQuery] = useState("");
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    // Close on outside mousedown; the menu is portaled, so check both refs.
    useEffect(() => {
      if (!isOpen) return;
      const onDown = (e: MouseEvent) => {
        const t = e.target as Node;
        if (triggerRef.current?.contains(t) || menuRef.current?.contains(t))
          return;
        setIsOpen(false);
      };
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }, [isOpen]);

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
      <div className="grid gap-1.5 w-full">
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
          ref={triggerRef}
          tabIndex={0}
          onClick={() => !props.disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input dark:border-input/50 bg-background px-3 py-2 cursor-pointer select-none",
            "text-sm text-foreground shadow-sm shadow-black/5 transition-all duration-200",
            "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
            isOpen && "ring-2 ring-primary/20 border-primary",
            error && "border-destructive ring-0",
            props.disabled && "opacity-50 cursor-not-allowed hover:border-input",
            className,
          )}
        >
          <span
            title={displayValue || undefined}
            className={cn(
              "truncate flex-1 text-left min-w-0",
              !displayValue && "text-muted-foreground/70",
            )}
          >
            {displayValue || placeholder || "Select an option..."}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 opacity-50 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </div>

        {/* Dropdown Menu (portaled so it escapes card overflow) */}
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
                maxHeight: pos.maxHeight,
                transform:
                  pos.placement === "top" ? "translateY(-100%)" : undefined,
              }}
              className="z-[60] overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg shadow-black/10 scrollbar-thin animate-in fade-in-0 zoom-in-95"
            >
              {options.map((opt, index) => (
                <div
                  key={opt.value}
                  ref={(el) => { optionsRef.current[index] = el; }}
                  title={opt.label}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm outline-none transition-colors",
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
            </div>,
            document.body,
          )}

        {hint && !error && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-destructive font-medium">{error}</p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";
