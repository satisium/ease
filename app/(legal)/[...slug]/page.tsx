import fs from "node:fs"
import path from "node:path"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import * as React from "react"

import { LegalFooter } from "@/components/layout/legal-footer"
import { buildMetadata } from "@/lib/metadata"

interface PageProps {
  params: Promise<{ slug: string[] }>
}

const VALID_SLUGS = ["privacy", "terms", "cookies"] as const
type LegalSlug = (typeof VALID_SLUGS)[number]

function getLegalDoc(slug: string) {
  if (!VALID_SLUGS.includes(slug as LegalSlug)) return null
  const filePath = path.join(process.cwd(), "content/legal", `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, "utf-8")
  const frontmatterMatch = raw.match(
    /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/
  )
  if (!frontmatterMatch) return null

  const frontmatterRaw = frontmatterMatch[1]
  const content = frontmatterMatch[2].trim()

  const title = frontmatterRaw.match(/title:\s*(.*)/)?.[1]?.trim() ?? "Legal"
  const description =
    frontmatterRaw.match(/description:\s*(.*)/)?.[1]?.trim() ?? ""

  return { title, description, content }
}

function parseInline(text: string): React.ReactNode[] {
  const regex =
    /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground"
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith("[") && token.includes("](")) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch) {
        parts.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            className="text-primary underline underline-offset-4 hover:text-primary"
          >
            {linkMatch[1]}
          </a>
        )
      }
    } else if (token.includes("@")) {
      parts.push(
        <a
          key={match.index}
          href={`mailto:${token}`}
          className="text-primary underline underline-offset-4 hover:text-primary"
        >
          {token}
        </a>
      )
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts
}

function renderMarkdownBlocks(content: string): React.ReactNode[] {
  const lines = content.split(/\r?\n/)
  const elements: React.ReactNode[] = []
  let currentList: string[] = []
  let currentParagraph: string[] = []

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(" ")
      elements.push(
        <p
          key={`p-${elements.length}`}
          className="my-4 leading-7 text-muted-foreground"
        >
          {parseInline(text)}
        </p>
      )
      currentParagraph = []
    }
  }

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul
          key={`ul-${elements.length}`}
          className="my-4 ml-6 list-disc space-y-2 text-muted-foreground marker:text-primary"
        >
          {currentList.map((item, idx) => (
            <li key={idx} className="leading-7">
              {parseInline(item)}
            </li>
          ))}
        </ul>
      )
      currentList = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    if (line.startsWith("# ")) {
      flushParagraph()
      flushList()
      elements.push(
        <h1
          key={`h1-${elements.length}`}
          className="mt-2 mb-6 scroll-m-20 font-heading text-3xl font-bold tracking-tight text-foreground"
        >
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith("## ")) {
      flushParagraph()
      flushList()
      elements.push(
        <h2
          key={`h2-${elements.length}`}
          className="mt-10 mb-4 scroll-m-20 border-b border-border pb-2 font-heading text-xl font-semibold tracking-tight text-foreground"
        >
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith("### ")) {
      flushParagraph()
      flushList()
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          className="mt-8 mb-3 scroll-m-20 font-heading text-lg font-semibold tracking-tight text-foreground"
        >
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith("- ")) {
      flushParagraph()
      currentList.push(line.slice(2))
    } else {
      flushList()
      currentParagraph.push(line)
    }
  }

  flushParagraph()
  flushList()
  return elements
}

export async function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug: [slug] }))
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params
  const slug = params.slug?.[0]
  if (!slug) return {}

  const doc = getLegalDoc(slug)
  if (!doc) return {}

  return buildMetadata({
    title: doc.title,
    description: doc.description,
    path: `/${slug}`,
    label: "LEGAL",
  })
}

export default async function LegalPage(props: PageProps) {
  const params = await props.params
  const slug = params.slug?.[0]
  if (!slug) {
    notFound()
  }

  const doc = getLegalDoc(slug)
  if (!doc) {
    notFound()
  }

  return (
    <div className="container mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:py-24">
      <article className="prose max-w-none prose-neutral dark:prose-invert">
        {renderMarkdownBlocks(doc.content)}
      </article>
      <LegalFooter />
    </div>
  )
}
