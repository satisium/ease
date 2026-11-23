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
import { motion, LayoutGroup, AnimatePresence } from "motion/react"
import { type ExporterId, computeSpringSettleTimeMs } from "@/core"
import { useEaseStore } from "@/hooks/use-ease-store"
import { trackEvent } from "@/lib/analytics"
import {
  SATISIUM_SPRING_PILL,
  SATISIUM_PRESS_CLASS,
  SATISIUM_IOS_SHEET_EASE,
} from "@/lib/motion"

const EXPORTERS: { id: ExporterId; label: string }[] = [
  { id: "css", label: "CSS" },
  { id: "tailwind", label: "Tailwind" },
  { id: "motion", label: "Motion" },
  { id: "gsap", label: "GSAP" },
]

const FRAMEWORK_ORDER: Record<ExporterId, number> = {
  css: 0,
  tailwind: 1,
  motion: 2,
  gsap: 3,
}

const SCOPE_ORDER: Record<string, number> = {
  ease: 0,
  snippet: 1,
}

const codeSlideVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? "100%" : "-100%",
    opacity: 1,
  }),
  center: {
    x: "0%",
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? "-100%" : "100%",
    opacity: 1,
  }),
}

const codeSlideTransition = {
  duration: 0.28,
  ease: SATISIUM_IOS_SHEET_EASE,
} as const

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
  const [codeSlideDir, setCodeSlideDir] = React.useState<number>(1)

  const [isCodeSliding, setIsCodeSliding] = React.useState(false)
  const codeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (codeTimerRef.current) clearTimeout(codeTimerRef.current)
    }
  }, [])

  const handleCodeAnimationStart = React.useCallback(() => {
    setIsCodeSliding(true)
    if (codeTimerRef.current) clearTimeout(codeTimerRef.current)
    codeTimerRef.current = setTimeout(() => {
      setIsCodeSliding(false)
    }, 350)
  }, [])

  const handleCodeAnimationComplete = React.useCallback(() => {
    if (codeTimerRef.current) clearTimeout(codeTimerRef.current)
    setIsCodeSliding(false)
  }, [])

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

  const handleFrameworkChange = React.useCallback(
    (target: ExporterId) => {
      if (target === preferredExporter) return
      setCodeSlideDir(
        FRAMEWORK_ORDER[target] >= FRAMEWORK_ORDER[preferredExporter] ? 1 : -1
      )
      setPreferredExporter(target)
    },
    [preferredExporter, setPreferredExporter]
  )

  const handleScopeChange = React.useCallback(
    (target: "ease" | "snippet") => {
      if (target === exportScope) return
      setCodeSlideDir(SCOPE_ORDER[target] >= SCOPE_ORDER[exportScope] ? 1 : -1)
      setExportScope(target)
    },
    [exportScope, setExportScope]
  )

  const handleCompareSelect = React.useCallback(
    (targetId: string) => {
      if (targetId === selectedCompareItem?.id) return
      const currIdx = visibleCompareItems.findIndex(
        (i) => i.id === selectedCompareItem?.id
      )
      const targetIdx = visibleCompareItems.findIndex((i) => i.id === targetId)
      setCodeSlideDir(targetIdx >= currIdx ? 1 : -1)
      setSelectedCompareId(targetId)
    },
    [selectedCompareItem, visibleCompareItems]
  )

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
      trackEvent("ease_curve_copied", {
        format: preferredExporter,
        scope: exportScope,
        engine: activeCurve.engine,
      })
      setTimeout(() => setHasCopiedCode(false), 2000)
    } catch {
      // Fallback
    }
  }, [code, preferredExporter, exportScope, activeCurve.engine])

  const handleCopyUrl = React.useCallback(async () => {
    try {
      const hash = getShareUrlHash()
      const shareUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}${hash}`
          : hash
      await navigator.clipboard.writeText(shareUrl)
      setHasCopiedUrl(true)
      trackEvent("ease_share_url_copied", { engine: activeCurve.engine })
      setTimeout(() => setHasCopiedUrl(false), 2000)
    } catch {
      // Fallback
    }
  }, [getShareUrlHash, activeCurve.engine])

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
            <LayoutGroup id="export-compare-group">
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
                      onClick={() => handleCompareSelect(item.id)}
                      className={cn(
                        "relative z-10 flex h-7 cursor-pointer items-center rounded-[8px] px-2.5 font-sans text-xs transition-colors outline-none",
                        SATISIUM_PRESS_CLASS,
                        isSelected
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="export-compare-pill"
                          transition={SATISIUM_SPRING_PILL}
                          className="absolute inset-0 rounded-[8px] bg-background"
                        />
                      )}
                      <span className="relative z-20">{item.curve.name}</span>
                    </button>
                  )
                })}
              </div>
            </LayoutGroup>
          </div>
        )}

        {/* Controls: Target Framework + Scope */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          {/* Framework Segmented Switcher */}
          <LayoutGroup id="export-framework-group">
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
                    onClick={() => handleFrameworkChange(exp.id)}
                    className={cn(
                      "relative z-10 flex h-7 cursor-pointer items-center rounded-[8px] px-2.5 font-sans text-xs transition-colors outline-none",
                      SATISIUM_PRESS_CLASS,
                      isSelected
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="export-framework-pill"
                        transition={SATISIUM_SPRING_PILL}
                        className="absolute inset-0 rounded-[8px] bg-background"
                      />
                    )}
                    <span className="relative z-20">{exp.label}</span>
                  </button>
                )
              })}
            </div>
          </LayoutGroup>

          {/* Scope Segmented Switcher */}
          <LayoutGroup id="export-scope-group">
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
                onClick={() => handleScopeChange("ease")}
                className={cn(
                  "relative z-10 flex h-7 cursor-pointer items-center rounded-[8px] px-2.5 font-sans text-xs transition-colors outline-none",
                  SATISIUM_PRESS_CLASS,
                  exportScope === "ease"
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {exportScope === "ease" && (
                  <motion.div
                    layoutId="export-scope-pill"
                    transition={SATISIUM_SPRING_PILL}
                    className="absolute inset-0 rounded-[8px] bg-background"
                  />
                )}
                <span className="relative z-20">Ease Only</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={exportScope === "snippet"}
                aria-label="Export full component snippet"
                onClick={() => handleScopeChange("snippet")}
                className={cn(
                  "relative z-10 flex h-7 cursor-pointer items-center rounded-[8px] px-2.5 font-sans text-xs transition-colors outline-none",
                  SATISIUM_PRESS_CLASS,
                  exportScope === "snippet"
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {exportScope === "snippet" && (
                  <motion.div
                    layoutId="export-scope-pill"
                    transition={SATISIUM_SPRING_PILL}
                    className="absolute inset-0 rounded-[8px] bg-background"
                  />
                )}
                <span className="relative z-20">Snippet</span>
              </button>
            </div>
          </LayoutGroup>
        </div>

        {/* Generated Code Area (Borderless Squircle Viewport) */}
        <div className="relative max-h-[360px] min-h-[160px] overflow-hidden rounded-[14px] bg-muted p-4">
          {/* Active Edge Progressive Blur Vignettes during Code Slide */}
          {isCodeSliding && (
            <>
              <div
                aria-hidden="true"
                className="progressive-blur-left-muted pointer-events-none absolute inset-y-0 left-0 z-20 w-4 select-none"
              />
              <div
                aria-hidden="true"
                className="progressive-blur-right-muted pointer-events-none absolute inset-y-0 right-0 z-20 w-4 select-none"
              />
            </>
          )}

          {typeof process !== "undefined" && process.env.NODE_ENV === "test" ? (
            <div className="max-h-[328px] w-full overflow-auto">
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
          ) : (
            <AnimatePresence
              mode="popLayout"
              initial={false}
              custom={codeSlideDir}
            >
              <motion.div
                key={`${preferredExporter}-${exportScope}-${activeCurve.id}`}
                custom={codeSlideDir}
                variants={codeSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={codeSlideTransition}
                onAnimationStart={handleCodeAnimationStart}
                onAnimationComplete={handleCodeAnimationComplete}
                className="max-h-[328px] w-full overflow-auto will-change-transform"
              >
                {highlightedHtml ? (
                  <div
                    className="font-mono text-[13px] leading-relaxed select-text [&_code]:!bg-transparent [&_code]:break-all [&_code]:whitespace-pre-wrap [&_pre]:!m-0 [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:break-all [&_pre]:whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                  />
                ) : (
                  <pre className="font-mono text-[13px] leading-relaxed break-all whitespace-pre-wrap text-foreground select-text">
                    <code className="break-all whitespace-pre-wrap">
                      {code}
                    </code>
                  </pre>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          {/* Share URL */}
          <button
            type="button"
            onClick={handleCopyUrl}
            aria-label="Copy shareable URL to clipboard"
            className={cn(
              "relative inline-flex h-8 cursor-pointer items-center justify-center overflow-hidden rounded-[8px] bg-secondary px-3.5 font-sans text-xs font-medium text-foreground transition-colors hover:bg-muted",
              SATISIUM_PRESS_CLASS
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {hasCopiedUrl ? (
                <motion.span
                  key="copied-url"
                  initial={{ y: "120%", opacity: 1 }}
                  animate={{ y: "0%", opacity: 1 }}
                  exit={{ y: "-120%", opacity: 1 }}
                  transition={{ duration: 0.2, ease: SATISIUM_IOS_SHEET_EASE }}
                  className="inline-flex items-center gap-1.5 will-change-transform"
                >
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    className="size-3.5 text-foreground"
                  />
                  <span>URL Copied!</span>
                </motion.span>
              ) : (
                <motion.span
                  key="copy-url"
                  initial={{ y: "120%", opacity: 1 }}
                  animate={{ y: "0%", opacity: 1 }}
                  exit={{ y: "-120%", opacity: 1 }}
                  transition={{ duration: 0.2, ease: SATISIUM_IOS_SHEET_EASE }}
                  className="inline-flex items-center gap-1.5 will-change-transform"
                >
                  <HugeiconsIcon icon={Link01Icon} className="size-3.5" />
                  <span>Copy Share URL</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label="Copy generated code to clipboard"
            className={cn(
              "relative inline-flex h-8 cursor-pointer items-center justify-center overflow-hidden rounded-[8px] bg-foreground px-4 font-sans text-xs font-medium text-background transition-colors hover:opacity-90",
              SATISIUM_PRESS_CLASS
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {hasCopiedCode ? (
                <motion.span
                  key="copied-code"
                  initial={{ y: "120%", opacity: 1 }}
                  animate={{ y: "0%", opacity: 1 }}
                  exit={{ y: "-120%", opacity: 1 }}
                  transition={{ duration: 0.2, ease: SATISIUM_IOS_SHEET_EASE }}
                  className="inline-flex items-center gap-1.5 will-change-transform"
                >
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    className="size-3.5 text-background"
                  />
                  <span>Copied!</span>
                </motion.span>
              ) : (
                <motion.span
                  key="copy-code"
                  initial={{ y: "120%", opacity: 1 }}
                  animate={{ y: "0%", opacity: 1 }}
                  exit={{ y: "-120%", opacity: 1 }}
                  transition={{ duration: 0.2, ease: SATISIUM_IOS_SHEET_EASE }}
                  className="inline-flex items-center gap-1.5 will-change-transform"
                >
                  <HugeiconsIcon icon={Copy01Icon} className="size-3.5" />
                  <span>Copy Code</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
