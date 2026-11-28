"use client"

import { Suspense, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { PRODUCT } from "@/config/site"
import { initGa4, isAnalyticsEnabled, updateGa4Consent } from "@/lib/analytics"
import { useConsent } from "@/lib/consent"
import { env } from "@/lib/env"

function PageViewTracker({ gaId }: { gaId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!isAnalyticsEnabled() || !pathname || typeof window === "undefined") {
      return
    }
    if (typeof window.gtag !== "function") return

    const search = searchParams?.toString()
    const url = search ? `${pathname}?${search}` : pathname

    window.gtag("config", gaId, {
      page_path: url,
    })
  }, [pathname, searchParams, gaId])

  return null
}

export function GoogleAnalytics() {
  const { status } = useConsent()
  const gaId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID || env.NEXT_PUBLIC_GA_ID
  const enabled = isAnalyticsEnabled() && Boolean(gaId)

  useEffect(() => {
    if (!enabled || !gaId) return

    initGa4(gaId, {
      app_id: PRODUCT.slug,
      app_name: PRODUCT.name,
      pillar: PRODUCT.pillar,
      cluster: PRODUCT.cluster,
    })
  }, [enabled, gaId])

  useEffect(() => {
    if (!enabled) return
    updateGa4Consent(status === "accepted")
  }, [enabled, status])

  if (!enabled || !gaId) return null

  return (
    <Suspense fallback={null}>
      <PageViewTracker gaId={gaId} />
    </Suspense>
  )
}
