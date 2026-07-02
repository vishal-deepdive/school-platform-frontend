import { useQuery } from "@tanstack/react-query";
import { onboardingApi } from "@/features/onboarding/api/onboarding";

/**
 * Feature-flag probe — tells the UI whether UDISE auto-verify has a usable
 * dataset/provider and whether CAPTCHA is enabled (with its site key).
 * Cached for the session so every step doesn't re-fetch it independently.
 */
export function useOnboardingCapabilities() {
  return useQuery({
    queryKey: ["onboarding-capabilities"],
    queryFn: onboardingApi.getCapabilities,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
