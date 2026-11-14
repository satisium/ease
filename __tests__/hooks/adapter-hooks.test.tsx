/**
 * @file __tests__/hooks/adapter-hooks.test.tsx
 * @description Comprehensive unit and integration test suite for Satisium Ease React Adapter Hooks.
 */

import * as React from "react"
import { act, render, renderHook, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { serializeEaseStorage } from "@/core"
import { useClockRef } from "@/hooks/use-clock-ref"
import {
  EASE_STORAGE_KEY,
  EaseStoreProvider,
  useEaseStore,
  useEaseStoreApi,
} from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"

describe("React Adapter Hooks (Phase A)", () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.location.hash = ""
  })

  afterEach(() => {
    window.localStorage.clear()
    window.location.hash = ""
    vi.restoreAllMocks()
  })

  describe("useEaseStore & <EaseStoreProvider>", () => {
    it("throws a descriptive error when useEaseStoreApi is called outside <EaseStoreProvider>", () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      expect(() => renderHook(() => useEaseStoreApi())).toThrow(
        "useEaseStoreApi must be used within an <EaseStoreProvider>"
      )
      consoleError.mockRestore()
    })

    it("hydrates correctly from localStorage on mount", async () => {
      const customPayload = serializeEaseStorage({
        customCurves: [
          {
            id: "persisted-custom-1",
            name: "Persisted Curve",
            engine: "bezier",
            bezier: { p1: { x: 0.2, y: 0.8 }, p2: { x: 0.4, y: 1 } },
            spring: { mass: 1, stiffness: 300, damping: 28, velocity: 0 },
            suggestedDurationMs: 320,
            isCustom: true,
          },
        ],
        activeTrackId: "drawer:open",
        activeChannelId: "translateY",
        preferredExporter: "gsap",
        loopDelayMs: 550,
      })

      window.localStorage.setItem(EASE_STORAGE_KEY, customPayload)

      function StateViewer() {
        const trackId = useEaseStore((s) => s.focusedTrackId)
        const exporter = useEaseStore((s) => s.preferredExporter)
        const loopDelay = useEaseStore((s) => s.loopDelayMs)
        return (
          <div>
            <span data-testid="track">{trackId}</span>
            <span data-testid="exporter">{exporter}</span>
            <span data-testid="loopDelay">{loopDelay}</span>
          </div>
        )
      }

      render(
        <EaseStoreProvider>
          <StateViewer />
        </EaseStoreProvider>
      )

      expect(screen.getByTestId("track").textContent).toBe("drawer:open")
      expect(screen.getByTestId("exporter").textContent).toBe("gsap")
      expect(screen.getByTestId("loopDelay").textContent).toBe("550")
    })

    it("hydrates from initial URL hash", () => {
      window.location.hash =
        "#t=button:press&ch=scale&e=bezier&m=1&k=860&c=46&d=180&sm=fit"

      function HashViewer() {
        const trackId = useEaseStore((s) => s.focusedTrackId)
        const channelId = useEaseStore((s) => s.focusedChannelId)
        return (
          <div>
            <span data-testid="track">{trackId}</span>
            <span data-testid="channel">{channelId}</span>
          </div>
        )
      }

      render(
        <EaseStoreProvider>
          <HashViewer />
        </EaseStoreProvider>
      )

      expect(screen.getByTestId("track").textContent).toBe("button:press")
      expect(screen.getByTestId("channel").textContent).toBe("scale")
    })

    it("survives React StrictMode double mount without corrupting store subscriptions", () => {
      function StrictConsumer() {
        const isPlaying = useEaseStore((s) => s.isPlaying)
        const isLooping = useEaseStore((s) => s.isLooping)
        const store = useEaseStoreApi()

        return (
          <div>
            <span data-testid="playing">{String(isPlaying)}</span>
            <span data-testid="looping">{String(isLooping)}</span>
            <button
              data-testid="toggle-loop"
              onClick={() => store.getState().setLooping(!isLooping)}
            >
              Toggle
            </button>
          </div>
        )
      }

      render(
        <React.StrictMode>
          <EaseStoreProvider>
            <StrictConsumer />
          </EaseStoreProvider>
        </React.StrictMode>
      )

      expect(screen.getByTestId("looping").textContent).toBe("false")
      act(() => {
        screen.getByTestId("toggle-loop").click()
      })
      expect(screen.getByTestId("looping").textContent).toBe("true")
    })
  })

  describe("useTransitionTrack", () => {
    it("imperatively styles elements at 120fps with zero React component re-renders", () => {
      let renderCount = 0
      let storeInstance: ReturnType<typeof useEaseStoreApi> | null = null

      function DialogHabitat() {
        renderCount++
        const store = useEaseStoreApi()
        storeInstance = store
        const { bindRef, shouldForceMount } = useTransitionTrack("dialog:open")

        return (
          <div
            data-testid="container"
            data-force-mount={String(shouldForceMount)}
          >
            <div data-testid="scrim" ref={bindRef("backdrop")} />
            <div data-testid="card" ref={bindRef(["translateY", "scale"])} />
          </div>
        )
      }

      render(
        <EaseStoreProvider>
          <DialogHabitat />
        </EaseStoreProvider>
      )

      const card = screen.getByTestId("card")
      const scrim = screen.getByTestId("scrim")

      // Elements receive initial resting styles
      expect(card.style.transform).toContain("translate3d")
      expect(card.style.transform).toContain("scale")
      expect(scrim.style.opacity).toBeDefined()

      // Enter scrubbing state (low-frequency lifecycle transition)
      act(() => {
        storeInstance?.getState().seekScoped(100)
      })

      // Reset render counter during active scrubbing
      renderCount = 0

      // Imperatively scrub timeline to 140ms
      act(() => {
        storeInstance?.getState().seekScoped(140)
      })

      // Verify DOM styles updated imperatively
      expect(card.style.transform).toContain("translate3d")
      expect(card.style.transform).toContain("scale")
      expect(Number(scrim.style.opacity)).toBeGreaterThanOrEqual(0)
      expect(Number(scrim.style.opacity)).toBeLessThanOrEqual(1)

      // CRITICAL ZERO-RE-RENDER INVARIANT:
      // Host component must NOT have re-rendered on the time scrub tick
      expect(renderCount).toBe(0)
    })

    it("evaluates shouldForceMount accurately during scrub and solo states", () => {
      let storeInstance: ReturnType<typeof useEaseStoreApi> | null = null

      function DrawerHabitat() {
        const store = useEaseStoreApi()
        storeInstance = store
        const { shouldForceMount } = useTransitionTrack("dialog:open")
        return <div data-testid="force-mount">{String(shouldForceMount)}</div>
      }

      render(
        <EaseStoreProvider>
          <DrawerHabitat />
        </EaseStoreProvider>
      )

      // Initially idle & not solo -> shouldForceMount is false
      expect(screen.getByTestId("force-mount").textContent).toBe("false")

      // Scrubbing active -> shouldForceMount becomes true
      act(() => {
        storeInstance?.getState().seekScoped(80)
      })
      expect(screen.getByTestId("force-mount").textContent).toBe("true")

      // Return to pause/idle
      act(() => {
        storeInstance?.getState().pauseScoped()
      })
      expect(screen.getByTestId("force-mount").textContent).toBe("false")

      // Focus channel and toggle solo -> shouldForceMount becomes true
      act(() => {
        storeInstance?.getState().focusChannel("translateY")
        storeInstance?.getState().toggleSolo()
      })
      expect(screen.getByTestId("force-mount").textContent).toBe("true")
    })
  })

  describe("useClockRef", () => {
    it("subscribes to clock ticks immediately on mount and on scrub without component re-renders", () => {
      let renderCount = 0
      const recordedElapsed: number[] = []
      let storeInstance: ReturnType<typeof useEaseStoreApi> | null = null

      function ClockConsumer() {
        renderCount++
        const store = useEaseStoreApi()
        storeInstance = store

        useClockRef((snap) => {
          recordedElapsed.push(snap.elapsedMs)
        })

        return <div data-testid="clock-widget" />
      }

      render(
        <EaseStoreProvider>
          <ClockConsumer />
        </EaseStoreProvider>
      )

      // Initial snapshot fired immediately on mount
      expect(recordedElapsed.length).toBeGreaterThanOrEqual(1)
      expect(recordedElapsed[0]).toBe(0)

      renderCount = 0

      // Seek timeline to 200ms
      act(() => {
        storeInstance?.getState().seekScoped(200)
      })

      // Latest recorded elapsed is 200ms
      expect(recordedElapsed[recordedElapsed.length - 1]).toBe(200)

      // Host component was NOT re-rendered
      expect(renderCount).toBe(0)
    })
  })
})
