"use client"

import * as React from "react"
import type { TrackFrameResult } from "@/core"
import { useEaseStore, useEaseStoreApi } from "./use-ease-store"
import { useTransitionTrack } from "./use-transition-track"

export interface UsePairedHabitatOptions {
  enterTrackId: string
  exitTrackId: string
  onFrame?: (result: TrackFrameResult) => void
  compareItemId?: string
}

/**
 * Hook connecting 2-phase overlay habitats (Modal Dialog, Drawer, Dropdown)
 * cleanly to useTransitionTrack and useEaseStore.
 *
 * Invariant Guarantees:
 * - Deterministic phase routing: resolves activeTrackId based on focusedTrackId or compareItemId.
 * - Zero React virtual DOM re-renders on 120fps ticks: uses imperative bindRef.
 * - Complete unmount safety: uses `shouldForceMount` so exiting elements remain
 *   mounted and animated until playback completes.
 * - Solo & single-channel scrub retention: component remains mounted and visible
 *   when scrubbing a single channel or soloing.
 * - External synchronization: subscribes to store playback triggers (e.g. Spacebar,
 *   audition toolbar phase switches, Compare Mode global target changes).
 */
export function usePairedHabitat({
  enterTrackId,
  exitTrackId,
  onFrame,
  compareItemId,
}: UsePairedHabitatOptions) {
  const store = useEaseStoreApi()
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
  const focusedChannelId = useEaseStore((s) => s.focusedChannelId)
  const isSolo = useEaseStore((s) => s.isSolo)
  const isScrubAllChannels = useEaseStore((s) => s.isScrubAllChannels ?? true)
  const playbackState = useEaseStore((s) => s.playbackState)
  const compareQueue = useEaseStore((s) => s.compareQueue)
  const globalCompareTarget = useEaseStore((s) => s.globalCompareTarget)

  const activeTrackId = React.useMemo(() => {
    if (compareItemId) {
      const item = compareQueue.find((i) => i.id === compareItemId)
      const target = item?.overrideTrackId ?? globalCompareTarget.trackId
      return target === exitTrackId ? exitTrackId : enterTrackId
    }
    return focusedTrackId === exitTrackId ? exitTrackId : enterTrackId
  }, [
    compareItemId,
    compareQueue,
    globalCompareTarget.trackId,
    focusedTrackId,
    enterTrackId,
    exitTrackId,
  ])

  const isFocused = React.useMemo(() => {
    if (compareItemId) {
      const item = compareQueue.find((i) => i.id === compareItemId)
      const target = item?.overrideTrackId ?? globalCompareTarget.trackId
      return target === enterTrackId || target === exitTrackId
    }
    return focusedTrackId === enterTrackId || focusedTrackId === exitTrackId
  }, [
    compareItemId,
    compareQueue,
    globalCompareTarget.trackId,
    focusedTrackId,
    enterTrackId,
    exitTrackId,
  ])

  const { bindRef, shouldForceMount: baseForceMount } = useTransitionTrack(
    activeTrackId,
    { compareItemId, onFrame }
  )

  // Solo & single-channel scrub retention: keep mounted whenever solo is active or
  // inspecting/scrubbing an isolated channel on this component family
  const isSoloOrSingleScrub =
    isSolo || (!isScrubAllChannels && focusedChannelId !== "all")
  const shouldForceMount = compareItemId
    ? playbackState !== "idle"
    : baseForceMount || (isFocused && isSoloOrSingleScrub)

  const [isOpen, setIsOpen] = React.useState(() => {
    if (compareItemId) {
      const state = store.getState()
      const item = state.compareQueue.find((i) => i.id === compareItemId)
      const target = item?.overrideTrackId ?? state.globalCompareTarget.trackId
      return target === exitTrackId
    }
    return false
  })

  // Sync external/keyboard Spacebar, Toolbar triggers, scrub-to-end persistence & Compare Mode
  React.useEffect(() => {
    const unsubStore = store.subscribe((curr, prev) => {
      if (compareItemId) {
        const item = curr.compareQueue.find((i) => i.id === compareItemId)
        const targetTrackId =
          item?.overrideTrackId ?? curr.globalCompareTarget.trackId
        const prevItem = prev.compareQueue.find((i) => i.id === compareItemId)
        const prevTargetTrackId =
          prevItem?.overrideTrackId ?? prev.globalCompareTarget.trackId

        // Target switched from enter to exit
        if (
          targetTrackId === exitTrackId &&
          prevTargetTrackId === enterTrackId
        ) {
          setIsOpen(true)
        } else if (
          targetTrackId === enterTrackId &&
          prevTargetTrackId === exitTrackId &&
          curr.playbackState === "idle"
        ) {
          setIsOpen(false)
        }

        // Playback started
        if (
          curr.playbackState === "playing" &&
          prev.playbackState !== "playing"
        ) {
          if (targetTrackId === enterTrackId) {
            setIsOpen(true)
          } else if (targetTrackId === exitTrackId) {
            setIsOpen(true)
          }
        }

        // Playback completed
        if (curr.playbackState === "idle" && prev.playbackState === "playing") {
          if (targetTrackId === exitTrackId) {
            setIsOpen(false)
          } else if (targetTrackId === enterTrackId) {
            setIsOpen(true)
          }
        }
        return
      }

      const isSoloOrSingleCurr =
        curr.isSolo ||
        (curr.playbackState === "scrubbing" &&
          !(curr.isScrubAllChannels ?? true) &&
          curr.focusedChannelId !== "all")

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
      if (compareItemId) {
        const item = state.compareQueue.find((i) => i.id === compareItemId)
        const targetTrackId =
          item?.overrideTrackId ?? state.globalCompareTarget.trackId

        if (snap.playbackState === "scrubbing") {
          if (snap.progress >= 0.99) {
            if (targetTrackId === enterTrackId) {
              setIsOpen(true)
            } else if (targetTrackId === exitTrackId) {
              setIsOpen(false)
            }
          } else if (snap.progress <= 0.01) {
            if (targetTrackId === enterTrackId) {
              setIsOpen(false)
            } else if (targetTrackId === exitTrackId) {
              setIsOpen(true)
            }
          }
        }
        return
      }

      const isSoloOrSingleState =
        state.isSolo ||
        (state.playbackState === "scrubbing" &&
          !(state.isScrubAllChannels ?? true) &&
          state.focusedChannelId !== "all")

      // CRITICAL RETENTION RULE:
      // When isSolo === true OR (playbackState === "scrubbing" && !isScrubAllChannels && focusedChannelId !== "all"),
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
  }, [store, enterTrackId, exitTrackId, compareItemId])

  const open = React.useCallback(() => {
    setIsOpen(true)
    if (compareItemId) {
      const state = store.getState()
      const item = state.compareQueue.find((i) => i.id === compareItemId)
      if (item?.overrideTrackId) {
        store.getState().setCompareTileOverride(compareItemId, {
          trackId: enterTrackId,
        })
      } else if (state.globalCompareTarget.trackId !== enterTrackId) {
        store.getState().setGlobalCompareTarget({ trackId: enterTrackId })
      }
      store.getState().playScoped()
    } else {
      store.getState().triggerLive(enterTrackId)
    }
  }, [store, enterTrackId, compareItemId])

  const close = React.useCallback(() => {
    if (compareItemId) {
      const state = store.getState()
      const item = state.compareQueue.find((i) => i.id === compareItemId)
      if (item?.overrideTrackId) {
        store.getState().setCompareTileOverride(compareItemId, {
          trackId: exitTrackId,
        })
      } else if (state.globalCompareTarget.trackId !== exitTrackId) {
        store.getState().setGlobalCompareTarget({ trackId: exitTrackId })
      }
      store.getState().playScoped()
    } else {
      setIsOpen(false)
      store.getState().triggerLive(exitTrackId)
    }
  }, [store, exitTrackId, compareItemId])

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
