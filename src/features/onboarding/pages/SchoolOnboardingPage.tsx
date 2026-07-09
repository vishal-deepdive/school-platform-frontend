/**
 * School self-onboarding wizard — 5 steps:
 *   1. School Info       (name, board, type, year)
 *   2. Contact & Address (email, mobile, address, city, state, PIN)
 *   3. Academic Details  (student count, classes, medium, UDISE)
 *   4. Documents         (school registration certificate — file upload)
 *   5. Principal Account (name, email, password, terms)
 */
import React, { useState, useCallback, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Building2,
  MapPin,
  GraduationCap,
  FileText,
  User,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Mail,
  AlertTriangle,
} from "lucide-react";
import toast from "@/shared/lib/toast";
import type { FieldPath } from "react-hook-form";
import { useWatch } from "react-hook-form";
import type { SchoolOnboardingFormData } from "@/features/onboarding/schema";
import { onboardingApi } from "@/features/onboarding/api/onboarding";
import { getErrorMessage, cn } from "@/shared/lib/utils";
import { SESSION_KEYS, removeSession } from "@/shared/lib/session";
import { AuthButton, AuthInput } from "@/shared/components/ui/auth-fuse";
import { Modal } from "@/shared/components/ui/Modal";
import type { OnboardingApplicationResponse } from "@/features/onboarding/types";
import { SCHOOL_BOARDS, SCHOOL_TYPES } from "@/features/onboarding/constants";

import {
  StepIndicator,
  SuccessState,
  CaptchaWidget,
  SchoolInfoStep,
  ContactStep,
  AcademicStep,
  DocumentsStep,
  PrincipalStep,
  type StepIndex,
} from "@/features/onboarding/components";
import { useOnboardingForm, useOnboardingCapabilities } from "@/features/onboarding/hooks";

// ── Constants ─────────────────────────────────────────────────────────────────
const STEPS: {
  id: StepIndex;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}[] = [
  { id: 1, title: "School Info", subtitle: "Basic details", icon: Building2 },
  {
    id: 2,
    title: "Contact & Address",
    subtitle: "Location & contact",
    icon: MapPin,
  },
  {
    id: 3,
    title: "Academic Details",
    subtitle: "Curriculum & size",
    icon: GraduationCap,
  },
  { id: 4, title: "Documents", subtitle: "Certificate upload", icon: FileText },
  {
    id: 5,
    title: "Principal Account",
    subtitle: "Login credentials",
    icon: User,
  },
];

const STEP_FIELDS: Record<StepIndex, FieldPath<SchoolOnboardingFormData>[]> = {
  1: [
    "school_name",
    "board",
    "other_board",
    "school_type",
    "other_school_type",
    "established_year",
  ],
  2: [
    "email",
    "mobile",
    "phone",
    "address_line_1",
    "city",
    "state",
    "pin_code",
    "area",
  ],
  3: [
    "student_count",
    "classes_from",
    "classes_to",
    "medium_of_instruction",
    "other_medium_of_instruction",
  ],
  4: [],
  5: ["principal_name", "principal_email", "filled_by_email", "terms"],
};

// Error codes the backend returns for an already-active duplicate application —
// these get an actionable "check your status" banner instead of a dead-end toast.
const DUPLICATE_ERROR_CODES = new Set([
  "school_name_pending",
  "principal_email_pending",
  "udise_code_pending",
  "udise_code_exists",
  "principal_email_exists",
  // /apply merges "pending application" and "existing user" into this single
  // enumeration-safe code — it still deserves the actionable status banner.
  "principal_email_unavailable",
]);

