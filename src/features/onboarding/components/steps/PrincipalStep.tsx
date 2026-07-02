import { Link } from "react-router-dom";
import { AuthInput } from "@/shared/components/ui/auth-fuse";
import { TermsCheckbox } from "@/shared/components/common/TermsCheckbox";
import type { StepPropsExtra } from "./types";

export function PrincipalStep({ register, errors }: StepPropsExtra) {
  return (
    <div className="grid gap-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          This is the{" "}
          <strong className="text-foreground">principal account</strong> for the
          person who will manage the school. Once an admin approves your
          application, we&apos;ll email a one-time code to set your password — no
          password is needed now.
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

      <AuthInput
        label="Your email (if filling on the principal's behalf)"
        type="email"
        autoComplete="email"
        placeholder="office@yourschool.edu.in (optional)"
        error={errors.filled_by_email?.message}
        hint="Leave blank if you are the principal"
        {...register("filled_by_email")}
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
