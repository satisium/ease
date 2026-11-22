"use client"

import * as React from "react"
import { MotionConfig, MotionConfigContext } from "motion/react"
import { useEaseStore } from "@/hooks/use-ease-store"
import { StudioUiProvider, useStudioUi } from "./studio-ui-context"
import { AuditionView } from "./modes/audition/audition-view"
import { ExportDialog } from "./export-dialog"
import { ErrorBoundary } from "@/components/error-boundary"
import { PROJECT } from "@/lib/social-links"

function StudioShellInner() {
  const isPlaying = useEaseStore((s) => s.isPlaying)
  const isLooping = useEaseStore((s) => s.isLooping)
  const pauseScoped = useEaseStore((s) => s.pauseScoped)
  const playScoped = useEaseStore((s) => s.playScoped)
  const seekScoped = useEaseStore((s) => s.seekScoped)
  const triggerLive = useEaseStore((s) => s.triggerLive)
  const interruptActive = useEaseStore((s) => s.interruptActive)
  const setLooping = useEaseStore((s) => s.setLooping)
  const toggleSolo = useEaseStore((s) => s.toggleSolo)
  const stageActiveCurveToCompare = useEaseStore(
    (s) => s.stageActiveCurveToCompare
  )
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
  const isExportOpen = useEaseStore((s) => s.isExportOpen)
  const setExportOpen = useEaseStore((s) => s.setExportOpen)
  const mode = useEaseStore((s) => s.mode)
  const enterCustomize = useEaseStore((s) => s.enterCustomize)
  const exitCustomize = useEaseStore((s) => s.exitCustomize)
  const enterCompare = useEaseStore((s) => s.enterCompare)
  const exitCompare = useEaseStore((s) => s.exitCompare)
  const compareQueue = useEaseStore((s) => s.compareQueue)
  const navStack = useEaseStore((s) => s.navStack)
  const backToPresets = useEaseStore((s) => s.backToPresets)

  const { toggleTimeline } = useStudioUi()

  const [copiedMobileUrl, setCopiedMobileUrl] = React.useState(false)
  const handleCopyMobileUrl = React.useCallback(async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href)
        setCopiedMobileUrl(true)
        setTimeout(() => setCopiedMobileUrl(false), 2000)
      }
    } catch {
      // Fallback
    }
  }, [])

  // Global Ergonomic Hotkeys (EASE_USER_FLOW.md §9)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isInput =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.tagName === "SELECT" ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable)

      // Escape is permitted even when inside an input
      if (e.key === "Escape") {
        if (isExportOpen) {
          setExportOpen(false)
          return
        }
        if (mode !== "preview") {
          if (mode === "customize") exitCustomize()
          else if (mode === "compare") exitCompare()
          return
        }
        if (navStack.level === 1) {
          backToPresets()
          return
        }
      }

      // Suppress remaining shortcuts inside form inputs
      if (isInput) return

      // Export Shortcut: ⌘E or Ctrl+E
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault()
        setExportOpen(!isExportOpen)
        return
      }

      if (e.key === " ") {
        e.preventDefault()
        if (isPlaying) {
          pauseScoped()
        } else {
          playScoped()
        }
      } else if (e.key === "i" || e.key === "I") {
        interruptActive()
      } else if (e.key === "l" || e.key === "L") {
        setLooping(!isLooping)
      } else if (e.key === "s" || e.key === "S") {
        toggleSolo()
      } else if (e.key === "c" || e.key === "C") {
        stageActiveCurveToCompare()
      } else if (e.key === "t" || e.key === "T") {
        toggleTimeline()
      } else if (e.key === "r" || e.key === "R") {
        seekScoped(0)
        playScoped()
      } else if (e.key === "1") {
        if (mode === "customize") exitCustomize()
        else if (mode === "compare") exitCompare()
      } else if (e.key === "2") {
        enterCustomize()
      } else if (e.key === "3") {
        if (compareQueue.length >= 2) {
          enterCompare()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    isPlaying,
    isLooping,
    pauseScoped,
    playScoped,
    seekScoped,
    triggerLive,
    interruptActive,
    setLooping,
    toggleSolo,
    stageActiveCurveToCompare,
    focusedTrackId,
    isExportOpen,
    setExportOpen,
    mode,
    enterCustomize,
    exitCustomize,
    enterCompare,
    exitCompare,
    compareQueue.length,
    navStack.level,
    backToPresets,
    toggleTimeline,
  ])

  return (
    <>
      {/* 📱 Mobile Guard (< 1024px) */}
      <div className="flex h-dvh w-full items-center justify-center bg-muted p-4 font-sans select-none lg:hidden">
        <div className="flex w-full max-w-[340px] flex-col items-center gap-3 rounded-[20px] bg-background p-6 text-center">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Satisium Ease
          </h2>
          <p className="font-sans text-xs leading-relaxed text-muted-foreground">
            Crafted for desktop screens (1024px+) to sculpt 120fps motion
            curves, inspect physics dynamics, and run side-by-side curve duels.
          </p>
          <button
            type="button"
            onClick={handleCopyMobileUrl}
            aria-label="Copy studio link for desktop"
            className="inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-[10px] bg-foreground font-heading text-xs font-medium text-background transition-opacity hover:opacity-90"
          >
            {copiedMobileUrl ? "Link Copied" : "Copy Link for Desktop"}
          </button>
          <a
            href={PROJECT.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-full items-center justify-center rounded-[10px] bg-secondary font-heading text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            View on GitHub
          </a>
        </div>
      </div>

      {/* 🖥️ Desktop Workstation (1024px+) */}
      <div className="hidden h-dvh w-full overflow-hidden bg-muted p-2 font-sans select-none lg:block">
        <AuditionView />
        <ExportDialog />
      </div>
    </>
  )
}

export function StudioShell() {
  const parentConfig = React.useContext(MotionConfigContext)
  const reducedMotion =
    parentConfig.reducedMotion === "always" ? "always" : "user"

  return (
    <ErrorBoundary label="studio">
      <MotionConfig reducedMotion={reducedMotion}>
        <StudioUiProvider>
          <StudioShellInner />
        </StudioUiProvider>
      </MotionConfig>
    </ErrorBoundary>
  )
}
