import { RefreshCw } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "./Button";
import { Tooltip } from "./Tooltip";

interface RefreshButtonProps {
  onClick: () => void;
  /** Spins the icon while a background refetch is running. */
  refreshing?: boolean;
  label?: string;
}

/** Compact icon-only refresh, sized for the module header's actions slot. */
export function RefreshButton({ onClick, refreshing = false, label = "Refresh" }: RefreshButtonProps) {
  return (
    <Tooltip content={label} side="bottom">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onClick}
        aria-label={label}
        aria-busy={refreshing || undefined}
      >
        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
      </Button>
    </Tooltip>
  );
}
