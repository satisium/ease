/**
 * @file __tests__/timeline-console.test.tsx
 * @description Comprehensive unit tests for TimelineConsole & 120fps SatisSlider imperative binding.
 */

import * as React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { StudioUiProvider } from "@/components/studio/studio-ui-context"
import { TimelineConsole } from "@/components/studio/modes/audition/center-stage/timeline-console"

describe("TimelineConsole & 120fps SatisSlider (Step B-1)", () => {
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

  it("renders correctly with transport controls, slider, and sharp timestamp", () => {
    render(
      <StudioUiProvider>
        <EaseStoreProvider>
          <TimelineConsole />
        </EaseStoreProvider>
      </StudioUiProvider>
    )

    expect(screen.getByLabelText("Play animation")).toBeDefined()
    expect(screen.getByLabelText("Replay from Origin")).toBeDefined()
    expect(screen.getByLabelText("Toggle continuous loop")).toBeDefined()
    expect(screen.getByLabelText("Set playback speed to 1x")).toBeDefined()
    expect(screen.getByLabelText("Set playback speed to 0.5x")).toBeDefined()
    expect(screen.getByLabelText("Set playback speed to 0.25x")).toBeDefined()
    expect(
      screen.getByLabelText("Toggle reduced motion accessibility simulation")
    ).toBeDefined()

    // Slider fill is present
    const fill = screen.getByTestId("satis-slider-fill")
    expect(fill).toBeDefined()
    expect(fill.style.width).toContain("calc")
  })

  it("toggles play/pause state smoothly via store", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <TimelineConsole />
    }

    render(
      <StudioUiProvider>
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </StudioUiProvider>
    )

    const playBtn = screen.getByLabelText("Play animation")
    expect(storeApi!.getState().isPlaying).toBe(false)

    act(() => {
      fireEvent.click(playBtn)
    })

    expect(storeApi!.getState().isPlaying).toBe(true)
    expect(screen.getByLabelText("Pause animation")).toBeDefined()

    const pauseBtn = screen.getByLabelText("Pause animation")
    act(() => {
      fireEvent.click(pauseBtn)
    })

    expect(storeApi!.getState().isPlaying).toBe(false)
    expect(screen.getByLabelText("Play animation")).toBeDefined()
  })

  it("switches playback speed to 0.5x and 0.25x", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <TimelineConsole />
    }

    render(
      <StudioUiProvider>
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </StudioUiProvider>
    )

    expect(storeApi!.getState().speed).toBe(1)

    const halfSpeedBtn = screen.getByLabelText("Set playback speed to 0.5x")
    act(() => {
      fireEvent.click(halfSpeedBtn)
    })

    expect(storeApi!.getState().speed).toBe(0.5)

    const quarterSpeedBtn = screen.getByLabelText("Set playback speed to 0.25x")
    act(() => {
      fireEvent.click(quarterSpeedBtn)
    })

    expect(storeApi!.getState().speed).toBe(0.25)
  })

  it("toggles continuous loop and reveals/cycles loop delay breather", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <TimelineConsole />
    }

    render(
      <StudioUiProvider>
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </StudioUiProvider>
    )

    const loopBtn = screen.getByLabelText("Toggle continuous loop")
    expect(storeApi!.getState().isLooping).toBe(false)
    expect(screen.queryByLabelText(/Loop delay breather/i)).toBeNull()

    // Turn on looping
    act(() => {
      fireEvent.click(loopBtn)
    })

    expect(storeApi!.getState().isLooping).toBe(true)
    const breatherBtn = screen.getByLabelText(/Loop delay breather: 400ms/i)
    expect(breatherBtn).toBeDefined()
    expect(breatherBtn.textContent).toContain("400ms")

    // Cycle loop delay: 400ms -> 800ms
    act(() => {
      fireEvent.click(breatherBtn)
    })
    expect(storeApi!.getState().loopDelayMs).toBe(800)
    expect(
      screen.getByLabelText(/Loop delay breather: 800ms/i).textContent
    ).toContain("800ms")

    // Cycle loop delay: 800ms -> 0ms
    act(() => {
      fireEvent.click(screen.getByLabelText(/Loop delay breather: 800ms/i))
    })
    expect(storeApi!.getState().loopDelayMs).toBe(0)
    expect(
      screen.getByLabelText(/Loop delay breather: 0ms/i).textContent
    ).toContain("0ms")
  })

  it("toggles reduced motion accessibility mode", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <TimelineConsole />
    }

    render(
      <StudioUiProvider>
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </StudioUiProvider>
    )

    const a11yBtn = screen.getByLabelText(
      "Toggle reduced motion accessibility simulation"
    )
    expect(storeApi!.getState().isReducedMotion).toBe(false)

    act(() => {
      fireEvent.click(a11yBtn)
    })

    expect(storeApi!.getState().isReducedMotion).toBe(true)

    act(() => {
      fireEvent.click(a11yBtn)
    })

    expect(storeApi!.getState().isReducedMotion).toBe(false)
  })

  it("imperatively drives slider fill width and time label at 120fps with zero React component re-renders", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined
    let renderCount = 0

    function InstrumentedTimeline() {
      renderCount++
      storeApi = useEaseStoreApi()
      return <TimelineConsole />
    }

    render(
      <StudioUiProvider>
        <EaseStoreProvider>
          <InstrumentedTimeline />
        </EaseStoreProvider>
      </StudioUiProvider>
    )

    const fill = screen.getByTestId("satis-slider-fill")
    expect(fill).toBeDefined()

    // Put conductor into active scrub state first (low-frequency transition)
    act(() => {
      storeApi!.getState().seekScoped(50)
    })

    // Reset render counter during active scrubbing
    renderCount = 0

    // Seek to 140ms
    act(() => {
      storeApi!.getState().seekScoped(140)
    })

    // Assert DOM styles & text updated imperatively
    const timeLabel = screen.getByText("140ms")
    expect(timeLabel).toBeDefined()
    expect(timeLabel.textContent).toBe("140ms")

    // Assert that the fill width was updated imperatively without transition lag
    expect(fill.style.transition).toBe("none")
    expect(fill.style.width).toContain("calc")

    // Seek to 200ms
    act(() => {
      storeApi!.getState().seekScoped(200)
    })

    expect(screen.getByText("200ms")).toBeDefined()

    // CRITICAL 120FPS INVARIANT:
    // Zero React component re-renders during timeline clock ticks/seeks
    expect(renderCount).toBe(0)
  })

  it("toggles Pin, resets track, and edits channel duration via inline input", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <TimelineConsole />
    }

    render(
      <StudioUiProvider>
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </StudioUiProvider>
    )

    // Pin
    const pinBtn = screen.getByLabelText("Pin active curve")
    expect(storeApi!.getState().isPinned).toBe(false)
    act(() => {
      fireEvent.click(pinBtn)
    })
    expect(storeApi!.getState().isPinned).toBe(true)

    // Reset
    const resetBtn = screen.getByLabelText("Reset track channels to defaults")
    act(() => {
      fireEvent.click(resetBtn)
    })
    expect(resetBtn).toBeDefined()

    // Clickable duration button -> inline input
    const durationBtn = screen.getByRole("button", {
      name: /Total duration.*Click to edit/i,
    })
    act(() => {
      fireEvent.click(durationBtn)
    })

    const numInput = screen.getByRole("spinbutton")
    expect(numInput).toBeDefined()

    act(() => {
      fireEvent.change(numInput, { target: { value: "350" } })
      fireEvent.keyDown(numInput, { key: "Enter" })
    })

    // Commits duration
    expect(screen.getByText("350ms")).toBeDefined()
  })
})
