import { multipartClient, apiClient } from './client'
import type { OnboardingApplicationResponse, OnboardingStatusResponse } from '@/types/onboarding'

const BASE = '/api/v1/onboarding'

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
      .get<OnboardingStatusResponse>(`${BASE}/${encodeURIComponent(applicationId)}/status`)
      .then((r) => r.data),
}
