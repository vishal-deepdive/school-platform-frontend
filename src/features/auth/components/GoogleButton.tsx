import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { AuthButton } from "@/shared/components/ui/auth-fuse";
import { GoogleIcon } from "./GoogleIcon";
import {
  useGoogleAuth,
  type GoogleAuthOptions,
} from "@/features/auth/hooks/useGoogleAuth";

interface GoogleButtonProps {
  /** Sign-up hints (role / school / invite token) passed through the redirect. */
  options?: GoogleAuthOptions;
  label?: string;
  className?: string;
  variant?: "outline" | "default";
}

/**
 * "Continue with Google" button with a built-in in-flight state, so a slow
 * network can't produce two OAuth attempts from a double-click.
 */
export function GoogleButton({
  options,
  label = "Continue with Google",
  className,
  variant = "outline",
}: GoogleButtonProps) {
  const { handleGoogleLogin, isPending } = useGoogleAuth();

  return (
    <AuthButton
      type="button"
      variant={variant}
      className={cn("w-full", className)}
      disabled={isPending}
      aria-busy={isPending}
      onClick={() => handleGoogleLogin(options)}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon />
      )}
      {isPending ? "Redirecting…" : label}
    </AuthButton>
  );
}
