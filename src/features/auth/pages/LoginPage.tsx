import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "@/features/auth/store/auth";
import { AuthPageHeader } from "@/shared/components/common/AuthPageHeader";
import { LoginForm } from "@/features/auth/components";

export function LoginPage() {
  const location = useLocation();
  const { logout } = useAuthStore();

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
        className="mb-4"
      />

      <LoginForm redirectPath={from} />
    </div>
  );
}
