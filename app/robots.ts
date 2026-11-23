import { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/config"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/app", "/llms.txt"],
        disallow: ["/api/", "/test/", "/embed/", "/preview/"],
      },
      {
        userAgent: [
          "GPTBot",
          "ClaudeBot",
          "PerplexityBot",
          "Google-Extended",
          "Applebot-Extended",
        ],
        allow: ["/", "/app", "/llms.txt"],
        disallow: ["/api/", "/test/", "/embed/", "/preview/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
