import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/shared/hooks/useTheme";

export function ThemeToggle() {
  const { toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 transition-all scale-100 rotate-0 dark:scale-0 dark:-rotate-90 absolute" />
      <Moon className="h-4 w-4 transition-all scale-0 rotate-90 dark:scale-100 dark:rotate-0 absolute" />
    </button>
  );
}
