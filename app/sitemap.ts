import { MetadataRoute } from "next"
import { PRODUCT, SITE_URL } from "@/lib/config"
import { LEGAL } from "@/config/site"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseDate = new Date(LEGAL.updated || "2026-01-01")

  const legalUrls = ["privacy", "terms", "cookies"].map((slug) => ({
    url: `${SITE_URL}/${slug}`,
    lastModified: baseDate,
    changeFrequency: "monthly" as const,
    priority: 0.3,
  }))

  const sitelinkUrls = (PRODUCT.sitelinks || [])
    .filter((link) => {
      return (
        link.path !== "/" &&
        link.path !== "/app" &&
        !link.path.startsWith("/docs") &&
        !["/privacy", "/terms", "/cookies"].includes(link.path)
      )
    })
    .map((link) => ({
      url: `${SITE_URL}${link.path}`,
      lastModified: baseDate,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))

  return [
    {
      url: SITE_URL,
      lastModified: baseDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/app`,
      lastModified: baseDate,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...sitelinkUrls,
    ...legalUrls,
  ]
}
