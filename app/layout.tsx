import type { Metadata, Viewport } from "next"
import {
  Plus_Jakarta_Sans,
  Inter,
  IBM_Plex_Mono,
  Caveat,
  Newsreader,
} from "next/font/google"
import { Suspense } from "react"
import { Analytics } from "@vercel/analytics/next"
import localFont from "next/font/local"

import "./globals.css"
import { RootProviders } from "@/components/providers/root-providers"
import { cn } from "@/lib/utils"
import { SITE_URL, PRODUCT } from "@/lib/config"
import { ORGANIZATION_SAME_AS, TWITTER_CREATOR } from "@/lib/social-links"
import PostHogPageView from "@/components/posthog-pageview"
import WebVitals from "@/components/web-vitals"
import { GoogleAnalytics } from "@/components/google-analytics"
import { CommandMenuDialog } from "@/components/layout/command-menu"
import { SkipLink } from "@/components/layout/skip-link"

const fontBrand = localFont({
  src: "../public/nulshock.bold.otf",
  variable: "--font-brand",
  display: "swap",
  weight: "700",
})

const fontHeading = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
})

const fontBody = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

const fontCode = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-code",
  display: "swap",
})

const fontCaveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
})

const fontEditorial = Newsreader({
  subsets: ["latin"],
  variable: "--font-editorial",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: PRODUCT.titleTemplate,
    default: PRODUCT.defaultTitle,
  },
  description: PRODUCT.description,
  alternates: {
    canonical: "/",
    languages: { "en-US": "/" },
    types: {
      "application/llms+txt": "/llms.txt",
    },
  },
  keywords: [
    "cubic-bezier",
    "spring physics",
    "motion curves",
    "easing generator",
    "css linear()",
    "tailwind v4",
    "framer motion",
    "gsap customease",
    "ui animation",
    "satisium ease",
  ],
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
  openGraph: {
    type: "website",
    siteName: PRODUCT.name,
    locale: "en_US",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Ease — A tool by Satisium",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PRODUCT.defaultTitle,
    description: PRODUCT.description,
    creator: TWITTER_CREATOR,
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Ease — A tool by Satisium",
      },
    ],
  },
  other: {
    "og:logo": `${SITE_URL}/android-chrome-512x512.png`,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  colorScheme: "light dark",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontHeading.variable,
        fontBody.variable,
        fontCode.variable,
        fontCaveat.variable,
        fontBrand.variable,
        fontEditorial.variable
      )}
    >
      <head>
        <meta name="apple-mobile-web-app-title" content={PRODUCT.name} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              name: PRODUCT.name,
              alternateName: [PRODUCT.shortName, "The Satisium Umbrella"],
              url: SITE_URL,
              publisher: {
                "@id": "https://satisium.com/#organization",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": "https://satisium.com/#organization",
              name: "The Satisium Umbrella",
              url: "https://satisium.com",
              sameAs: ORGANIZATION_SAME_AS,
              logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/android-chrome-512x512.png`,
                width: 512,
                height: 512,
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "@id": `${SITE_URL}/#app`,
              name: PRODUCT.defaultTitle,
              url: SITE_URL,
              applicationCategory: PRODUCT.applicationCategory,
              operatingSystem: "WebBrowser",
              browserRequirements: "Requires JavaScript. Requires HTML5.",
              softwareVersion: "1.0.0",
              isAccessibleForFree: true,
              license: "https://opensource.org/licenses/MIT",
              publisher: {
                "@id": "https://satisium.com/#organization",
              },
              featureList: [
                "Cubic-Bézier curve editor with live velocity derivative visualization",
                "Closed-form analytical ODE spring physics solver (mass, stiffness, damping, v0)",
                "21 interactive UI component habitats plus 4-track Primitives X-Ray",
                "120fps zero-re-render TrackConductor with mid-flight velocity interruption",
                "2-tier Git-style curve branching with working drafts",
                "Side-by-side curve duels with t95 arrival and settle-time telemetry",
                "Production code export for CSS linear(), Tailwind v4, Motion, and GSAP CustomEase",
                "Lossless shareable URL hash state encoding",
              ],
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
        {PRODUCT.sitelinks && PRODUCT.sitelinks.length > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                itemListElement: PRODUCT.sitelinks.map((item, index) => ({
                  "@type": "SiteNavigationElement",
                  position: index + 1,
                  name: item.name,
                  description: item.description,
                  url: `${SITE_URL}${item.path}`,
                })),
              }),
            }}
          />
        )}
        {PRODUCT.faqs && PRODUCT.faqs.length > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: PRODUCT.faqs.map((faq) => ({
                  "@type": "Question",
                  name: faq.question,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: faq.answer,
                  },
                })),
              }),
            }}
          />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: PRODUCT.name,
              description: PRODUCT.description,
              url: SITE_URL,
              inLanguage: "en-US",
            }),
          }}
        />
      </head>

      <body>
        <SkipLink />
        <RootProviders commandMenu={<CommandMenuDialog />}>
          <Suspense fallback={null}>
            <PostHogPageView />
            <WebVitals />
          </Suspense>
          <Analytics />
          <GoogleAnalytics />
          {children}
        </RootProviders>
      </body>
    </html>
  )
}
