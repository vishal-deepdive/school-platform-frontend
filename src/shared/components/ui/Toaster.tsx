import { Toaster as SonnerToaster } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { useIsDark } from "@/shared/hooks/useIsDark";

/**
 * App-wide toast host. Built on sonner for its collapsed-stack behaviour:
 * multiple toasts pile into a single stack and fan out on hover, with
 * swipe-to-dismiss and reduced-motion support handled by the library.
 *
 * Visuals are themed to the DeepDive design system in index.css (see the
 * `.dd-toaster` overrides) — card/foreground/border tokens for the neutral
 * toast and the Alert component's green/amber/blue/red palette for the
 * semantic ones. Icons mirror `Alert.tsx` so a toast reads as a transient
 * Alert. Emit toasts via `toast` from `@/shared/lib/toast`.
 */
export function Toaster() {
  const isDark = useIsDark();

  return (
    <SonnerToaster
      className="dd-toaster"
      theme={isDark ? "dark" : "light"}
      position="bottom-right"
      richColors
      closeButton
      expand={false}
      visibleToasts={4}
      gap={12}
      offset={16}
      duration={4000}
      toastOptions={{ className: "dd-toast" }}
      icons={{
        success: <CheckCircle2 className="h-[18px] w-[18px]" />,
        error: <AlertCircle className="h-[18px] w-[18px]" />,
        warning: <AlertTriangle className="h-[18px] w-[18px]" />,
        info: <Info className="h-[18px] w-[18px]" />,
        loading: <Loader2 className="h-[18px] w-[18px] animate-spin" />,
        close: <X className="h-3.5 w-3.5" />,
      }}
    />
  );
}
