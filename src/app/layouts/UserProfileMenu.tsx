import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Moon, Sun, User as UserIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/features/auth/store/auth";
import { authApi } from "@/features/auth/api/auth";
import { useTheme } from "@/shared/hooks/useTheme";
import { cn, getErrorMessage } from "@/shared/lib/utils";

interface UserProfileMenuProps {
  mobile?: boolean;
}

export function UserProfileMenu({ mobile }: UserProfileMenuProps) {
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      logout();
      navigate("/login");
      setLoggingOut(false);
    }
  };

  const avatarChar =
    user?.full_name?.charAt(0).toUpperCase() ??
    user?.email?.charAt(0).toUpperCase() ??
    "U";

  return (
    <div className="relative w-full flex justify-center group">
      {mobile ? (
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-muted/50 transition-colors"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-foreground font-bold shadow-sm ring-1 ring-border">
            {avatarChar}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {user?.full_name ?? "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <>
          <button
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-background text-foreground font-bold shadow-sm ring-1 ring-border transition-all duration-200 hover:bg-muted/50"
            aria-label="User Profile"
          >
            {avatarChar}
          </button>
          {!open && (
            <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap">
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
              "absolute z-50 w-64 rounded-xl border border-border bg-background shadow-xl shadow-black/5 overflow-hidden animate-in fade-in zoom-in-95 duration-200",
              mobile
                ? "bottom-[calc(100%+8px)] left-0"
                : "bottom-0 left-[calc(100%+16px)]",
            )}
          >
            {/* Dropdown Header */}
            <div className="border-b border-border/50 bg-muted/30 py-3 px-6">
              <p className="text-sm font-semibold text-foreground truncate">
                {user?.full_name ?? "User"} 
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {user?.email}
              </p>
            </div>

            {/* Dropdown Links */}
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/profile");
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
              >
                <UserIcon className="h-4 w-4" />
                My Profile
              </button>

              <button
                onClick={toggleTheme}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
              >
                <div className="flex items-center gap-3">
                  {isDark ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                  Theme
                </div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">
                  {isDark ? "Dark" : "Light"}
                </span>
              </button>

              <div className="my-1 border-t border-border/50" />

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all"
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
