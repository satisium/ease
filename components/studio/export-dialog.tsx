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
import { type ExporterId, computeSpringSettleTimeMs } from "@/core"
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
  const mode = useEaseStore((s) => s.mode)
  const draftCurve = useEaseStore((s) => s.draftCurve)
  const compareQueue = useEaseStore((s) => s.compareQueue)
  const isExportOpen = useEaseStore((s) => s.isExportOpen)
  const setExportOpen = useEaseStore((s) => s.setExportOpen)
  const exportScope = useEaseStore((s) => s.exportScope)
  const setExportScope = useEaseStore((s) => s.setExportScope)
  const preferredExporter = useEaseStore((s) => s.preferredExporter)
  const setPreferredExporter = useEaseStore((s) => s.setPreferredExporter)
  const getActiveExportCode = useEaseStore((s) => s.getActiveExportCode)
  const getShareUrlHash = useEaseStore((s) => s.getShareUrlHash)
  const getActiveCurve = useEaseStore((s) => s.getActiveCurve)
  const getFocusedChannel = useEaseStore((s) => s.getFocusedChannel)

  const [hasCopiedCode, setHasCopiedCode] = React.useState(false)
  const [hasCopiedUrl, setHasCopiedUrl] = React.useState(false)
  const [highlightedHtml, setHighlightedHtml] = React.useState<string | null>(
    null
  )

  const visibleCompareItems = React.useMemo(() => {
    return compareQueue.filter((item) => item.visible)
  }, [compareQueue])

  const [selectedCompareId, setSelectedCompareId] = React.useState<
    string | null
  >(null)

  const selectedCompareItem = React.useMemo(() => {
    if (mode !== "compare" || visibleCompareItems.length === 0) return null
    if (selectedCompareId) {
      const match = visibleCompareItems.find((i) => i.id === selectedCompareId)
      if (match) return match
    }
    return visibleCompareItems[0] ?? null
  }, [mode, visibleCompareItems, selectedCompareId])

  const activeCurve = React.useMemo(() => {
    if (mode === "compare" && selectedCompareItem) {
      return selectedCompareItem.curve
    }
    if (mode === "customize" && draftCurve) {
      return draftCurve.workingCurve
    }
    return getActiveCurve()
  }, [mode, selectedCompareItem, draftCurve, getActiveCurve])

  const curveOverride = React.useMemo(() => {
    if (mode === "compare" && selectedCompareItem) {
      return selectedCompareItem.curve
    }
    if (mode === "customize" && draftCurve) {
      return draftCurve.workingCurve
    }
    return undefined
  }, [mode, selectedCompareItem, draftCurve])

  const effectiveDurationMs = React.useMemo(() => {
    const ch = getFocusedChannel()
    const base = ch?.durationMs ?? activeCurve.suggestedDurationMs
    if (activeCurve.engine === "spring" && ch?.springMode === "natural") {
      return computeSpringSettleTimeMs(activeCurve.spring, 0.005)
    }
    return base
  }, [getFocusedChannel, activeCurve])

  const isUnsavedDraft = mode === "customize" && Boolean(draftCurve?.isDirty)

  const code = React.useMemo(() => {
    return getActiveExportCode(preferredExporter, exportScope, curveOverride)
  }, [getActiveExportCode, preferredExporter, exportScope, curveOverride])

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
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="font-heading text-sm font-semibold text-foreground">
              {activeCurve.name}
            </span>
            <span className="rounded-[6px] bg-secondary px-2 py-0.5 font-sans text-[11px] font-medium text-muted-foreground tabular-nums">
              {activeCurve.engine === "spring" ? "Spring" : "Cubic Bézier"} ·{" "}
              {Math.round(effectiveDurationMs)}ms
            </span>
            {isUnsavedDraft && (
              <span className="rounded-[6px] bg-foreground px-2 py-0.5 font-sans text-[10px] font-medium text-background">
                Unsaved Draft *
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Compare Mode Contender Selector */}
        {mode === "compare" && visibleCompareItems.length > 0 && (
          <div className="flex flex-col gap-1.5 pb-1">
            <span className="font-sans text-[11px] font-medium text-muted-foreground">
              Select Contender to Export
            </span>
            <div
              role="tablist"
              aria-label="Compare contender selection"
              className="flex flex-wrap items-center gap-1 rounded-[10px] bg-muted p-0.5"
            >
              {visibleCompareItems.map((item) => {
                const isSelected = item.id === selectedCompareItem?.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-label={`Export contender ${item.curve.name}`}
                    onClick={() => setSelectedCompareId(item.id)}
                    className={cn(
                      "flex h-7 cursor-pointer items-center rounded-[8px] px-2.5 font-sans text-xs transition-colors",
                      isSelected
                        ? "bg-background font-semibold text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.curve.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

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
              aria-selected={exportScope === "ease"}
              aria-label="Export ease timing curve only"
              onClick={() => setExportScope("ease")}
              className={cn(
                "flex h-7 cursor-pointer items-center rounded-[8px] px-2.5 font-sans text-xs transition-colors",
                exportScope === "ease"
                  ? "bg-background font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Ease Only
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={exportScope === "snippet"}
              aria-label="Export full component snippet"
              onClick={() => setExportScope("snippet")}
              className={cn(
                "flex h-7 cursor-pointer items-center rounded-[8px] px-2.5 font-sans text-xs transition-colors",
                exportScope === "snippet"
                  ? "bg-background font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Snippet
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
