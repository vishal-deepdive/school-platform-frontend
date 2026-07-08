import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/shared/hooks/useTheme";
import { Tooltip } from "./Tooltip";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Tooltip content={label} side="bottom">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
      </button>
    </Tooltip>
  );
}
