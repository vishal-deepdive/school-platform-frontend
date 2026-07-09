import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  CornerDownLeft,
  UserCheck,
  Upload,
  MessageSquare,
  ClipboardCheck,
  FileQuestion,
  CalendarDays,
  FileUp,
  FileSpreadsheet,
} from "lucide-react";
import { navItems, adminNavItems, type NavItem } from "./navConfig";
import { useAuthStore } from "@/features/auth/store/auth";
import { roleCanAccess } from "@/shared/lib/permissions";
import { cn } from "@/shared/lib/utils";

interface Action {
  label: string;
  href: string;
  group: string;
  icon: React.ReactNode;
  /** Extra search terms so a verb-first action matches natural phrasing. */
  keywords?: string;
}

/**
 * Verb-first shortcuts to the thing you came to *do*, not just the page name.
 * Role-filtered by href (same source of truth as everything else) and shown
 * first so the palette is a doer's tool, not only a page switcher.
 */
const QUICK_ACTIONS: Omit<Action, "group">[] = [
  {
    label: "Mark today's attendance",
    href: "/attendance/mark",
    icon: <UserCheck className="h-4 w-4" />,
    keywords: "take register present absent photo",
  },
  {
    label: "Take roll call",
    href: "/attendance/roll-call",
    icon: <ClipboardCheck className="h-4 w-4" />,
    keywords: "attendance manual class",
  },
  {
    label: "Upload a recording",
    href: "/recording/upload",
    icon: <Upload className="h-4 w-4" />,
    keywords: "lecture audio new transcribe",
  },
  {
    label: "Ask a question",
    href: "/rag/qa",
    icon: <MessageSquare className="h-4 w-4" />,
    keywords: "doubt query textbook study assistant",
  },
  {
    label: "Generate a practice test",
    href: "/rag/questions",
    icon: <FileQuestion className="h-4 w-4" />,
    keywords: "quiz exam questions create",
  },
  {
    label: "Add a holiday",
    href: "/attendance/holidays",
    icon: <CalendarDays className="h-4 w-4" />,
    keywords: "calendar day off",
  },
  {
    label: "Import students",
    href: "/students/import",
    icon: <FileUp className="h-4 w-4" />,
    keywords: "roster upload csv add",
  },
  {
    label: "Connect a survey sheet",
    href: "/survey/source",
    icon: <FileSpreadsheet className="h-4 w-4" />,
    keywords: "google feedback data source add",
  },
];

/** Flatten the nav tree into role-filtered leaf actions for the palette. */
function buildActions(role: string | null | undefined, isAdmin: boolean): Action[] {
  const out: Action[] = [];

  // Quick actions first — the doer's shortcuts.
  for (const qa of QUICK_ACTIONS) {
    if (roleCanAccess(qa.href, role as never)) {
      out.push({ ...qa, group: "Quick actions" });
    }
  }

  // Then every reachable page, grouped by its module.
  const source: NavItem[] = [...navItems, ...(isAdmin ? adminNavItems : [])];
  const push = (item: NavItem, group: string) => {
    if (item.href && roleCanAccess(item.href, role as never)) {
      out.push({ label: item.label, href: item.href, group, icon: item.icon });
    }
  };
  for (const item of source) {
    if (item.children?.length) {
      item.children.forEach((c) => push(c, item.label));
    } else {
      push(item, "General");
    }
  }
  return out;
}

/**
 * Global command palette (Ctrl/Cmd+K). Fuzzy-ish substring search over the same
 * role-filtered navigation used by the sidebar, with full keyboard control
 * (↑/↓ to move, Enter to open, Esc to close). Mount once in the app shell.
 */
export function CommandPalette() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const actions = useMemo(
    () => buildActions(user?.role, isAdmin),
    [user?.role],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q) ||
        a.keywords?.toLowerCase().includes(q),
    );
  }, [actions, query]);

  // Global open/close shortcut + a custom event so any button (e.g. the header
  // search affordance) can open it without prop drilling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  // Escape only fires when the palette is open — avoids interfering with other
  // Escape handlers (modals, drawers) when the palette is closed.
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  // Reset + focus whenever it opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // Focus after paint.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Keep the active row clamped when results change.
  useEffect(() => {
    if (active >= results.length) setActive(results.length ? results.length - 1 : 0);
  }, [results, active]);

  // Scroll the active row into view whenever it changes (arrow key nav, result changes).
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const activeEl = list.querySelectorAll('[role="option"]')[active] as HTMLElement | undefined;
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = results[active];
      if (sel) go(sel.href);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[15vh] backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in zoom-in-95 slide-in-from-top-2 duration-150"
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Search pages and actions…"
            aria-label="Search pages and actions"
            className="w-full bg-transparent py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            ESC
          </kbd>
        </div>

        <ul
          ref={listRef}
          role="listbox"
          aria-label="Results"
          className="max-h-[50vh] overflow-y-auto py-2"
        >
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              No matches for “{query}”.
            </li>
          ) : (
            results.map((a, i) => (
              <li
                key={`${a.group}:${a.href}`}
                role="option"
                aria-selected={i === active}
              >
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(a.href)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                    i === active
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground",
                  )}
                >
                  <span className="shrink-0 text-muted-foreground">{a.icon}</span>
                  <span className="flex-1 truncate">{a.label}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {a.group}
                  </span>
                  {i === active && (
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
