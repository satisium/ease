"use client"

import * as React from "react"
import { useEaseStore, useEaseStoreApi } from "./use-ease-store"
import { useTransitionTrack } from "./use-transition-track"

export interface UsePairedHabitatOptions {
  enterTrackId: string
  exitTrackId: string
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
 * - External synchronization: subscribes to store playback triggers (e.g. Spacebar,
 *   audition toolbar phase switches).
 */
export function usePairedHabitat({
  enterTrackId,
  exitTrackId,
}: UsePairedHabitatOptions) {
  const store = useEaseStoreApi()
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)

  const activeTrackId =
    focusedTrackId === exitTrackId ? exitTrackId : enterTrackId

  const { bindRef, shouldForceMount } = useTransitionTrack(activeTrackId)
  const isFocused =
    focusedTrackId === enterTrackId || focusedTrackId === exitTrackId

  const [isOpen, setIsOpen] = React.useState(false)

  // Sync external/keyboard Spacebar, Toolbar triggers & scrub-to-end persistence
  React.useEffect(() => {
    const unsubStore = store.subscribe((curr, prev) => {
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
        setIsOpen(false)
      }
    })

    const unsubConductor = store.conductor.subscribe((snap) => {
      if (snap.playbackState === "scrubbing" && snap.progress >= 0.99) {
        const state = store.getState()
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
