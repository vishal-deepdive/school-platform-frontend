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
  /** "fill" — fills parent container (no own border/size). "sm" — 36px. "md" — 40px. */
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
            ? "h-9 w-9 shrink-0 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shadow-sm"
            : "h-10 w-10 shrink-0 rounded-xl object-cover border border-slate-300 dark:border-slate-700 shadow-sm"
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
        "flex shrink-0 items-center justify-center bg-background text-foreground font-bold shadow-sm border border-slate-300 dark:border-slate-700",
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
      admin: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      principal: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      teacher: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      student: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      parent: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    };
    const colorClass =
      colors[role.toLowerCase()] || "bg-slate-500/10 text-slate-500 border-slate-500/20";
    return (
      <span
        className={cn(
          "inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase border",
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
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-muted/50 transition-colors"
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
              <p className="text-sm font-semibold text-foreground truncate">
                {user?.full_name ?? "User"}
              </p>
              {getRoleBadge(user?.role)}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
              {contactLine}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
        </button>
      ) : (
        <>
          <button
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-background text-foreground font-bold shadow-sm border border-slate-300 dark:border-slate-700 transition-all duration-200 hover:bg-muted/50 overflow-hidden"
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
              "absolute z-50 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-background shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_0_20px_rgba(255,255,255,0.07)] overflow-hidden animate-in fade-in zoom-in-95 duration-200",
              mobile
                ? "bottom-[calc(100%+8px)] left-0"
                : "bottom-0 left-[calc(100%+16px)]",
            )}
          >
            {/* Dropdown header */}
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-muted/30 p-3">
              <UserAvatar
                url={user?.avatar_url}
                name={displayName}
                size="sm"
                error={imgError}
                onError={() => setImgError(true)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user?.full_name ?? "User"}
                  </p>
                  {getRoleBadge(user?.role)}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                  {contactLine}
                </p>
              </div>
            </div>

            {/* Dropdown links */}
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/profile");
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-muted/50 hover:text-foreground transition-all"
              >
                <UserIcon className="h-4 w-4" />
                My Profile
              </button>

              <button
                onClick={toggleTheme}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-muted/50 hover:text-foreground transition-all"
              >
                <div className="flex items-center gap-3">
                  {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  Theme
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  {isDark ? "Dark" : "Light"}
                </span>
              </button>

              <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-500/80 dark:text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300 transition-all"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
