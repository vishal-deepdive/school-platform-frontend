import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { loginSchema, type LoginFormData } from "@/features/auth/schema";
import { authApi } from "@/features/auth/api/auth";
import { useAuthStore } from "@/features/auth/store/auth";
import { getErrorMessage } from "@/shared/lib/utils";
import { decodeJwt, buildUserFromJwt } from "@/shared/lib/jwt";
import {
  AuthInput,
  AuthPasswordInput,
  AuthButton,
  AuthSubmitButton,
} from "@/shared/components/ui/auth-fuse";
import { OrDivider } from "@/shared/components/common/OrDivider";
import { GoogleIcon } from "./GoogleIcon";
import { useGoogleAuth } from "@/features/auth/hooks/useGoogleAuth";

export function LoginForm({
  redirectPath = "/dashboard",
}: {
  redirectPath?: string;
}) {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { handleGoogleLogin } = useGoogleAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const tokens = await authApi.login(data);
      login(
        tokens,
        buildUserFromJwt(decodeJwt(tokens.access_token), data.email),
      );
      toast.success("Welcome back!");
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const msg = getErrorMessage(err);
      if (
        msg.toLowerCase().includes("verify") ||
        msg.toLowerCase().includes("otp")
      ) {
        navigate("/verify-otp", {
          state: { email: data.email, purpose: "verify_email" },
        });
      } else {
        toast.error(msg);
      }
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-8"
        noValidate
      >
        <div className="grid gap-4">
          <AuthInput
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="m@example.com"
            error={errors.email?.message}
            {...register("email")}
          />

          <div className="flex flex-col gap-1.5">
            <AuthPasswordInput
              label="Password"
              autoComplete="current-password"
              placeholder="Password"
              error={errors.password?.message}
              {...register("password")}
            />
            <Link
              to="/forgot-password"
              className="self-end text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <AuthSubmitButton
            icon={LogIn}
            isLoading={isSubmitting}
            className="mt-2"
          >
            Sign in
          </AuthSubmitButton>
        </div>
      </form>

      <div className="mt-6 flex flex-col gap-4">
        <OrDivider />

        <AuthButton
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleGoogleLogin()}
        >
          <GoogleIcon />
          Continue with Google
        </AuthButton>
      </div>

      <p className="text-center text-sm mt-6">
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
