import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Moon, Sun, User as UserIcon } from "lucide-react";
import toast from "@/shared/lib/toast";
import { useAuthStore } from "@/features/auth/store/auth";
import { authApi } from "@/features/auth/api/auth";
import { useTheme } from "@/shared/hooks/useTheme";
import { cn, getErrorMessage } from "@/shared/lib/utils";

interface UserProfileMenuProps {
  mobile?: boolean;
}

/** Renders the user's avatar image with a lettered fallback. */
function UserAvatar({
  url,
  name,
  size,
  error,
  onError,
}: {
  url?: string | null;
  name: string;
  /** "fill" — fills parent container. "sm" — 36px. "md" — 40px. */
  size: "fill" | "sm" | "md";
  error: boolean;
  onError: () => void;
}) {
  const char = (name.trim().charAt(0) || "U").toUpperCase();

  if (url && !error) {
    return (
      <img
        src={url}
        alt={name || "User"}
        className={
          size === "fill"
            ? "h-full w-full object-cover"
            : size === "sm"
            ? "h-9 w-9 shrink-0 rounded-lg object-cover border border-border shadow-xs"
            : "h-10 w-10 shrink-0 rounded-xl object-cover border border-border shadow-xs"
        }
        referrerPolicy="no-referrer"
        onError={onError}
      />
    );
  }

  if (size === "fill") return <>{char}</>;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-background text-foreground font-bold shadow-xs border border-border text-sm",
        size === "sm" ? "h-9 w-9 rounded-lg" : "h-10 w-10 rounded-xl",
      )}
    >
      {char}
    </div>
  );
}

export function UserProfileMenu({ mobile }: UserProfileMenuProps) {
  const { user, isAuthenticated, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [user?.avatar_url]);

  // Fetch profile once when the user has nothing to display yet — no name AND
  // no contact identifier (a guardian whose enrollment row had no
  // guardian_name would otherwise show a blank avatar/label forever, since
  // the JWT never carries `mobile`). We track by userId so that calling
  // updateUser (which creates a new user object reference) can never
  // retrigger this effect — avoiding an infinite loop.
  const fetchedForUserId = useRef<string | null>(null);
  useEffect(() => {
    if (
      !user?.id ||
      user.full_name ||
      user.email ||
      user.mobile ||
      fetchedForUserId.current === user.id
    )
      return;
    fetchedForUserId.current = user.id;
    let cancelled = false;
    authApi
      .me()
      .then((profile) => {
        if (!cancelled)
          updateUser({
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            email: profile.email,
            mobile: profile.mobile,
          });
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.full_name, user?.email, user?.mobile, updateUser]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (isAuthenticated) await authApi.logout();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      logout();
      navigate("/login");
      setLoggingOut(false);
    }
  };

  const displayName = user?.full_name ?? user?.email ?? user?.mobile ?? "";
  const contactLine = user?.email ?? user?.mobile ?? "";

  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    const colors: Record<string, string> = {
      admin: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
      principal: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
      teacher: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
      student: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      parent: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    };
    const colorClass =
      colors[role.toLowerCase()] || "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30";
    return (
      <span
        className={cn(
          "inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase border shadow-2xs",
          colorClass,
        )}
      >
        {role}
      </span>
    );
  };

  return (
    <div className="relative w-full flex justify-center group">
      {mobile ? (
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 hover:bg-muted/60 transition-all"
        >
          <UserAvatar
            url={user?.avatar_url}
            name={displayName}
            size="md"
            error={imgError}
            onError={() => setImgError(true)}
          />
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {user?.full_name ?? "User"}
              </p>
              {getRoleBadge(user?.role)}
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate mt-0.5">
              {contactLine}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
        </button>
      ) : (
        <>
          <button
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white font-bold shadow-sm border border-white/20 transition-all duration-200 hover:border-white/40 hover:bg-white/20 hover:ring-2 hover:ring-white/25 overflow-hidden"
            aria-label="User Profile"
          >
            <UserAvatar
              url={user?.avatar_url}
              name={displayName}
              size="fill"
              error={imgError}
              onError={() => setImgError(true)}
            />
          </button>
          {!open && (
            <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none z-50 whitespace-nowrap">
              Profile
              <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-[4px] border-transparent border-r-foreground" />
            </div>
          )}
        </>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={cn(
              "absolute z-50 w-64 rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-lg dark:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden animate-in fade-in zoom-in-95 duration-150",
              mobile
                ? "bottom-[calc(100%+8px)] left-0"
                : "bottom-0 left-[calc(100%+12px)]",
            )}
          >
            {/* Dropdown header */}
            <div className="flex items-center gap-3 border-b border-border/60 bg-muted/40 p-3">
              <UserAvatar
                url={user?.avatar_url}
                name={displayName}
                size="sm"
                error={imgError}
                onError={() => setImgError(true)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {user?.full_name ?? "User"}
                  </p>
                  {getRoleBadge(user?.role)}
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate mt-0.5">
                  {contactLine}
                </p>
              </div>
            </div>

            {/* Dropdown links */}
            <div className="p-1.5 space-y-0.5">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/profile");
                }}
                className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-muted/70 hover:text-foreground transition-colors"
              >
                <UserIcon className="h-4 w-4 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors" />
                <span>My Profile</span>
              </button>

              <button
                onClick={toggleTheme}
                className="group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-muted/70 hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {isDark ? (
                    <Moon className="h-4 w-4 text-blue-400" />
                  ) : (
                    <Sun className="h-4 w-4 text-amber-500" />
                  )}
                  <span>Theme</span>
                </div>
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border border-border/70 shadow-2xs">
                  {isDark ? "Dark" : "Light"}
                </span>
              </button>

              <div className="my-1 border-t border-border/60" />

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 transition-colors disabled:opacity-50"
              >
                <LogOut className="h-4 w-4 text-rose-500 group-hover:scale-105 transition-transform" />
                <span>{loggingOut ? "Logging out..." : "Log out"}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
