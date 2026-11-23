import posthog from "posthog-js"
import { hasConsent } from "@/lib/consent-utils"

declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      params?: Record<string, unknown>
    ) => void
  }
}

export async function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  if (!hasConsent()) return

  if (
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  ) {
    posthog.capture(eventName, properties)
  }

  if (
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_GA_ID &&
    typeof window.gtag === "function"
  ) {
    window.gtag("event", eventName, properties)
  }
}
