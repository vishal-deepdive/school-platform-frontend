import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Briefcase, Users, GraduationCap } from "lucide-react";
import toast from "@/shared/lib/toast";
import { useAuthStore } from "@/features/auth/store/auth";
import { AuthPageHeader } from "@/shared/components/common/AuthPageHeader";
import {
  LoginForm,
  MobileLoginForm,
  StudentLoginForm,
} from "@/features/auth/components";

const tabs = [
  { id: "staff", label: "Staff", icon: Briefcase },
  { id: "parent", label: "Parent", icon: Users },
  { id: "student", label: "Student", icon: GraduationCap },
] as const;

type TabType = (typeof tabs)[number]["id"];

export function LoginPage() {
  const location = useLocation();
  const { logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("staff");

  const locationState = location.state as {
    from?: { pathname: string };
    incompleteProfile?: boolean;
  } | null;
  const from = locationState?.from?.pathname ?? "/dashboard";
  const incompleteProfile = locationState?.incompleteProfile === true;

  useEffect(() => {
    if (!incompleteProfile) return;
    logout();
    toast.error(
      "Your account profile is incomplete. Please sign in with Google again to finish setup.",
      { duration: 6000 },
    );
  }, [incompleteProfile, logout]);

  return (
    <div className="mx-auto grid w-full max-w-[400px] gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AuthPageHeader
        title="Sign in to your account"
        subtitle="Welcome back! Enter your details to continue."
        className="mb-2"
      />

      <div
        role="tablist"
        className="mb-2 flex gap-1 p-1.5 bg-muted rounded-xl border border-border/50"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-login-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-sm font-semibold rounded-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? "text-primary bg-background shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* All panels always mounted — CSS toggles visibility to preserve entered data */}
      <div className="relative">
        <div
          id="tabpanel-login-staff"
          role="tabpanel"
          className={activeTab !== "staff" ? "hidden" : ""}
        >
          <LoginForm redirectPath={from} />
        </div>
        <div
          id="tabpanel-login-parent"
          role="tabpanel"
          className={activeTab !== "parent" ? "hidden" : ""}
        >
          <MobileLoginForm redirectPath={from} />
        </div>
        <div
          id="tabpanel-login-student"
          role="tabpanel"
          className={activeTab !== "student" ? "hidden" : ""}
        >
          <StudentLoginForm redirectPath={from} />
        </div>
      </div>

      {activeTab !== "staff" && (
        <p className="text-center text-sm text-muted-foreground mt-2">
          Staff member?{" "}
          <button
            type="button"
            onClick={() => setActiveTab("staff")}
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Sign in with email
          </button>
        </p>
      )}
    </div>
  );
}
