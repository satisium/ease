import posthog from "posthog-js"
import { hasConsent } from "@/lib/consent-utils"

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function isAnalyticsEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  vercelEnv: string | undefined = process.env.NEXT_PUBLIC_VERCEL_ENV
): boolean {
  return (
    nodeEnv === "production" &&
    vercelEnv !== "preview" &&
    vercelEnv !== "development"
  )
}

export function initGa4(
  measurementId: string,
  dimensions: Record<string, string>
): void {
  if (typeof window === "undefined" || !isAnalyticsEnabled()) return
  if (!measurementId) return

  window.dataLayer = window.dataLayer || []
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args)
    }
  }

  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  })
  window.gtag("js", new Date())
  window.gtag("config", measurementId, {
    ...dimensions,
    send_page_view: true,
  })

  if (!document.getElementById("satisium-ga4-script")) {
    const script = document.createElement("script")
    script.id = "satisium-ga4-script"
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
    document.head.appendChild(script)
  }
}

export function updateGa4Consent(analyticsGranted: boolean): void {
  if (typeof window === "undefined" || !isAnalyticsEnabled()) return

  window.gtag?.("consent", "update", {
    analytics_storage: analyticsGranted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  })
}

export function track(
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
  options?: { ga?: boolean }
): void {
  if (typeof window === "undefined" || !isAnalyticsEnabled()) return

  if (posthog.__loaded) {
    posthog.capture(event, properties)
  }

  if (options?.ga === true) {
    window.gtag?.("event", event, properties ?? {})
  }
}

export function captureError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (typeof window === "undefined" || !isAnalyticsEnabled()) return

  if (posthog.__loaded) {
    posthog.captureException(error, context)
  }
}

export async function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined" || !isAnalyticsEnabled()) return
  if (!hasConsent()) return

  if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
    posthog.capture(eventName, properties)
  }

  if (
    (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
      process.env.NEXT_PUBLIC_GA_ID) &&
    typeof window.gtag === "function"
  ) {
    window.gtag("event", eventName, properties ?? {})
  }
}
