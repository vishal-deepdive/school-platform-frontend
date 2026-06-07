import * as React from "react";
import { useState, useId, useEffect } from "react";
import { Slot } from "@radix-ui/react-slot";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { Eye, EyeOff, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
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
        link: "text-primary-foreground/60 underline-offset-4 hover:underline",
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
  return (
    <div className="grid gap-2 w-full">
      {label && <Label htmlFor={id}>{label}</Label>}
      <input
        id={id}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input dark:border-input/50 bg-background px-3 py-3 text-sm text-foreground shadow-sm shadow-black/5 transition-shadow placeholder:text-muted-foreground/70 focus-visible:bg-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive",
          className,
        )}
        ref={ref}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
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
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="grid w-full items-center gap-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          className={cn(
            "flex h-10 w-full rounded-lg border border-input dark:border-input/50 bg-background px-3 py-3 text-sm text-foreground shadow-sm shadow-black/5 transition-shadow placeholder:text-muted-foreground/70 focus-visible:bg-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 pe-10",
            error && "border-destructive focus-visible:ring-destructive",
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
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
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
    const [isOpen, setIsOpen] = useState(false);
    const [displayValue, setDisplayValue] = useState("");
    const internalRef = React.useRef<HTMLSelectElement | null>(null);
    const dropdownRef = React.useRef<HTMLDivElement | null>(null);

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

    const handleSelect = (val: string, label: string) => {
      setDisplayValue(label);
      setIsOpen(false);
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
            htmlFor={id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}

        {/* Hidden native select for form integration */}
        <select id={id} className="hidden" ref={setRefs} {...props}>
          {children}
        </select>

        {/* Custom visual button */}
        <div
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() => setIsOpen((o) => !o)}
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
            {displayValue || "Select an option..."}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 opacity-50 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </div>

        {/* Dropdown menu */}
        {isOpen && (
          <div
            role="listbox"
            className="absolute top-[calc(100%+4px)] z-50 w-full rounded-md border border-border bg-background text-foreground shadow-md animate-in fade-in-80 slide-in-from-top-1 py-1 max-h-60 overflow-y-auto scrollbar-thin"
          >
            {options.map((opt) => (
              <div
                key={opt.value}
                role="option"
                aria-selected={internalRef.current?.value === opt.value}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  internalRef.current?.value === opt.value &&
                    "bg-primary/10 text-primary font-medium",
                )}
                onClick={() => handleSelect(opt.value, opt.label)}
              >
                {opt.label || " "}
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
