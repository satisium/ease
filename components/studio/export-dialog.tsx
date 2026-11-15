"use client"

import * as React from "react"
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

export function ExportDialog() {
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

  const activeCurve = React.useMemo(() => getActiveCurve(), [getActiveCurve])
  const focusedTrack = React.useMemo(() => getFocusedTrack(), [getFocusedTrack])

  const code = React.useMemo(() => {
    return getActiveExportCode(preferredExporter, exportScope)
  }, [getActiveExportCode, preferredExporter, exportScope])

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
        className="max-w-[560px] gap-4 rounded-[20px] bg-background p-6 shadow-none"
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
        <div className="relative">
          <pre className="no-scrollbar max-h-[260px] overflow-x-auto rounded-[14px] bg-muted p-4 font-mono text-xs leading-relaxed text-foreground select-text">
            <code>{code}</code>
          </pre>
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
