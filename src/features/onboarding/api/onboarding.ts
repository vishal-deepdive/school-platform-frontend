import { multipartClient, apiClient } from "@/shared/api/client";
import type {
  OnboardingApplicationResponse,
  OnboardingStatusResponse,
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
   * Fetch pincode details via backend proxy
   */
  getPincode: (pinCode: string) =>
    apiClient.get<any>(`${BASE}/pincode/${pinCode}`).then((r) => r.data),
};
