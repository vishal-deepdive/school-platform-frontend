import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "./Button";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

interface FilterToolbarProps {
  /** Always-visible controls (search, key selects) in one wrapping row. */
  children: React.ReactNode;
  /** Secondary fields tucked into a "More filters" popover. */
  more?: React.ReactNode;
  /** How many `more` fields are set — badged on the trigger so they're never hidden silently. */
  moreCount?: number;
  hasFilters?: boolean;
  onClear?: () => void;
  /** Right-aligned content, typically a `StatLine`. */
  end?: React.ReactNode;
  className?: string;
}

/**
 * Compact list-page filter row: a search box and the few filters people use
 * most stay inline, the rest live behind "More filters", and a Clear button
 * appears once anything is set. Replaces the tall labelled `FilterBar` card
 * on list pages; keep `FilterBar` for forms whose submit is bound to inputs.
 */
export function FilterToolbar({
  children,
  more,
  moreCount = 0,
  hasFilters = false,
  onClear,
  end,
  className,
}: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {more && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-10 data-[state=open]:border-primary"
                icon={<SlidersHorizontal className="h-4 w-4" />}
              >
                More filters
                {moreCount > 0 && (
                  <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground">
                    {moreCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 space-y-3 p-4">
              {more}
            </PopoverContent>
          </Popover>
        )}
        {hasFilters && onClear && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            icon={<X className="h-3.5 w-3.5" />}
            className="text-muted-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>
      {end && <div className="min-w-0 lg:text-right">{end}</div>}
    </div>
  );
}
