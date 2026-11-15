"use client"

/**
 * @file hooks/use-ease-store.tsx
 * @description React 19 / Next.js 16 context provider and slice selector hook for Satisium Ease.
 *
 * Invariants:
 * - SSR-safe: does not access localStorage or window.location during initial render or SSR.
 * - Single store instance per Provider, safely initialized via useState (no ref.current during render).
 * - React 19 StrictMode resilient: pauses clock on unmount without destroying conductor subscriptions.
 * - Slice selectors powered by zustand useStore for fine-grained reactivity.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { useStore } from "zustand"
import {
  createEaseStore,
  deserializeEaseStorage,
  findCurveInCustomTree,
  getCanonicalPresetById,
  type EaseStoreState,
  type NavStackState,
  type StorageAdapter,
} from "@/core"

/** Canonical localStorage key for Satisium Ease persisted state. */
export const EASE_STORAGE_KEY = "satisium-ease-v2"

/** Inferred type of the headless Ease vanilla store. */
export type EaseStoreApi = ReturnType<typeof createEaseStore>

const EaseStoreContext = createContext<EaseStoreApi | null>(null)

export interface EaseStoreProviderProps {
  children: ReactNode
  initialHash?: string
}

let isHydrated = false

const browserStorage: StorageAdapter = {
  getItem: (key: string): string | null => {
    if (!isHydrated || typeof window === "undefined") return null
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // safe fallback on quota exceeded or security restriction
    }
  },
}

/**
 * Provides the Satisium Ease headless store instance to the component tree.
 * Handles client hydration from localStorage and URL hash gracefully.
 */
export function EaseStoreProvider({
  children,
  initialHash,
}: EaseStoreProviderProps) {
  const [store] = useState<EaseStoreApi>(() =>
    createEaseStore({
      storage: browserStorage,
      storageKey: EASE_STORAGE_KEY,
      initialHash,
    })
  )

  useEffect(() => {
    isHydrated = true
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(EASE_STORAGE_KEY)
        if (raw) {
          const persisted = deserializeEaseStorage(raw)

          let safeNavStack: NavStackState = { level: 0 }
          if (persisted.navStack?.level === 1 && persisted.navStack.curveId) {
            const curveExists =
              getCanonicalPresetById(persisted.navStack.curveId) ??
              findCurveInCustomTree(
                persisted.customCurves,
                persisted.navStack.curveId
              )
            if (curveExists) {
              safeNavStack = { level: 1, curveId: persisted.navStack.curveId }
            }
          }

          store.setState({
            customCurves: persisted.customCurves,
            preferredExporter: persisted.preferredExporter,
            navStack: safeNavStack,
          })
          store.getState().focusTrack(persisted.activeTrackId)
          store.getState().focusChannel(persisted.activeChannelId)
          store.getState().setLoopDelayMs(persisted.loopDelayMs)

          const restoredMode =
            persisted.mode === "customize" ? "customize" : "preview"
          const restoredPreviewMode =
            persisted.customizePreviewMode === "primitives"
              ? "primitives"
              : "component"

          if (restoredMode === "customize") {
            store.getState().enterCustomize()
            if (restoredPreviewMode === "primitives") {
              store.getState().setCustomizePreviewMode("primitives")
            }
          }
        }
      } catch {
        // safe fallback on corrupted storage
      }

      if (window.location.hash && window.location.hash.length > 1) {
        store.getState().applyUrlHash(window.location.hash)
      }
    }

    return () => {
      // Pause playback on unmount; do NOT destroy conductor so StrictMode re-mount is safe
      store.conductor.pause()
    }
  }, [store])

  return (
    <EaseStoreContext.Provider value={store}>
      {children}
    </EaseStoreContext.Provider>
  )
}

/**
 * Accesses the underlying headless EaseStoreApi directly.
 * Use for calling imperative actions outside of reactive selectors.
 */
export function useEaseStoreApi(): EaseStoreApi {
  const store = useContext(EaseStoreContext)
  if (!store) {
    throw new Error(
      "useEaseStoreApi must be used within an <EaseStoreProvider>"
    )
  }
  return store
}

/**
 * Reactive slice selector for the Ease store.
 * Re-renders the consuming component ONLY when the selected slice value changes.
 *
 * @param selector - Function projecting state to the desired slice.
 * @returns The selected state slice.
 */
export function useEaseStore<T>(selector: (state: EaseStoreState) => T): T {
  const store = useEaseStoreApi()
  return useStore(store, selector)
}
