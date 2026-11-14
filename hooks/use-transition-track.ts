"use client"

/**
 * @file hooks/use-transition-track.ts
 * @description 120fps zero-re-render DOM binder for interactive preview components & Compare Duel tiles.
 *
 * Invariants:
 * - ZERO React state re-renders during playback: mutates element styles imperatively on 120fps conductor ticks.
 * - Composes multi-channel transforms (translateX, translateY, scale, rotate) into a single transform matrix.
 * - Protects opacity channels from blooming outside [0, 1].
 * - Enforces mount/unmount safety via shouldForceMount so scrubbing/soloing never unmounts exiting elements.
 * - Cleanly separates standard tracks from Compare Mode contender tiles (via compareItemId).
 */

import { useCallback, useEffect, useRef } from "react"
import {
  evaluateTrackFrame,
  trackRegistry,
  type ChannelBinding,
  type TrackFrameResult,
} from "@/core"
import { useEaseStore, useEaseStoreApi } from "./use-ease-store"

export interface UseTransitionTrackOptions {
  /** Optional identifier of an item in compareQueue for Compare Mode tiles. */
  compareItemId?: string
  /** Optional frame callback receiving evaluated channel values. */
  onFrame?: (result: TrackFrameResult) => void
  /** If true, opacity values are clamped to [0, 1] during spring overshoot. Defaults to true. */
  protectOpacityOvershoot?: boolean
}

/**
 * Imperatively applies evaluated channel values to a DOM element.
 * Composes translate3d, scale, and rotate cleanly into a single transform string.
 */
function applyFrameToElement(
  el: HTMLElement,
  boundChannelIds: string[],
  channels: readonly ChannelBinding[],
  values: Record<string, number>
): void {
  let tx: number | null = null
  let txUnit = "px"
  let ty: number | null = null
  let tyUnit = "px"
  let scale: number | null = null
  let rotate: number | null = null

  for (const channelId of boundChannelIds) {
    const val = values[channelId]
    if (val === undefined) continue

    const ch = channels.find((c) => c.id === channelId)
    if (!ch) continue

    if (ch.property === "opacity") {
      el.style.opacity = String(val)
    } else if (ch.property === "blur") {
      el.style.filter = `blur(${val}${ch.unit || "px"})`
    } else if (ch.property === "translateX") {
      tx = val
      txUnit = ch.unit || "px"
    } else if (ch.property === "translateY") {
      ty = val
      tyUnit = ch.unit || "px"
    } else if (ch.property === "scale") {
      scale = val
    } else if (ch.property === "rotate") {
      rotate = val
    }
  }

  const transformParts: string[] = []
  if (tx !== null || ty !== null) {
    const xStr = tx !== null ? `${tx}${txUnit}` : "0px"
    const yStr = ty !== null ? `${ty}${tyUnit}` : "0px"
    transformParts.push(`translate3d(${xStr}, ${yStr}, 0)`)
  }
  if (scale !== null) {
    transformParts.push(`scale(${scale})`)
  }
  if (rotate !== null) {
    transformParts.push(`rotate(${rotate}deg)`)
  }

  if (transformParts.length > 0) {
    el.style.transform = transformParts.join(" ")
  }
}

/**
 * Hook connecting any UI widget (Dialog, Drawer, Dropdown, Button, etc.) or Compare contender tile
 * to the 120fps TrackConductor with zero React virtual DOM re-renders.
 */
