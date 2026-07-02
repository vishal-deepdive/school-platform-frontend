import { multipartClient, apiClient } from "@/shared/api/client";
import type {
  OnboardingApplicationResponse,
  OnboardingStatusResponse,
  UdiseLookupResponse,
  OnboardingResubmitData,
  OnboardingCapabilities,
  SaveDraftResponse,
  DraftData,
} from "@/features/onboarding/types";

const BASE = "/api/v1/onboarding";

export const onboardingApi = {
  /**
   * Submit a school onboarding application.
   * Uses multipartClient (300 s timeout) for the file upload.
   */
  apply: (formData: FormData) =>
    multipartClient
      .post<OnboardingApplicationResponse>(`${BASE}/apply`, formData)
      .then((r) => r.data),

  /**
   * Update and resubmit an existing rejected / changes_requested application
   * in place — same application_id, no new row.
   */
  resubmit: (applicationId: string, formData: FormData) =>
    multipartClient
      .post<OnboardingApplicationResponse>(
        `${BASE}/${encodeURIComponent(applicationId)}/resubmit`,
        formData,
      )
      .then((r) => r.data),

  /**
   * Public status check — no auth required.
   */
  getStatus: (applicationId: string) =>
    apiClient
      .get<OnboardingStatusResponse>(
        `${BASE}/${encodeURIComponent(applicationId)}/status`,
      )
      .then((r) => r.data),

  /**
   * Verify the principal email OTP.
   * Accepts FormData with { otp: string }.
   */
  verifyEmail: (applicationId: string, otp: string) => {
    return apiClient
      .post<OnboardingApplicationResponse>(
        `${BASE}/${encodeURIComponent(applicationId)}/verify-email`,
        { otp },
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      )
      .then((r) => r.data);
  },

  /**
   * Resend the verification OTP email.
   *
   * `captchaToken` is only sent when present — the backend only requires it when
   * CAPTCHA is enabled server-side, so local dev (captcha off) is unaffected.
   */
  resendOtp: (applicationId: string, captchaToken?: string) => {
    const body = new URLSearchParams();
    if (captchaToken) body.append("captcha_token", captchaToken);
    return apiClient
      .post<{
        message: string;
      }>(`${BASE}/${encodeURIComponent(applicationId)}/resend-otp`, body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
      .then((r) => r.data);
  },

  /**
   * Recover a lost Application ID by email. The backend emails the details to the
   * address and always returns the same generic message (no enumeration).
   */
  lookupByEmail: (email: string, captchaToken?: string) => {
    const body = new URLSearchParams();
    body.append("email", email);
    if (captchaToken) body.append("captcha_token", captchaToken);
    return apiClient
      .post<{ message: string }>(`${BASE}/lookup`, body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
      .then((r) => r.data);
  },

  /**
   * Look up / verify a UDISE code (auto-fill). `verified` is false when no
   * lookup provider is configured server-side.
   */
  lookupUdise: (code: string) =>
    apiClient
      .get<UdiseLookupResponse>(`${BASE}/udise/${encodeURIComponent(code)}`)
      .then((r) => r.data),

  /**
   * Prefill data to resubmit a rejected application (409 if not rejected).
   */
  getResubmitData: (applicationId: string) =>
    apiClient
      .get<OnboardingResubmitData>(
        `${BASE}/${encodeURIComponent(applicationId)}/resubmit`,
      )
      .then((r) => r.data),

  /**
   * Fetch pincode details via backend proxy
   */
  getPincode: (pinCode: string) =>
    apiClient.get<any>(`${BASE}/pincode/${pinCode}`).then((r) => r.data),

  /**
   * Feature-flag probe — tells the UI whether UDISE auto-verify has a usable
   * dataset/provider and whether CAPTCHA is enabled (with its public site key).
   */
  getCapabilities: () =>
    apiClient
      .get<OnboardingCapabilities>(`${BASE}/capabilities`)
      .then((r) => r.data),

  /**
   * Save (or update) an in-progress draft. Omit token to create a new one.
   * When email is provided, a resume link is emailed.
   */
  saveDraft: (params: {
    token?: string;
    email?: string;
    formData: Record<string, unknown>;
    currentStep: number;
    captchaToken?: string;
  }) =>
    apiClient
      .post<SaveDraftResponse>(`${BASE}/draft`, {
        token: params.token,
        email: params.email || undefined,
        form_data: params.formData,
        current_step: params.currentStep,
        captcha_token: params.captchaToken,
      })
      .then((r) => r.data),

  /**
   * Fetch a previously-saved draft by its token, to hydrate the wizard.
   */
  getDraft: (token: string) =>
    apiClient.get<DraftData>(`${BASE}/draft/${encodeURIComponent(token)}`).then((r) => r.data),
};
