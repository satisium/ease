"use client"

import * as React from "react"
import { useEaseStore } from "@/hooks/use-ease-store"
import { StudioUiProvider, useStudioUi } from "./studio-ui-context"
import { AuditionView } from "./modes/audition/audition-view"
import { ExportDialog } from "./export-dialog"

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
    <div className="h-dvh w-full overflow-hidden bg-muted p-2 font-sans select-none">
      <AuditionView />
      <ExportDialog />
    </div>
  )
}

export function StudioShell() {
  return (
    <StudioUiProvider>
      <StudioShellInner />
    </StudioUiProvider>
  )
}