// ── Main Page ─────────────────────────────────────────────────────────────────
export function SchoolOnboardingPage() {
  const { methods, currentStep, setCurrentStep, saveState } =
    useOnboardingForm();
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    reset,
    getValues,
    control,
    formState: { errors },
  } = methods;

  const reviewValues = useWatch({ control }) as Partial<SchoolOnboardingFormData>;
  const { data: capabilities } = useOnboardingCapabilities();

  const [searchParams] = useSearchParams();
  const resubmitId = searchParams.get("resubmit");
  const draftParam = searchParams.get("draft");
  const [isResubmit, setIsResubmit] = useState(false);
  const [resubmitAdminMessage, setResubmitAdminMessage] = useState<string | null>(null);
  const [existingCertificateUrl, setExistingCertificateUrl] = useState<string | null>(null);

  // Prefill from a rejected / changes-requested application so the applicant
  // corrects & resubmits in place, without re-entering everything. Runs once
  // when arriving with ?resubmit=<id>.
  useEffect(() => {
    if (!resubmitId) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await onboardingApi.getResubmitData(resubmitId);
        if (cancelled) return;
        reset({
          school_name: d.school_name,
          // board/school_type are stored uppercase; the form enums are lowercase
          // for school_type (and free-text passthrough for board) — normalize.
          board: (d.board ?? "") as never,
          other_board: d.other_board ?? "",
          school_type: (d.school_type?.toLowerCase() ?? "") as never,
          other_school_type: d.other_school_type ?? "",
          established_year: d.established_year ?? "",
          email: d.email,
          mobile: d.mobile,
          phone: d.phone ?? "",
          address_line_1: d.address_line_1,
          address_line_2: d.address_line_2 ?? "",
          city: d.city,
          state: d.state,
          pin_code: d.pin_code,
          area: "", // not stored — user re-selects the post office on step 2
          student_count: String(d.student_count ?? ""),
          medium_of_instruction: d.medium_of_instruction ?? "",
          other_medium_of_instruction: d.other_medium_of_instruction ?? "",
          classes_from: d.classes_from ?? "",
          classes_to: d.classes_to ?? "",
          udise_code: d.udise_code ?? "",
          principal_name: d.principal_name,
          principal_email: d.principal_email,
          filled_by_email: d.filled_by_email ?? "",
          area_required: "",
          terms: false,
        });
        setIsResubmit(true);
        setExistingCertificateUrl(d.certificate_url ?? null);
        setResubmitAdminMessage(
          d.onboarding_status === "changes_requested" ? d.admin_message : null,
        );
        setCurrentStep(1);
        toast.success(
          d.onboarding_status === "changes_requested"
            ? "We loaded your application — address the note below and resubmit."
            : "We loaded your previous application — update and resubmit.",
        );
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resubmitId]);

  // ── Draft resume (server-side "save & continue later") ──────────────────────
  const [draftToken, setDraftToken] = useState<string | null>(draftParam);
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
  const [draftEmail, setDraftEmail] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  // Linking a draft to an email dispatches a resume link, so the backend
  // requires CAPTCHA (when enabled) for that call — silent token-only
  // autosaves below are exempt server-side.
  const [draftCaptchaToken, setDraftCaptchaToken] = useState<string | null>(null);
  const [draftCaptchaResetKey, setDraftCaptchaResetKey] = useState(0);

  useEffect(() => {
    if (!draftParam || resubmitId) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await onboardingApi.getDraft(draftParam);
        if (cancelled) return;
        reset(d.form_data as Partial<SchoolOnboardingFormData>);
        setCurrentStep(Math.min(Math.max(d.current_step, 1), 5) as StepIndex);
        toast.success("Welcome back — we restored your saved progress.");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftParam, resubmitId]);

  const handleSaveDraft = async () => {
    if (!draftEmail.trim()) {
      toast.error("Enter an email address to receive your resume link");
      return;
    }
    if (capabilities?.captcha_enabled && !draftCaptchaToken) {
      toast.error("Please complete the verification challenge first.");
      return;
    }
    setSavingDraft(true);
    try {
      const res = await onboardingApi.saveDraft({
        token: draftToken ?? undefined,
        email: draftEmail.trim(),
        formData: getValues(),
        currentStep,
        captchaToken: draftCaptchaToken ?? undefined,
      });
      setDraftToken(res.token);
      setShowSaveDraftModal(false);
      toast.success("We've emailed you a link to resume this application.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      if (capabilities?.captcha_enabled) {
        // Tokens are single-use — reset the widget for any further attempt.
        setDraftCaptchaToken(null);
        setDraftCaptchaResetKey((k) => k + 1);
      }
      setSavingDraft(false);
    }
  };

  // Open the save-draft modal with a sensible email default — whoever is
  // filling the form has usually already typed it on step 2 or 5.
  const openSaveDraftModal = () => {
    if (!draftEmail.trim()) {
      const v = getValues();
      setDraftEmail(
        v.filled_by_email?.trim() ||
          v.principal_email?.trim() ||
          v.email?.trim() ||
          "",
      );
    }
    setShowSaveDraftModal(true);
  };

  const [certificate, setCertificate] = useState<File | null>(null);
  const [certError, setCertError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] =
    useState<OnboardingApplicationResponse | null>(null);
  const [principalEmail, setPrincipalEmail] = useState("");
  const [duplicateInfo, setDuplicateInfo] = useState<string | null>(null);

  // Anti-abuse CAPTCHA token. The widget only renders (and a token is only
  // required) when the backend reports CAPTCHA is actually enabled — local/dev
  // deployments with no site key configured are unaffected.
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // ── Silent server-side autosave ─────────────────────────────────────────────
  // Once a draft token exists (the user asked for a resume link, or arrived via
  // one), keep the server copy in sync in the background so cross-device resume
  // reflects their latest progress — not just the state at the moment they
  // clicked "Save & continue later". Fire-and-forget: failures are ignored and
  // retried on the next change; sessionStorage autosave still covers this tab.
  // Token-only saves (no email) are exempt from CAPTCHA server-side.
  const serverSaveTimerRef = useRef<number | null>(null);
  const serverSaveInFlightRef = useRef(false);
  useEffect(() => {
    if (!draftToken || isResubmit || submitted) return;
    const subscription = methods.watch(() => {
      if (serverSaveTimerRef.current !== null) {
        clearTimeout(serverSaveTimerRef.current);
      }
      serverSaveTimerRef.current = window.setTimeout(async () => {
        if (serverSaveInFlightRef.current) return;
        serverSaveInFlightRef.current = true;
        try {
          await onboardingApi.saveDraft({
            token: draftToken,
            formData: getValues(),
            currentStep,
          });
        } catch {
          // Silent — next edit retries.
        } finally {
          serverSaveInFlightRef.current = false;
        }
      }, 3000);
    });
    return () => {
      subscription.unsubscribe();
      if (serverSaveTimerRef.current !== null) {
        clearTimeout(serverSaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftToken, isResubmit, submitted, currentStep]);

  const handleNext = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) e.preventDefault();
      if (currentStep === 4) {
        // Certificate is recommended but optional — admins can request it later.
        setCertError("");
        setCurrentStep(5);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const fields = STEP_FIELDS[currentStep];
      const valid = await trigger(fields);
      if (valid) {
        setCurrentStep((s: StepIndex) => Math.min(s + 1, 5) as StepIndex);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [currentStep, trigger, setCurrentStep],
  );

  const handleBack = useCallback(() => {
    setCurrentStep((s: StepIndex) => Math.max(s - 1, 1) as StepIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setCurrentStep]);

  const onSubmit = async (data: SchoolOnboardingFormData) => {
    if (capabilities?.captcha_enabled && !captchaToken) {
      toast.error("Please complete the verification challenge before submitting.");
      return;
    }

    setIsSubmitting(true);
    setDuplicateInfo(null);
    try {
      const fd = new FormData();

      // Step 1
      fd.append("school_name", data.school_name);
      fd.append("board", data.board);
      if (data.other_board?.trim())
        fd.append("other_board", data.other_board.trim());
      fd.append("school_type", data.school_type);
      if (data.other_school_type?.trim())
        fd.append("other_school_type", data.other_school_type.trim());
      if (data.established_year?.trim())
        fd.append("established_year", data.established_year.trim());

      // Step 2
      fd.append("email", data.email);
      fd.append("mobile", data.mobile);
      if (data.phone?.trim()) fd.append("phone", data.phone.trim());
      fd.append("address_line_1", data.address_line_1);
      if (data.address_line_2?.trim())
        fd.append("address_line_2", data.address_line_2.trim());
      fd.append("city", data.city);
      fd.append("state", data.state);
      fd.append("pin_code", data.pin_code);

      // Step 3
      fd.append("student_count", data.student_count);
      if (data.medium_of_instruction?.trim())
        fd.append("medium_of_instruction", data.medium_of_instruction.trim());
      if (data.other_medium_of_instruction?.trim())
        fd.append(
          "other_medium_of_instruction",
          data.other_medium_of_instruction.trim(),
        );
      if (data.classes_from?.trim())
        fd.append("classes_from", data.classes_from.trim());
      if (data.classes_to?.trim())
        fd.append("classes_to", data.classes_to.trim());
      if (data.udise_code?.trim())
        fd.append("udise_code", data.udise_code.trim());

      // Step 4 — optional; on resubmit, omitting it keeps the certificate on file.
      if (certificate) fd.append("certificate", certificate, certificate.name);

      // Step 5 (no password — set later via emailed one-time code)
      fd.append("principal_name", data.principal_name);
      fd.append("principal_email", data.principal_email);
      if (data.filled_by_email?.trim())
        fd.append("filled_by_email", data.filled_by_email.trim());

      // Anti-abuse CAPTCHA — only sent when a token was obtained from the widget.
      if (captchaToken) fd.append("captcha_token", captchaToken);

      const response =
        isResubmit && resubmitId
          ? await onboardingApi.resubmit(resubmitId, fd)
          : await onboardingApi.apply(fd);
      setPrincipalEmail(data.principal_email);
      setSubmitted(response);
      removeSession(SESSION_KEYS.ONBOARDING_FORM, SESSION_KEYS.ONBOARDING_STEP);
      toast.success(isResubmit ? "Application updated!" : "Application submitted!");
    } catch (err) {
      const code = (err as { response?: { data?: { code?: unknown } } })?.response
        ?.data?.code;
      if (typeof code === "string" && DUPLICATE_ERROR_CODES.has(code)) {
        setDuplicateInfo(getErrorMessage(err));
      } else {
        toast.error(getErrorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // On a failed submit, jump to the earliest step that owns an errored field so
  // the user lands on the problem instead of a generic toast on the last step.
  const onInvalid = (formErrors: typeof errors) => {
    const errored = new Set(Object.keys(formErrors));
    for (const s of [1, 2, 3, 5] as StepIndex[]) {
      if (STEP_FIELDS[s].some((f) => errored.has(f))) {
        setCurrentStep(s);
        window.scrollTo({ top: 0, behavior: "smooth" });
        toast.error("Please fix the highlighted fields.");
        return;
      }
    }
    toast.error("Please review your details and try again.");
  };

  if (submitted) {
    return (
      <SuccessState response={submitted} principalEmail={principalEmail} />
    );
  }

  const stepInfo = STEPS[currentStep - 1];
  const StepIcon = stepInfo.icon;

  return (
    <div className="mx-auto grid w-full max-w-[500px] lg:max-w-[650px] gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          School Onboarding
        </h1>
        <p className="text-sm text-muted-foreground">
          Register your school on the DeepDive platform
        </p>
        {isResubmit && resubmitAdminMessage && (
          <div className="w-full text-left text-xs text-purple-800 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
            <p className="font-semibold mb-0.5">Admin requested changes:</p>
            <p>{resubmitAdminMessage}</p>
          </div>
        )}
        {isResubmit && !resubmitAdminMessage && (
          <p className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            Editing your previous application — make your changes and resubmit.
          </p>
        )}
        <div className="flex items-center gap-3">
          {saveState !== "idle" && (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
              aria-live="polite"
            >
              {saveState === "saving" ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-green-600" aria-hidden />
                  Progress saved
                </>
              )}
            </span>
          )}
          {!isResubmit && (
            <button
              type="button"
              onClick={openSaveDraftModal}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <Mail className="h-3 w-3" aria-hidden />
              Save &amp; continue later
            </button>
          )}
        </div>
      </div>

      <StepIndicator
        current={currentStep}
        total={5}
        labels={STEPS.map((s) => s.title)}
        onStepClick={(s) => {
          setCurrentStep(s);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <StepIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">
            {stepInfo.title}
          </h2>
          <p className="text-xs text-muted-foreground">{stepInfo.subtitle}</p>
        </div>
        <span className="text-xs text-muted-foreground font-medium tabular-nums shrink-0">
          {currentStep} / 5
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
        {currentStep === 1 && (
          <SchoolInfoStep
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        )}
        {currentStep === 2 && (
          <ContactStep
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        )}
        {currentStep === 3 && (
          <AcademicStep
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        )}
        {currentStep === 4 && (
          <DocumentsStep
            certificate={certificate}
            setCertificate={setCertificate}
            certError={certError}
            setCertError={setCertError}
            existingCertificateUrl={existingCertificateUrl}
          />
        )}
        {currentStep === 5 && (
          <>
            <PrincipalStep
              register={register}
              errors={errors}
              watch={watch}
              setValue={setValue}
            />
            <ReviewSummary values={reviewValues} onEdit={setCurrentStep} />
            {capabilities?.captcha_enabled && capabilities.captcha_site_key && (
              <div className="mt-4">
                <CaptchaWidget
                  siteKey={capabilities.captcha_site_key}
                  onVerify={setCaptchaToken}
                  onExpire={() => setCaptchaToken(null)}
                />
              </div>
            )}
          </>
        )}

        {duplicateInfo && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <p>{duplicateInfo}</p>
              <Link
                to="/onboarding/status"
                className="font-semibold underline hover:text-amber-900"
              >
                Check your application status
              </Link>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          {currentStep > 1 && (
            <AuthButton
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </AuthButton>
          )}

          {currentStep < 5 ? (
            <AuthButton
              key="continue-btn"
              type="button"
              className={cn("flex-1", currentStep === 1 && "w-full")}
              onClick={handleNext}
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </AuthButton>
          ) : (
            <AuthButton
              key="submit-btn"
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {isResubmit ? "Resubmit Application" : "Submit Application"}
                </>
              )}
            </AuthButton>
          )}
        </div>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>

      <Modal
        open={showSaveDraftModal}
        onClose={() => setShowSaveDraftModal(false)}
        title="Save & continue later"
        size="sm"
      >
        <p className="text-sm text-muted-foreground">
          We'll save your progress for 14 days and email you a link to pick up
          right where you left off.
        </p>
        <div className="mt-3">
          <AuthInput
            type="email"
            label="Your email"
            placeholder="you@yourschool.edu.in"
            value={draftEmail}
            onChange={(e) => setDraftEmail(e.target.value)}
          />
        </div>
        {capabilities?.captcha_enabled && capabilities.captcha_site_key && (
          <div className="mt-3">
            <CaptchaWidget
              siteKey={capabilities.captcha_site_key}
              onVerify={setDraftCaptchaToken}
              onExpire={() => setDraftCaptchaToken(null)}
              resetKey={draftCaptchaResetKey}
            />
          </div>
        )}
        <div className="flex justify-end gap-3 mt-4">
          <AuthButton
            type="button"
            variant="outline"
            onClick={() => setShowSaveDraftModal(false)}
          >
            Cancel
          </AuthButton>
          <AuthButton
            type="button"
            onClick={handleSaveDraft}
            disabled={
              savingDraft ||
              (capabilities?.captcha_enabled ? !draftCaptchaToken : false)
            }
          >
            {savingDraft ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Email me the link
          </AuthButton>
        </div>
      </Modal>
    </div>
  );
}

// ── Review-before-submit summary ────────────────────────────────────────────
function ReviewRow({
  label,
  value,
  step,
  onEdit,
}: {
  label: string;
  value?: string;
  step: StepIndex;
  onEdit: (s: StepIndex) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-foreground text-right truncate">
          {value?.trim() ? value : "—"}
        </span>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="text-[11px] font-medium text-primary hover:underline shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Edit
        </button>
      </span>
    </div>
  );
}

function ReviewSummary({
  values,
  onEdit,
}: {
  values: Partial<SchoolOnboardingFormData>;
  onEdit: (s: StepIndex) => void;
}) {
  const address = [values.address_line_1, values.city, values.state, values.pin_code]
    .filter(Boolean)
    .join(", ");
  const boardLabel =
    values.board === "OTHER"
      ? values.other_board
      : SCHOOL_BOARDS.find((b) => b.value === values.board)?.label ?? values.board;
  const schoolTypeLabel =
    values.school_type === "other"
      ? values.other_school_type
      : SCHOOL_TYPES.find((t) => t.value === values.school_type)?.label ?? values.school_type;
  return (
    <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
      <p className="mb-2 text-xs font-semibold text-foreground">
        Review your details before submitting
      </p>
      <div className="divide-y divide-border/60">
        <ReviewRow label="School" value={values.school_name} step={1} onEdit={onEdit} />
        <ReviewRow label="Board" value={boardLabel} step={1} onEdit={onEdit} />
        <ReviewRow label="School type" value={schoolTypeLabel} step={1} onEdit={onEdit} />
        <ReviewRow label="Contact email" value={values.email} step={2} onEdit={onEdit} />
        <ReviewRow label="Mobile" value={values.mobile} step={2} onEdit={onEdit} />
        <ReviewRow label="Address" value={address} step={2} onEdit={onEdit} />
        <ReviewRow label="Students" value={values.student_count} step={3} onEdit={onEdit} />
        <ReviewRow label="UDISE" value={values.udise_code} step={3} onEdit={onEdit} />
        <ReviewRow label="Principal" value={values.principal_name} step={5} onEdit={onEdit} />
        <ReviewRow label="Principal email" value={values.principal_email} step={5} onEdit={onEdit} />
      </div>
    </div>
  );
}
