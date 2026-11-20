"use client"

import type { DemoData } from "@/lib/docs-page"

interface DocDemoRendererProps {
  title?: string
  demos?: DemoData[]
  githubUrl?: string
  previewUrl?: string
}

export function DocDemoRenderer({ demos }: DocDemoRendererProps) {
  if (!demos || demos.length === 0) return null
  return null
}
