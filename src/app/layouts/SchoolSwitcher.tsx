import { useState } from "react";
import { School, ChevronDown, Check, Search, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/shared/components/ui/Popover";
import { useSchoolSearch } from "@/shared/hooks/useSchoolSearch";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useActiveSchoolStore } from "@/shared/store/activeSchool";
import { cn } from "@/shared/lib/utils";

/**
 * Compact "acting as" school pill. This is the single place an admin selects the
 * school the whole app operates on — it lives in the Dashboard header (top-right)
 * only. Admin-only: every other role is scoped to their own school server-side,
 * so there is nothing to switch and this renders nothing. The selection is
 * persisted (see `useActiveSchoolStore`), so it survives reloads.
 */
export function SchoolSwitcherPill() {
  const { isAdmin } = useActiveSchool();
  const school = useActiveSchoolStore((s) => s.school);
  const setSchool = useActiveSchoolStore((s) => s.setSchool);
  const { query, setQuery, options, isSearching } = useSchoolSearch();
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

  // The search only returns options for the current query, so the selected
  // school may be absent (e.g. right after a reload). Inject it so its name
  // always renders in the pill instead of falling back to the placeholder.
  const mergedOptions =
    school && !options.some((o) => o.value === school.id)
      ? [{ label: school.name, value: school.id }, ...options]
      : options;

  const handleSelect = (id: string, name: string) => {
    setSchool({ id, name });
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 max-w-[15rem] items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
            "border-border/70 bg-card text-foreground shadow-sm shadow-black/5 hover:border-primary/50 hover:bg-muted/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
            open && "border-primary/50 ring-2 ring-primary/20",
          )}
          aria-label="Select active school"
        >
          <School className="h-4 w-4 shrink-0 text-primary" />
          <span className={cn("truncate", !school && "text-muted-foreground")}>
            {school?.name ?? "Select school"}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search schools…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto scrollbar-thin p-1.5">
          {isSearching ? (
            <div className="flex items-center justify-center px-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : mergedOptions.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No schools found.
            </div>
          ) : (
            mergedOptions.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => handleSelect(opt.value, opt.label)}
                className={cn(
                  "flex w-full cursor-pointer select-none flex-col rounded-md px-3 py-2 text-left text-sm outline-none transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  school?.id === opt.value && "bg-primary/10 text-primary font-medium",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{opt.label}</span>
                  {school?.id === opt.value && (
                    <Check className="h-4 w-4 shrink-0" />
                  )}
                </div>
                {opt.sublabel && (
                  <span className="mt-0.5 truncate text-xs text-muted-foreground">
                    {opt.sublabel}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
