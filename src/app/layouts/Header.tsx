import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, LogOut, User, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth";
import { authApi } from "@/features/auth/api/auth";
import { getErrorMessage } from "@/shared/lib/utils";
import toast from "react-hot-toast";
import { Badge, ThemeToggle } from "@/shared/components/ui";

interface HeaderProps {
  onMenuToggle: () => void;
}

const roleBadge: Record<string, "info" | "purple" | "default"> = {
  admin: "purple",
  teacher: "info",
  viewer: "default",
};

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-6 sticky top-0 z-40">
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors md:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden md:block" />

      <div className="relative flex items-center gap-3">
        {user && (
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant={roleBadge[user.role] ?? "default"}>
              {user.role}
            </Badge>
            <span className="text-sm text-gray-500">
              {user.full_name ?? user.email}
            </span>
          </div>
        )}

        <ThemeToggle />

        <button
          onClick={() => setMenuOpen((p) => !p)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm">
            {user?.full_name?.charAt(0).toUpperCase() ??
              user?.email?.charAt(0).toUpperCase() ??
              "U"}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 z-20 w-52 rounded-xl border border-border bg-background shadow-lg shadow-black/10">
              <div className="border-b border-border/50 px-4 py-3">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.full_name ?? "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/profile");
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Logging out…" : "Logout"}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
