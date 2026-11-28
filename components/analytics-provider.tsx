// components/analytics-provider.tsx
"use client"

import posthog from "posthog-js"
import { PostHogProvider } from "posthog-js/react"
import { useEffect } from "react"
import { useConsent } from "@/lib/consent"
import { hasConsent } from "@/lib/consent-utils"
import { isAnalyticsEnabled } from "@/lib/analytics"
import { PRODUCT } from "@/lib/config"

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  const { status } = useConsent()

  useEffect(() => {
    if (!isAnalyticsEnabled()) return

    if (status === "accepted" || hasConsent()) {
      if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
          api_host: "/ingest",
          ui_host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com",
          capture_pageview: false,
          capture_pageleave: true,
          capture_exceptions: true,
          person_profiles: "identified_only",
          disable_session_recording: true,
          // ✨ 1. ANCHOR COOKIE TO ROOT DOMAIN
          cross_subdomain_cookie: true,
        })

        // ✨ 2. ECOSYSTEM 4-TIER TAXONOMY SUPER-PROPERTIES
        posthog.register({
          ecosystem: PRODUCT.ecosystem,
          pillar: PRODUCT.pillar,
          cluster: PRODUCT.cluster,
          product_type: PRODUCT.type,
          app_id: PRODUCT.slug,
          app_name: PRODUCT.name,
        })
      }
    } else {
      posthog.opt_out_capturing()
    }
  }, [status])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
