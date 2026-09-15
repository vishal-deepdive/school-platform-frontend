import * as React from "react";
import { useState, useId, useEffect } from "react";
import { Slot } from "@radix-ui/react-slot";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { Eye, EyeOff, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useClickOutside } from "@/shared/hooks/useClickOutside";

// ─── Label ────────────────────────────────────────────────────────────────────

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

// ─── Button ───────────────────────────────────────────────────────────────────

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input dark:border-input/50 bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-6",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const AuthButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
AuthButton.displayName = "AuthButton";

// ─── Text input ───────────────────────────────────────────────────────────────

export const AuthInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & {
    label?: string;
    error?: string;
    hint?: string;
  }
>(({ className, type, label, error, hint, ...props }, ref) => {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className="grid gap-2 w-full">
      {label && <Label htmlFor={id}>{label}</Label>}
      <input
        id={id}
        type={type}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          "flex min-w-0 h-10 w-full rounded-lg border border-input dark:border-input/50 bg-background px-3 py-3 text-sm text-foreground shadow-sm shadow-black/5 transition-all placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          error &&
            "border-destructive focus:border-destructive focus:ring-destructive/20",
          className,
        )}
        ref={ref}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive font-medium">
          {error}
        </p>
      )}
    </div>
  );
});
AuthInput.displayName = "AuthInput";

// ─── Password input ───────────────────────────────────────────────────────────

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const AuthPasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(({ className, label, error, hint, ...props }, ref) => {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="grid w-full items-center gap-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "flex min-w-0 h-10 w-full rounded-lg border border-input dark:border-input/50 bg-background px-3 py-3 text-sm text-foreground shadow-sm shadow-black/5 transition-all placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 pe-10",
            error &&
              "border-destructive focus:border-destructive focus:ring-destructive/20",
            className,
          )}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((p) => !p)}
          className="absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive font-medium">
          {error}
        </p>
      )}
    </div>
  );
});
AuthPasswordInput.displayName = "AuthPasswordInput";

// ─── Select ───────────────────────────────────────────────────────────────────

