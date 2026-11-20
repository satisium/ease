import { cache } from "react"
import fs from "fs"
import path from "path"
import { getGithubLastEdit } from "fumadocs-core/content/github"
import { SITE_URL } from "@/lib/config"
import { REPO } from "@/lib/social-links"
import type { CodeFile } from "@/components/code-block/types"

export interface DemoData {
  key: string
  name: string
  type?: "react" | "video" | "image"
  renderMode?: "direct" | "iframe"
  embedUrl?: string
  component?: React.ReactNode
  files?: Record<string, CodeFile | string>
  installCommand?: string
  previewUrl?: string
  mediaUrl?: string
}

const [DEFAULT_OWNER, DEFAULT_REPO] = REPO.split("/")

const LAST_EDIT_CACHE = new Map<
  string,
  { timestamp: number; value: string | null }
>()
const CACHE_TTL = 5 * 60 * 1000

export const getLastModifiedTime = cache(
  async (
    pagePath: string,
    owner = DEFAULT_OWNER,
    repo = DEFAULT_REPO
  ): Promise<string | null> => {
    const cacheKey = `${owner}/${repo}/${pagePath}`
    const cached = LAST_EDIT_CACHE.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.value
    }

    if (process.env.NODE_ENV === "development") {
      return null
    }

    try {
      const time = await getGithubLastEdit({
        owner,
        repo,
        path: `content/docs/${pagePath}`,
        token: process.env.GIT_TOKEN
          ? `Bearer ${process.env.GIT_TOKEN}`
          : undefined,
      })

      const formatted = time
        ? new Date(time).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null

      LAST_EDIT_CACHE.set(cacheKey, { timestamp: Date.now(), value: formatted })
      return formatted
    } catch {
      return null
    }
  }
)

export async function getDocCopyPayload(pagePath: string): Promise<string> {
  try {
    const relativePath = pagePath.replace(/\.mdx?$/, ".md")
    const aiFilePath = path.join(process.cwd(), "public/llms", relativePath)
    const rawMdxPath = path.join(process.cwd(), "content/docs", pagePath)

    if (fs.existsSync(aiFilePath)) {
      return fs.readFileSync(aiFilePath, "utf-8")
    } else if (fs.existsSync(rawMdxPath)) {
      return fs.readFileSync(rawMdxPath, "utf-8")
    }
  } catch {
    // Silently fall back to empty payload
  }
  return ""
}

export async function resolveDocDemos(page?: {
  data: {
    registryKeys?: string[]
    links?: { github?: string; preview?: string }
  }
}): Promise<DemoData[]> {
  void page
  return []
}

export function getDocBreadcrumbSchema(slugPath: string[] | undefined) {
  const baseUrl = `${SITE_URL}/docs`
  const breadcrumbItems = [
    { "@type": "ListItem", position: 1, name: "Docs", item: baseUrl },
  ]

  if (slugPath) {
    let currentPath = baseUrl
    slugPath.forEach((slugPart, index) => {
      currentPath += `/${slugPart}`
      breadcrumbItems.push({
        "@type": "ListItem",
        position: index + 2,
        name: slugPart.replace(/-/g, " "),
        item: currentPath,
      })
    })
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  }
}

export function getDocEntitySchema(title: string, description?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: `${title} Component`,
    description,
    programmingLanguage: "TypeScript",
    codeSampleType: "UI Component",
  }
}