export function useTransitionTrack(
  trackId: string,
  options?: UseTransitionTrackOptions
) {
  const {
    compareItemId,
    protectOpacityOvershoot = true,
    onFrame,
  } = options ?? {}

  const store = useEaseStoreApi()

  // Low-frequency store state
  const mode = useEaseStore((s) => s.mode)
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
  const focusedChannelId = useEaseStore((s) => s.focusedChannelId)
  const isSolo = useEaseStore((s) => s.isSolo)
  const isReducedMotion = useEaseStore((s) => s.isReducedMotion)
  const playbackState = useEaseStore((s) => s.playbackState)
  const trackBindings = useEaseStore((s) => s.trackBindings)
  const compareQueue = useEaseStore((s) => s.compareQueue)
  const globalCompareTarget = useEaseStore((s) => s.globalCompareTarget)

  const elementsRef = useRef<Map<HTMLElement, string[]>>(new Map())
  const onFrameRef = useRef(onFrame)
  useEffect(() => {
    onFrameRef.current = onFrame
  })

  const isFocused = compareItemId
    ? mode === "compare"
    : focusedTrackId === trackId

  const shouldForceMount = compareItemId
    ? mode === "compare"
    : isFocused && (playbackState !== "idle" || isSolo)

  // Resolve effective track and channels
  let effectiveTrackId = trackId
  if (compareItemId) {
    const item = compareQueue.find((i) => i.id === compareItemId)
    effectiveTrackId = item?.overrideTrackId ?? globalCompareTarget.trackId
  }

  const baseTrack =
    trackRegistry.get(effectiveTrackId) ?? trackRegistry.list()[0]
  const currentChannels: readonly ChannelBinding[] =
    trackBindings[effectiveTrackId] ?? baseTrack.channels

  // Evaluator function for this specific track
  const evaluateFrame = useCallback(
    (elapsedMs: number): TrackFrameResult | null => {
      if (compareItemId) {
        return store
          .getState()
          .evaluateCompareItemFrame(compareItemId, elapsedMs)
      }

      const conductorSnap = store.conductor.getSnapshot()
      return evaluateTrackFrame({
        track: {
          phase: baseTrack.phase,
          channels: [...currentChannels],
        },
        elapsedMs,
        soloChannelId:
          isSolo && focusedChannelId !== "all" ? focusedChannelId : null,
        isReducedMotion,
        protectOpacityOvershoot,
        interruptions: conductorSnap.interruptions,
      })
    },
    [
      store,
      compareItemId,
      protectOpacityOvershoot,
      baseTrack.phase,
      currentChannels,
      isSolo,
      focusedChannelId,
      isReducedMotion,
    ]
  )

  // Stable ref binder callback
  const bindRef = useCallback(
    (channelIds: string | string[]) => {
      const normalized = Array.isArray(channelIds) ? channelIds : [channelIds]
      return (el: HTMLElement | null) => {
        if (el) {
          elementsRef.current.set(el, normalized)
          // Style element immediately on attachment to prevent flash
          const elapsed = store.conductor.getSnapshot().elapsedMs
          const frame = evaluateFrame(elapsed)
          if (frame) {
            applyFrameToElement(el, normalized, currentChannels, frame.values)
          }
        }
      }
    },
    [store, evaluateFrame, currentChannels]
  )

  // 120fps conductor subscriber
  useEffect(() => {
    function applyCurrentFrame(elapsedMs: number) {
      const frame = evaluateFrame(elapsedMs)
      if (!frame) return

      for (const [el, boundChannels] of elementsRef.current) {
        if (!el.isConnected) {
          elementsRef.current.delete(el)
          continue
        }
        applyFrameToElement(el, boundChannels, currentChannels, frame.values)
      }

      onFrameRef.current?.(frame)
    }

    // Apply resting frame immediately on mount / dependency changes
    applyCurrentFrame(store.conductor.getSnapshot().elapsedMs)

    const unsubscribe = store.conductor.subscribe((snap) => {
      if (isFocused || compareItemId) {
        applyCurrentFrame(snap.elapsedMs)
      }
    })

    return unsubscribe
  }, [store, isFocused, compareItemId, evaluateFrame, currentChannels])

  const triggerLive = useCallback(() => {
    store.getState().triggerLive(trackId)
  }, [store, trackId])

  return {
    bindRef,
    shouldForceMount,
    isFocused,
    triggerLive,
  }
}