export interface AuthSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const AuthSelect = React.forwardRef<HTMLSelectElement, AuthSelectProps>(
  ({ label, error, hint, children, className, ...props }, ref) => {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const labelId = `${id}-label`;
    const listboxId = `${id}-listbox`;
    const [isOpen, setIsOpen] = useState(false);
    const [displayValue, setDisplayValue] = useState("");
    // Which option the keyboard is on. The trigger keeps DOM focus and points
    // at this one through aria-activedescendant, as the listbox pattern wants.
    const [activeIndex, setActiveIndex] = useState(-1);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    // Enter/Space on a focused <button> ALSO fires a click. Without this the
    // keydown would select an option and the click right behind it would
    // reopen the list.
    const skipNextClickRef = React.useRef(false);
    const typeaheadRef = React.useRef({ buffer: "", at: 0 });
    const internalRef = React.useRef<HTMLSelectElement | null>(null);
    const dropdownRef = React.useRef<HTMLDivElement | null>(null);

    useClickOutside(dropdownRef, () => {
      setIsOpen(false);
      setActiveIndex(-1);
    });

    const setRefs = React.useCallback(
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

    const options = React.Children.toArray(children)
      .map((child) => {
        if (React.isValidElement(child) && child.type === "option") {
          return {
            value: child.props.value as string,
            label: child.props.children as string,
          };
        }
        return null;
      })
      .filter((o): o is { value: string; label: string } => o !== null);

    // Sync display value when the underlying select value changes (e.g. via RHF reset)
    useEffect(() => {
      const updateDisplay = () => {
        if (!internalRef.current) return;
        const opt = options.find((o) => o.value === internalRef.current!.value);
        setDisplayValue(opt?.label ?? "");
      };
      updateDisplay();
      const el = internalRef.current;
      if (!el) return;
      el.addEventListener("change", updateDisplay);
      return () => el.removeEventListener("change", updateDisplay);
    }, [options]);

    const currentIndex = () =>
      options.findIndex((o) => o.value === internalRef.current?.value);

    const openList = (index?: number) => {
      setIsOpen(true);
      if (index !== undefined) {
        setActiveIndex(index);
        return;
      }
      // Land on the current choice, or — when nothing is chosen yet — on the
      // first REAL option. Starting on the empty "— Select … —" placeholder
      // means one ArrowDown + Enter selects nothing, which no native select does.
      const current = currentIndex();
      const firstReal = options.findIndex((o) => o.value !== "");
      setActiveIndex(
        current > 0 ? current : firstReal >= 0 ? firstReal : 0,
      );
    };

    const closeList = () => {
      setIsOpen(false);
      setActiveIndex(-1);
    };

    const move = (delta: number) => {
      const from = activeIndex >= 0 ? activeIndex : currentIndex();
      const next = Math.min(
        Math.max((from < 0 ? 0 : from) + delta, 0),
        options.length - 1,
      );
      setActiveIndex(next);
    };

    /** Native selects jump to an option when you type its first letters. */
    const typeahead = (char: string) => {
      const now = Date.now();
      const t = typeaheadRef.current;
      t.buffer = now - t.at > 700 ? char : t.buffer + char;
      t.at = now;
      const hit = options.findIndex((o) =>
        o.label.toLowerCase().startsWith(t.buffer.toLowerCase()),
      );
      if (hit === -1) return;
      if (isOpen) setActiveIndex(hit);
      else handleSelect(options[hit].value, options[hit].label);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (isOpen) move(1);
          else openList();
          return;
        case "ArrowUp":
          e.preventDefault();
          if (isOpen) move(-1);
          else openList();
          return;
        case "Home":
          if (!isOpen) return;
          e.preventDefault();
          setActiveIndex(0);
          return;
        case "End":
          if (!isOpen) return;
          e.preventDefault();
          setActiveIndex(options.length - 1);
          return;
        case "Enter":
        case " ":
          e.preventDefault();
          // The synthetic click arrives in the same task. Drop the guard right
          // after, or a browser that honours preventDefault (no click at all)
          // would leave it armed and swallow the user's NEXT real click.
          skipNextClickRef.current = true;
          setTimeout(() => {
            skipNextClickRef.current = false;
          }, 0);
          if (isOpen && activeIndex >= 0) {
            handleSelect(options[activeIndex].value, options[activeIndex].label);
          } else {
            openList();
          }
          return;
        case "Escape":
          if (!isOpen) return;
          e.preventDefault();
          closeList();
          return;
        case "Tab":
          if (isOpen) closeList();
          return;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            typeahead(e.key);
          }
      }
    };

    const handleSelect = (val: string, label: string) => {
      setDisplayValue(label);
      setIsOpen(false);
      setActiveIndex(-1);
      triggerRef.current?.focus();
      if (internalRef.current) {
        // Set the value on the hidden native select and fire a native change event.
        // React picks up the native 'change' event via its event delegation system,
        // so react-hook-form's onChange is invoked automatically — no manual call needed.
        internalRef.current.value = val;
        internalRef.current.dispatchEvent(
          new Event("change", { bubbles: true }),
        );
      }
    };

    return (
      <div className="grid gap-2 w-full relative" ref={dropdownRef}>
        {label && (
          <label
            id={labelId}
            htmlFor={id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}

        {/* Hidden native select for form integration */}
        <select
          id={id}
          className="hidden"
          ref={setRefs}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...props}
        >
          {children}
        </select>

        {/* The real control. This was a plain <div> with only an onClick, and
            the native <select> beside it is display:none — so every dropdown in
            the onboarding application was unreachable by keyboard and unnamed
            to screen readers. It has to be a focusable, labelled button. */}
        <button
          type="button"
          ref={triggerRef}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={
            isOpen && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
          }
          aria-labelledby={label ? labelId : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          disabled={props.disabled}
          onClick={() => {
            if (skipNextClickRef.current) {
              skipNextClickRef.current = false;
              return;
            }
            if (isOpen) closeList();
            else openList();
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex min-w-0 h-10 w-full items-center justify-between rounded-lg border border-input dark:border-input/50 bg-background px-3 py-2 cursor-pointer text-left",
            "text-sm text-foreground shadow-sm shadow-black/5 transition-all duration-200",
            "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
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
            {displayValue || "Select an option..."}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 opacity-50 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div
            role="listbox"
            className="absolute top-[calc(100%+4px)] z-50 w-full rounded-md border border-border bg-background text-foreground shadow-md animate-in fade-in-80 slide-in-from-top-1 py-1 max-h-60 overflow-y-auto scrollbar-thin"
          >
            {options.map((opt, i) => {
              const selected = internalRef.current?.value === opt.value;
              const active = i === activeIndex;
              return (
                <div
                  key={opt.value}
                  id={`${listboxId}-${i}`}
                  role="option"
                  aria-selected={selected}
                  // Keeps the keyboard-highlighted option in view while arrowing
                  // through a long list (there are 8 curriculum boards).
                  ref={
                    active
                      ? (el) => el?.scrollIntoView({ block: "nearest" })
                      : undefined
                  }
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    active && "bg-accent text-accent-foreground",
                    selected && "bg-primary/10 text-primary font-medium",
                  )}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => handleSelect(opt.value, opt.label)}
                >
                  <span className="truncate">{opt.label || " "}</span>
                </div>
              );
            })}
          </div>
        )}

        {hint && !error && (
          <p id={hintId} className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-destructive font-medium mt-0.5">
            {error}
          </p>
        )}
      </div>
    );
  },
);
AuthSelect.displayName = "AuthSelect";

