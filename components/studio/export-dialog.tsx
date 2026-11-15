"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { codeToHtml } from "shiki"
import {
  Copy01Icon,
  Link01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { type ExporterId } from "@/core"
import { useEaseStore } from "@/hooks/use-ease-store"

const EXPORTERS: { id: ExporterId; label: string }[] = [
  { id: "css", label: "CSS" },
  { id: "tailwind", label: "Tailwind" },
  { id: "motion", label: "Motion" },
  { id: "gsap", label: "GSAP" },
]

const LANG_MAP: Record<ExporterId, string> = {
  css: "css",
  tailwind: "html",
  motion: "tsx",
  gsap: "ts",
}

export function ExportDialog() {
  const { resolvedTheme } = useTheme()
  const isExportOpen = useEaseStore((s) => s.isExportOpen)
  const setExportOpen = useEaseStore((s) => s.setExportOpen)
  const exportScope = useEaseStore((s) => s.exportScope)
  const setExportScope = useEaseStore((s) => s.setExportScope)
  const preferredExporter = useEaseStore((s) => s.preferredExporter)
  const setPreferredExporter = useEaseStore((s) => s.setPreferredExporter)
  const getActiveExportCode = useEaseStore((s) => s.getActiveExportCode)
  const getShareUrlHash = useEaseStore((s) => s.getShareUrlHash)
  const getActiveCurve = useEaseStore((s) => s.getActiveCurve)
  const getFocusedTrack = useEaseStore((s) => s.getFocusedTrack)

  const [hasCopiedCode, setHasCopiedCode] = React.useState(false)
  const [hasCopiedUrl, setHasCopiedUrl] = React.useState(false)
  const [highlightedHtml, setHighlightedHtml] = React.useState<string | null>(
    null
  )

  const activeCurve = React.useMemo(() => getActiveCurve(), [getActiveCurve])
  const focusedTrack = React.useMemo(() => getFocusedTrack(), [getFocusedTrack])

  const code = React.useMemo(() => {
    return getActiveExportCode(preferredExporter, exportScope)
  }, [getActiveExportCode, preferredExporter, exportScope])

  React.useEffect(() => {
    let isMounted = true

    async function highlight() {
      try {
        const lang = LANG_MAP[preferredExporter] ?? "ts"
        const theme =
          resolvedTheme === "dark"
            ? "github-dark-default"
            : "github-light-default"
        const html = await codeToHtml(code, {
          lang,
          theme,
        })
        if (isMounted) {
          setHighlightedHtml(html)
        }
      } catch {
        if (isMounted) {
          setHighlightedHtml(null)
        }
      }
    }

    highlight()

    return () => {
      isMounted = false
    }
  }, [code, preferredExporter, resolvedTheme])

  const handleCopyCode = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setHasCopiedCode(true)
      setTimeout(() => setHasCopiedCode(false), 2000)
    } catch {
      // Fallback
    }
  }, [code])

  const handleCopyUrl = React.useCallback(async () => {
    try {
      const hash = getShareUrlHash()
      const shareUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}${hash}`
          : hash
      await navigator.clipboard.writeText(shareUrl)
      setHasCopiedUrl(true)
      setTimeout(() => setHasCopiedUrl(false), 2000)
    } catch {
      // Fallback
    }
  }, [getShareUrlHash])

  return (
    <Dialog open={isExportOpen} onOpenChange={setExportOpen}>
      <DialogContent
        showCloseButton
        className="w-full gap-4 rounded-[20px] border-none bg-background p-5 shadow-none sm:max-w-[640px]"
      >
        <DialogHeader className="gap-1 text-left">
          <DialogTitle className="font-heading text-sm font-semibold text-foreground">
            Export Motion Kinetics
          </DialogTitle>
          <p className="font-sans text-xs text-muted-foreground">
            {activeCurve.name} · {focusedTrack.componentLabel} (
            {focusedTrack.phaseLabel})
          </p>
        </DialogHeader>

        {/* Controls: Target Framework + Scope */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          {/* Framework Segmented Switcher */}
          <div
            role="tablist"
            aria-label="Export framework selection"
            className="flex items-center rounded-[10px] bg-muted p-0.5"
          >
            {EXPORTERS.map((exp) => {
              const isSelected = preferredExporter === exp.id
              return (
                <button
                  key={exp.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`${exp.label} export`}
                  onClick={() => setPreferredExporter(exp.id)}
                  className={cn(
                    "flex h-7 cursor-pointer items-center rounded-[8px] px-2.5 font-sans text-xs transition-colors",
                    isSelected
                      ? "bg-background font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {exp.label}
                </button>
              )
            })}
          </div>

          {/* Scope Segmented Switcher */}
          <div
            role="tablist"
            aria-label="Export scope selection"
            className="flex items-center rounded-[10px] bg-muted p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={exportScope === "channel"}
              aria-label="Export active channel only"
              onClick={() => setExportScope("channel")}
              className={cn(
                "flex h-7 cursor-pointer items-center rounded-[8px] px-2.5 font-sans text-xs transition-colors",
                exportScope === "channel"
                  ? "bg-background font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Active Channel
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={exportScope === "track"}
              aria-label="Export full track channels"
              onClick={() => setExportScope("track")}
              className={cn(
                "flex h-7 cursor-pointer items-center rounded-[8px] px-2.5 font-sans text-xs transition-colors",
                exportScope === "track"
                  ? "bg-background font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Full Track
            </button>
          </div>
        </div>

        {/* Generated Code Area (Borderless Squircle) */}
        <div className="relative max-h-[360px] min-h-[160px] overflow-auto rounded-[14px] bg-muted p-4">
          {highlightedHtml ? (
            <div
              className="font-mono text-[13px] leading-relaxed select-text [&_code]:!bg-transparent [&_code]:break-all [&_code]:whitespace-pre-wrap [&_pre]:!m-0 [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:break-all [&_pre]:whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <pre className="font-mono text-[13px] leading-relaxed break-all whitespace-pre-wrap text-foreground select-text">
              <code className="break-all whitespace-pre-wrap">{code}</code>
            </pre>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          {/* Share URL */}
          <button
            type="button"
            onClick={handleCopyUrl}
            aria-label="Copy shareable URL to clipboard"
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] bg-secondary px-3.5 font-sans text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            <HugeiconsIcon
              icon={hasCopiedUrl ? CheckmarkCircle02Icon : Link01Icon}
              className="size-3.5"
            />
            <span>{hasCopiedUrl ? "URL Copied!" : "Copy Share URL"}</span>
          </button>

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label="Copy generated code to clipboard"
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] bg-foreground px-4 font-sans text-xs font-medium text-background transition-colors hover:opacity-90 active:scale-95"
          >
            <HugeiconsIcon
              icon={hasCopiedCode ? CheckmarkCircle02Icon : Copy01Icon}
              className="size-3.5"
            />
            <span>{hasCopiedCode ? "Copied!" : "Copy Code"}</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
