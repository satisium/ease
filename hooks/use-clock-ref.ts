"use client"

/**
 * @file hooks/use-clock-ref.ts
 * @description Zero-re-render 120fps imperative tick subscriber for Timeline Scrubber, timer readouts, and SVG playheads.
 *
 * Invariants:
 * - ZERO React component re-renders during 120fps clock ticks.
 * - Dispatches ConductorSnapshot synchronously to imperative element mutation callbacks.
 * - Safely handles dynamic onTick closures via an internal ref.
 */

import { useEffect, useRef } from "react"
import type { ConductorSnapshot } from "@/core"
import { useEaseStoreApi } from "./use-ease-store"

/**
 * Subscribes imperatively to the 120fps animation clock.
 * Calls onTick immediately on mount and on every animation frame without triggering React reconciliation.
 *
 * @param onTick - Callback receiving the current ConductorSnapshot.
 */
export function useClockRef(
  onTick: (snapshot: ConductorSnapshot) => void
): void {
  const store = useEaseStoreApi()
  const onTickRef = useRef(onTick)

  useEffect(() => {
    onTickRef.current = onTick
  })

  useEffect(() => {
    // Dispatch initial snapshot immediately on mount
    onTickRef.current(store.conductor.getSnapshot())

    // Subscribe to synchronous 120fps clock ticks
    const unsubscribe = store.conductor.subscribe((snap) => {
      onTickRef.current(snap)
    })

    return unsubscribe
  }, [store])
}
