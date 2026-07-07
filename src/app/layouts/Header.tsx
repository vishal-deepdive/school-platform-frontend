import { Menu, Search } from "lucide-react";
import { Tooltip } from "@/shared/components/ui/Tooltip";

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="md:hidden flex h-16 items-center justify-between border-b border-border/60 bg-background/90 backdrop-blur-md px-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <img
          src="/favicon.png"
          alt="DeepDive Logo"
          className="h-8 w-8 object-contain"
        />
      </div>
      <div className="flex items-center gap-1">
        <Tooltip content="Search" shortcut="Ctrl K" side="bottom">
          <button
            onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
            className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Search pages and actions"
          >
            <Search className="h-5 w-5" />
          </button>
        </Tooltip>
        <Tooltip content="Toggle menu" side="bottom">
          <button
            onClick={onMenuToggle}
            className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
