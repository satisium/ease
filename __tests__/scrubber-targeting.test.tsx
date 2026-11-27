/**
 * @file __tests__/scrubber-targeting.test.tsx
 * @description Integration tests for Scrubber, Channel Targeting & Isolation, and Lifecycle Sync.
 */

import * as React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { StudioUiProvider } from "@/components/studio/studio-ui-context"
import { TimelineConsole } from "@/components/studio/modes/audition/center-stage/timeline-console"
import { DialogHabitat } from "@/components/studio/habitats/overlays/dialog-habitat"
import { useTransitionTrack } from "@/hooks/use-transition-track"

describe("Scrubber Block & Channel-Targeting Integration", () => {
  beforeEach(() => {
    window.localStorage.clear()
    if (typeof window.ResizeObserver === "undefined") {
      window.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("1. isolates translateY during scrubbing while backdrop and scale lock at visible rest, and animates all 3 in context during Play", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined
    let lastFrameValues: Record<string, number> = {}

    function TestHarness() {
      storeApi = useEaseStoreApi()
      useTransitionTrack("dialog:open", {
        onFrame: (frame) => {
          lastFrameValues = frame.values
        },
      })
      return (
        <StudioUiProvider>
          <TimelineConsole />
        </StudioUiProvider>
      )
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    // Focus dialog:open and select translateY channel -> auto-activates Solo
    act(() => {
      storeApi!.getState().focusTrack("dialog:open")
      storeApi!.getState().focusChannel("translateY")
    })

    expect(storeApi!.getState().focusedChannelId).toBe("translateY")
    expect(storeApi!.getState().isSolo).toBe(true)

    // With isSolo === true, scrubbing isolates translateY:
    // backdrop is locked to rest destination (0.28), scale to 1.0
    act(() => {
      storeApi!.getState().seekScoped(150)
    })
    expect(storeApi!.conductor.getSnapshot().playbackState).toBe("scrubbing")
    expect(lastFrameValues.translateY).toBeDefined()
    expect(lastFrameValues.backdrop).toBeCloseTo(0.28, 2)
    expect(lastFrameValues.scale).toBeCloseTo(1.0, 2)

    // Switch to All (isSolo = false): animates all channels while preserving focusedChannelId === "translateY"
    act(() => {
      storeApi!.getState().setSolo(false)
      storeApi!.getState().seekScoped(150)
    })

    expect(storeApi!.getState().isSolo).toBe(false)
    expect(storeApi!.getState().focusedChannelId).toBe("translateY")
    expect(lastFrameValues.translateY).toBeDefined()
    expect(lastFrameValues.backdrop).not.toBeCloseTo(0.28, 2)

    // Switch back to Solo (isSolo = true): re-isolates translateY
    act(() => {
      storeApi!.getState().setSolo(true)
      storeApi!.getState().seekScoped(150)
    })
    expect(storeApi!.getState().isSolo).toBe(true)
    expect(lastFrameValues.backdrop).toBeCloseTo(0.28, 2)

    // Now start Play with isSolo = false
    act(() => {
      storeApi!.getState().setSolo(false)
      storeApi!.getState().seekScoped(0)
      storeApi!.getState().playScoped()
    })

    expect(storeApi!.conductor.getSnapshot().playbackState).toBe("playing")
    // When playing in context with isSolo === false, all channels animate from their initial values
    // At t=0 of dialog:open:
    // backdrop starts at 0, translateY starts at 12, scale starts at 0.96
    expect(lastFrameValues.backdrop).toBeCloseTo(0, 1)
    expect(lastFrameValues.translateY).toBeCloseTo(12, 1)
    expect(lastFrameValues.scale).toBeCloseTo(0.96, 2)
  })

  it("2. updates totalDurationMs to 320ms when backdrop is selected and scrubbed, matching readout 320ms / 320ms", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return (
        <StudioUiProvider>
          <TimelineConsole />
        </StudioUiProvider>
      )
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    // Focus backdrop channel on dialog:open (auto-activates Solo)
    act(() => {
      storeApi!.getState().focusTrack("dialog:open")
      storeApi!.getState().focusChannel("backdrop")
    })

    // Scrub to 100% of backdrop duration (320ms)
    act(() => {
      storeApi!.getState().seekScoped(320)
    })

    // Store totalDurationMs and conductor totalDurationMs must be 320ms
    expect(storeApi!.getState().totalDurationMs).toBe(320)
    expect(storeApi!.conductor.getSnapshot().totalDurationMs).toBe(320)
    expect(storeApi!.conductor.getSnapshot().elapsedMs).toBe(320)

    // Verify right-hand readout shows 320ms / 320ms (both elapsed span and total button match 320ms)
    expect(screen.getAllByText("320ms").length).toBe(2)
    expect(
      screen.getByLabelText("Total duration 320ms. Click to edit")
    ).toBeDefined()
  })

  it("3. does NOT snap SatisSlider fill width backward to 0% after playing to 100% when a re-render occurs", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function ParentComponent() {
      storeApi = useEaseStoreApi()
      const [reRenderCount, setReRenderCount] = React.useState(0)
      return (
        <StudioUiProvider>
          <TimelineConsole />
          <button
            type="button"
            data-testid="trigger-rerender"
            onClick={() => setReRenderCount((c) => c + 1)}
          >
            Re-render {reRenderCount}
          </button>
        </StudioUiProvider>
      )
    }

    render(
      <EaseStoreProvider>
        <ParentComponent />
      </EaseStoreProvider>
    )

    const fill = screen.getByTestId("satis-slider-fill")

    // Seek/play to 100% on dialog:open
    act(() => {
      storeApi!.getState().focusTrack("dialog:open")
      storeApi!.getState().seekScoped(380)
    })

    // Conductor is at 100%
    expect(storeApi!.conductor.getSnapshot().progress).toBeCloseTo(1, 2)

    // Trigger unrelated parent re-render
    const reRenderBtn = screen.getByTestId("trigger-rerender")
    act(() => {
      fireEvent.click(reRenderBtn)
    })

    // Fill width must NOT be reset or snapped back to 0%
    // style.width should remain at or near 100%
    expect(fill.style.width).not.toBe("calc(16px + 0 * (100% - 16px))")
    expect(fill.style.width).toContain("1 * (100% - 16px)")
  })

  it("4. keeps Edit Profile stably open after scrubbing a closed DialogHabitat from 0% -> 100%", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return (
        <StudioUiProvider>
          <DialogHabitat />
          <TimelineConsole />
        </StudioUiProvider>
      )
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    act(() => {
      storeApi!.getState().focusTrack("dialog:open")
    })

    // Initially modal is closed
    expect(screen.queryByRole("dialog", { name: "Edit Profile" })).toBeNull()

    // Scrub dialog:open to 100% (progress >= 0.99)
    act(() => {
      storeApi!.getState().seekScoped(380)
    })

    // Modal dialog is mounted and open
    expect(screen.getByDisplayValue("Satishkumar")).toBeDefined()
    expect(screen.getByText("Edit Profile")).toBeDefined()

    // Now return conductor state to idle
    act(() => {
      storeApi!.conductor.pause()
    })

    // Since it was scrubbed to 100%, isOpen is now true, so modal remains open!
    expect(screen.getByDisplayValue("Satishkumar")).toBeDefined()
    expect(screen.getByText("Edit Profile")).toBeDefined()
  })

  it("5. focusChannel('all') cleanly resets isSolo on both store and conductor", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <div />
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    // Focus a channel (auto-activates solo)
    act(() => {
      storeApi!.getState().focusChannel("translateY")
    })

    expect(storeApi!.getState().isSolo).toBe(true)
    expect(storeApi!.conductor.getSnapshot().isSoloActive).toBe(true)

    // Call focusChannel('all')
    act(() => {
      storeApi!.getState().focusChannel("all")
    })

    expect(storeApi!.getState().focusedChannelId).toBe("all")
    expect(storeApi!.getState().isSolo).toBe(false)
    expect(storeApi!.conductor.getSnapshot().isSoloActive).toBe(false)
  })

  it("6. toggles All | Solo channel scope via the timeline console segmented pill and preserves selected channel", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return (
        <StudioUiProvider>
          <TimelineConsole />
        </StudioUiProvider>
      )
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    act(() => {
      storeApi!.getState().focusTrack("dialog:open")
      storeApi!.getState().focusChannel("backdrop")
      storeApi!.getState().setSolo(false)
    })

    const allBtn = screen.getByRole("button", {
      name: /Audition all channels/i,
    })
    const soloBtn = screen.getByRole("button", { name: /Solo active channel/i })
    expect(allBtn).toHaveAttribute("aria-pressed", "true")
    expect(soloBtn).toHaveAttribute("aria-pressed", "false")

    // Click Solo -> isolates original selected channel ("backdrop")
    act(() => {
      fireEvent.click(soloBtn)
    })
    expect(storeApi!.getState().isSolo).toBe(true)
    expect(storeApi!.getState().focusedChannelId).toBe("backdrop")
    expect(soloBtn).toHaveAttribute("aria-pressed", "true")

    // Click All -> returns to full choreography while preserving "backdrop"
    act(() => {
      fireEvent.click(allBtn)
    })
    expect(storeApi!.getState().isSolo).toBe(false)
    expect(storeApi!.getState().focusedChannelId).toBe("backdrop")
    expect(allBtn).toHaveAttribute("aria-pressed", "true")
  })
})
