import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Check, Loader2, FileSpreadsheet } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useClickOutside } from "@/shared/hooks/useClickOutside";
import { Badge } from "@/shared/components/ui/Badge";
import { surveyApi } from "@/features/survey/api/survey";
import type { SourceItem } from "@/features/survey/types";

interface SheetSelectorProps {
  /** Currently selected source (sheet) ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** Optional school scope (admins inspecting one school). */
  schoolName?: string;
  /** Show each sheet's school in the label — useful for admins (cross-school). */
  showSchoolName?: boolean;
  /**
   * Fires whenever the active sheet list (re)loads. The parent uses it to
   * default-select the latest attached sheet exactly once.
   */
  onSheetsLoaded?: (sheets: SourceItem[]) => void;
}

/** Human label for a sheet, falling back through label → school → sheet id. */
function sheetLabel(s: SourceItem): string {
  return s.label || s.school_name || s.sheet_id || "Untitled sheet";
}

export function SheetSelector({
  value,
  onChange,
  disabled = false,
  schoolName,
  showSchoolName = false,
  onSheetsLoaded,
}: SheetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setIsOpen(false));

  const { data, isLoading } = useQuery({
    queryKey: ["survey", "sources", schoolName ?? null],
    queryFn: () => surveyApi.getSources(schoolName),
    staleTime: 60_000,
  });

  // Only active sheets are selectable; the API returns them newest-first.
  const sheets = useMemo(
    () => (data?.sources ?? []).filter((s) => s.is_active),
    [data],
  );

  // Let the parent seed a default selection once sheets are available.
  useEffect(() => {
    if (sheets.length > 0) onSheetsLoaded?.(sheets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheets]);

  const selectedSet = useMemo(() => new Set(value), [value]);
  // Empty selection means "no source filter" → search every sheet the caller can
  // access (the backend treats source_ids=None as all). This is also the robust
  // default for data imported before sheet-sources existed (source_id IS NULL),
  // which an explicit id filter would exclude.
  const allMode = value.length === 0;

  const selectAll = () => {
    onChange([]);
  };

  const toggleOne = (id: string) => {
    onChange(
      selectedSet.has(id)
        ? value.filter((v) => v !== id)
        : [...value, id],
    );
  };

  // Chips for the trigger; cap the visible count and overflow with "+N".
  const selectedSheets = sheets.filter((s) => selectedSet.has(s.id));
  const MAX_CHIPS = 2;
  const visibleChips = selectedSheets.slice(0, MAX_CHIPS);
  const overflow = selectedSheets.length - visibleChips.length;

  return (
    <div className="grid gap-1.5 w-full relative" ref={containerRef}>
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Sheets to search
      </label>

      <div
        onClick={() => !disabled && setIsOpen((o) => !o)}
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-1.5 cursor-pointer",
          "text-sm text-foreground shadow-sm transition-all duration-200 select-none",
          "hover:border-primary/50",
          isOpen && "ring-2 ring-primary/20 border-primary",
          disabled && "opacity-50 cursor-not-allowed hover:border-input",
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1 py-0.5">
          {isLoading ? (
            <span className="text-muted-foreground/70">Loading sheets…</span>
          ) : allMode ? (
            <Badge variant="primary">All sheets</Badge>
          ) : (
            <>
              {visibleChips.map((s) => (
                <Badge key={s.id} variant="default" className="max-w-[180px]">
                  <span className="truncate">{sheetLabel(s)}</span>
                </Badge>
              ))}
              {overflow > 0 && <Badge variant="default">+{overflow}</Badge>}
            </>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 opacity-50 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] z-50 w-full rounded-md border border-border bg-background text-foreground shadow-md animate-in fade-in-80 slide-in-from-top-1 flex flex-col max-h-72 overflow-hidden">
          <div className="overflow-y-auto scrollbar-thin p-1">
            {isLoading ? (
              <div className="px-3 py-4 text-sm text-muted-foreground flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading sheets…
              </div>
            ) : sheets.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No active sheets for this school. Add one in the Data Source tab.
              </div>
            ) : (
              <>
                {/* All-sheets shortcut — clears the filter (searches everything) */}
                <OptionRow
                  label="All sheets"
                  sublabel="Search across every sheet"
                  checked={allMode}
                  onClick={selectAll}
                  emphasized
                />
                <div className="my-1 border-t border-border/50" />
                {sheets.map((s) => {
                  const sub = [s.cycle, showSchoolName ? s.school_name : null]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <OptionRow
                      key={s.id}
                      label={sheetLabel(s)}
                      sublabel={sub || undefined}
                      checked={selectedSet.has(s.id)}
                      onClick={() => toggleOne(s.id)}
                    />
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OptionRow({
  label,
  sublabel,
  checked,
  onClick,
  emphasized = false,
}: {
  label: string;
  sublabel?: string;
  checked: boolean;
  onClick: () => void;
  emphasized?: boolean;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center gap-2.5 rounded-sm py-2 px-2.5 text-sm outline-none transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          checked
            ? "bg-primary border-primary text-primary-foreground"
            : "border-input bg-background",
        )}
      >
        {checked && <Check className="h-3 w-3" />}
      </span>
      <span className="flex flex-col min-w-0 flex-1">
        <span className={cn("truncate", emphasized && "font-medium")}>
          {label}
        </span>
        {sublabel && (
          <span className="text-xs text-muted-foreground truncate">
            {sublabel}
          </span>
        )}
      </span>
    </div>
  );
}
