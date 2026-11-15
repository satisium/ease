"use client"

import * as React from "react"
import type { TrackFrameResult } from "@/core"
import { useEaseStore, useEaseStoreApi } from "./use-ease-store"
import { useTransitionTrack } from "./use-transition-track"

export interface UsePairedHabitatOptions {
  enterTrackId: string
  exitTrackId: string
  onFrame?: (result: TrackFrameResult) => void
}

/**
 * Hook connecting 2-phase overlay habitats (Modal Dialog, Drawer, Dropdown)
 * cleanly to useTransitionTrack and useEaseStore.
 *
 * Invariant Guarantees:
 * - Deterministic phase routing: resolves activeTrackId based on focusedTrackId.
 * - Zero React virtual DOM re-renders on 120fps ticks: uses imperative bindRef.
 * - Complete unmount safety: uses `shouldForceMount` so exiting elements remain
 *   mounted and animated until playback completes.
 * - Solo & single-channel scrub retention: component remains mounted and visible
 *   when scrubbing a single channel or soloing.
 * - External synchronization: subscribes to store playback triggers (e.g. Spacebar,
 *   audition toolbar phase switches).
 */
export function usePairedHabitat({
  enterTrackId,
  exitTrackId,
  onFrame,
}: UsePairedHabitatOptions) {
  const store = useEaseStoreApi()
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
  const focusedChannelId = useEaseStore((s) => s.focusedChannelId)
  const isSolo = useEaseStore((s) => s.isSolo)

  const activeTrackId =
    focusedTrackId === exitTrackId ? exitTrackId : enterTrackId

  const isFocused =
    focusedTrackId === enterTrackId || focusedTrackId === exitTrackId

  const { bindRef, shouldForceMount: baseForceMount } = useTransitionTrack(
    activeTrackId,
    { onFrame }
  )

  // Solo & single-channel scrub retention: keep mounted whenever solo is active or
  // inspecting/scrubbing a single channel on this component family
  const isSoloOrSingleScrub = isSolo || focusedChannelId !== "all"
  const shouldForceMount = baseForceMount || (isFocused && isSoloOrSingleScrub)

  const [isOpen, setIsOpen] = React.useState(false)

  // Sync external/keyboard Spacebar, Toolbar triggers & scrub-to-end persistence
  React.useEffect(() => {
    const unsubStore = store.subscribe((curr, prev) => {
      const isSoloOrSingleCurr =
        curr.isSolo ||
        (curr.playbackState === "scrubbing" && curr.focusedChannelId !== "all")

      if (
        curr.focusedTrackId === enterTrackId &&
        curr.playbackState === "playing" &&
        prev.playbackState !== "playing"
      ) {
        setIsOpen(true)
      } else if (
        curr.focusedTrackId === exitTrackId &&
        curr.playbackState === "playing" &&
        prev.playbackState !== "playing"
      ) {
        if (!isSoloOrSingleCurr) {
          setIsOpen(false)
        }
      }
    })

    const unsubConductor = store.conductor.subscribe((snap) => {
      const state = store.getState()
      const isSoloOrSingleState =
        state.isSolo ||
        (state.playbackState === "scrubbing" &&
          state.focusedChannelId !== "all")

      // CRITICAL RETENTION RULE:
      // When isSolo === true OR (playbackState === "scrubbing" && focusedChannelId !== "all"),
      // NEVER drop isVisible to false when scrubbing hits 0% or 100% or stops!
      if (isSoloOrSingleState) {
        return
      }

      if (snap.playbackState === "scrubbing" && snap.progress >= 0.99) {
        if (state.focusedTrackId === enterTrackId) {
          setIsOpen(true)
        } else if (state.focusedTrackId === exitTrackId) {
          setIsOpen(false)
        }
      }
    })

    return () => {
      unsubStore()
      unsubConductor()
    }
  }, [store, enterTrackId, exitTrackId])

  const open = React.useCallback(() => {
    setIsOpen(true)
    store.getState().triggerLive(enterTrackId)
  }, [store, enterTrackId])

  const close = React.useCallback(() => {
    setIsOpen(false)
    store.getState().triggerLive(exitTrackId)
  }, [store, exitTrackId])

  return {
    bindRef,
    isOpen,
    isFocused,
    shouldForceMount,
    isVisible: isOpen || shouldForceMount,
    open,
    close,
  }
}
