import { Link } from "react-router-dom";
import { AuthInput, AuthPasswordInput } from "@/shared/components/ui/auth-fuse";
import { TermsCheckbox } from "@/shared/components/common/TermsCheckbox";
import type { StepPropsExtra } from "./types";

export function PrincipalStep({ register, errors }: StepPropsExtra) {
  return (
    <div className="grid gap-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Create the{" "}
          <strong className="text-foreground">principal account</strong> for the
          person submitting this application. Once approved by the admin, use
          these credentials to manage the school.
        </p>
      </div>

      <AuthInput
        label="Principal Full Name *"
        type="text"
        autoComplete="name"
        placeholder="Full name of the principal"
        error={errors.principal_name?.message}
        {...register("principal_name")}
      />

      <AuthInput
        label="Principal Email *"
        type="email"
        autoComplete="email"
        placeholder="principal@yourschool.edu.in"
        error={errors.principal_email?.message}
        hint="This will be the principal's login email address"
        {...register("principal_email")}
      />

      <AuthPasswordInput
        label="Password *"
        autoComplete="new-password"
        placeholder="Create a strong password"
        error={errors.principal_password?.message}
        hint="Min 8 chars — uppercase, lowercase, number & special character"
        {...register("principal_password")}
      />

      <AuthPasswordInput
        label="Confirm Password *"
        autoComplete="new-password"
        placeholder="Repeat your password"
        error={errors.confirm_password?.message}
        {...register("confirm_password")}
      />

      <TermsCheckbox
        error={errors.terms?.message}
        label={
          <>
            I confirm that all provided details are accurate and I accept the{" "}
            <Link
              to="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Terms &amp; Conditions
            </Link>
          </>
        }
        {...register("terms")}
      />
    </div>
  );
}