// ─── Submit Button ────────────────────────────────────────────────────────────

export interface AuthSubmitButtonProps extends Omit<ButtonProps, "type"> {
  icon: React.ElementType;
  isLoading?: boolean;
}

export const AuthSubmitButton = React.forwardRef<
  HTMLButtonElement,
  AuthSubmitButtonProps
>(({ icon: Icon, isLoading = false, children, className, ...props }, ref) => (
  <AuthButton
    ref={ref}
    type="submit"
    disabled={isLoading}
    className={cn("w-full", className)}
    {...props}
  >
    {isLoading ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      <Icon className="h-4 w-4" />
    )}
    {children}
  </AuthButton>
));
AuthSubmitButton.displayName = "AuthSubmitButton";

// ─── Typewriter ───────────────────────────────────────────────────────────────

export interface TypewriterProps {
  text: string | string[];
  speed?: number;
  cursor?: string;
  loop?: boolean;
  deleteSpeed?: number;
  delay?: number;
  className?: string;
}

export function Typewriter({
  text,
  speed = 100,
  cursor = "|",
  loop = false,
  deleteSpeed = 50,
  delay = 1500,
  className,
}: TypewriterProps) {
  const textArray = Array.isArray(text) ? text : [text];

  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [textArrayIndex, setTextArrayIndex] = useState(0);

  const currentText = textArray[textArrayIndex] ?? "";

  useEffect(() => {
    if (!currentText) return;

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (currentIndex < currentText.length) {
            setDisplayText((prev) => prev + currentText[currentIndex]);
            setCurrentIndex((prev) => prev + 1);
          } else if (loop) {
            setTimeout(() => setIsDeleting(true), delay);
          }
        } else {
          if (displayText.length > 0) {
            setDisplayText((prev) => prev.slice(0, -1));
          } else {
            setIsDeleting(false);
            setCurrentIndex(0);
            setTextArrayIndex((prev) => (prev + 1) % textArray.length);
          }
        }
      },
      isDeleting ? deleteSpeed : speed,
    );

    return () => clearTimeout(timeout);
  }, [
    currentIndex,
    isDeleting,
    currentText,
    loop,
    speed,
    deleteSpeed,
    delay,
    displayText,
    text,
    textArray.length,
  ]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">{cursor}</span>
    </span>
  );
}
