/**
 * @file __tests__/customize-canvas.test.tsx
 * @description Comprehensive unit tests for CurveEditorCanvas in Satisium Ease Customize Mode.
 */

import * as React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { CurveEditorCanvas } from "@/components/studio/modes/customize/curve-editor-canvas"

describe("CurveEditorCanvas & Integrated Controls (Step C-5B)", () => {
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

  it("switches between Bezier and Spring engines, updating workingCurve.engine and toggling parameter inputs", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CurveEditorCanvas />
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    // Initial state: Bezier engine, P1 and P2 inputs rendered
    expect(screen.getByLabelText("P1 X coordinate")).toBeDefined()
    expect(screen.getByLabelText("P1 Y coordinate")).toBeDefined()
    expect(screen.getByLabelText("P2 X coordinate")).toBeDefined()
    expect(screen.getByLabelText("P2 Y coordinate")).toBeDefined()
    expect(
      screen.queryByRole("button", { name: "Switch to Simple spring mode" })
    ).toBeNull()

    // Switch to Spring engine
    const springBtn = screen.getByRole("button", {
      name: "Switch to Spring engine",
    })
    act(() => {
      fireEvent.click(springBtn)
    })

    expect(storeApi!.getState().draftCurve?.workingCurve.engine).toBe("spring")
    expect(
      screen.getByRole("button", { name: "Switch to Simple spring mode" })
    ).toBeDefined()
    expect(
      screen.getByRole("button", { name: "Switch to Physics spring mode" })
    ).toBeDefined()
    expect(screen.queryByLabelText("P1 X coordinate")).toBeNull()

    // Switch back to Bezier engine
    const bezierBtn = screen.getByRole("button", {
      name: "Switch to Bezier engine",
    })
    act(() => {
      fireEvent.click(bezierBtn)
    })

    expect(storeApi!.getState().draftCurve?.workingCurve.engine).toBe("bezier")
    expect(screen.getByLabelText("P1 X coordinate")).toBeDefined()
    expect(
      screen.queryByRole("button", { name: "Switch to Simple spring mode" })
    ).toBeNull()
  })

  it("renders a clean canvas header with redundant Graph and curve name labels removed, showing Draft * only when dirty", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CurveEditorCanvas />
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    // Redundant Graph label is gone
    expect(screen.queryByText("Graph")).toBeNull()
    // Not dirty yet, so Draft * is not shown
    expect(screen.queryByText("Draft *")).toBeNull()

    // Nudge handle to mark dirty
    const p1Handle = screen.getByLabelText("Control handle P1")
    act(() => {
      fireEvent.keyDown(p1Handle, { key: "ArrowRight" })
    })

    expect(storeApi!.getState().draftCurve?.isDirty).toBe(true)
    expect(screen.getByText("Draft *")).toBeDefined()
  })

  it("nudges P1 handle via arrow keys (ArrowRight, Shift+ArrowUp), updates workingCurve.bezier.p1 cleanly, and renders Draft * indicator", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CurveEditorCanvas />
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    const p1Handle = screen.getByLabelText("Control handle P1")
    expect(p1Handle).toBeDefined()

    const initialP1 = {
      ...storeApi!.getState().draftCurve!.workingCurve.bezier.p1,
    }

    // ArrowRight nudges x by +0.01
    act(() => {
      fireEvent.keyDown(p1Handle, { key: "ArrowRight" })
    })

    const updatedP1 = storeApi!.getState().draftCurve!.workingCurve.bezier.p1
    expect(updatedP1.x).toBeCloseTo(initialP1.x + 0.01, 3)
    expect(screen.getAllByText("Draft *").length).toBeGreaterThanOrEqual(1)
    expect(storeApi!.getState().draftCurve?.isDirty).toBe(true)

    // Shift + ArrowUp nudges y by +0.05
    act(() => {
      fireEvent.keyDown(p1Handle, { key: "ArrowUp", shiftKey: true })
    })

    const finalP1 = storeApi!.getState().draftCurve!.workingCurve.bezier.p1
    expect(finalP1.y).toBeCloseTo(initialP1.y + 0.05, 3)
  })

  it("updates spring parameters accurately in Simple (Duration/Response + Bounce) and Physics (Mass, Stiffness, Damping) modes", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CurveEditorCanvas />
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    // Switch to spring engine
    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: "Switch to Spring engine" })
      )
    })

    // In Simple mode: Response/Duration + Bounce
    const durationInput = screen.getByLabelText(
      /Spring (response|duration) in milliseconds/
    )
    const bounceInput = screen.getByLabelText("Spring bounce")
    expect(durationInput).toBeDefined()
    expect(bounceInput).toBeDefined()

    act(() => {
      fireEvent.change(durationInput, { target: { value: "500" } })
    })
    act(() => {
      fireEvent.change(bounceInput, { target: { value: "0.2" } })
    })

    const springAfterSimple =
      storeApi!.getState().draftCurve!.workingCurve.spring
    expect(springAfterSimple.stiffness).toBeGreaterThan(0)
    expect(springAfterSimple.damping).toBeGreaterThan(0)

    // Switch to Physics mode: Mass, Stiffness, Damping
    const physicsBtn = screen.getByRole("button", {
      name: "Switch to Physics spring mode",
    })
    act(() => {
      fireEvent.click(physicsBtn)
    })

    const stiffnessInput = screen.getByLabelText("Spring stiffness")
    const dampingInput = screen.getByLabelText("Spring damping")
    const massInput = screen.getByLabelText("Spring mass")

    act(() => {
      fireEvent.change(stiffnessInput, { target: { value: "650" } })
    })
    expect(storeApi!.getState().draftCurve!.workingCurve.spring.stiffness).toBe(
      650
    )

    act(() => {
      fireEvent.change(dampingInput, { target: { value: "38" } })
    })
    expect(storeApi!.getState().draftCurve!.workingCurve.spring.damping).toBe(
      38
    )

    act(() => {
      fireEvent.change(massInput, { target: { value: "1.2" } })
    })
    expect(storeApi!.getState().draftCurve!.workingCurve.spring.mass).toBe(1.2)
  })

  it("flips coordinates cleanly with 'Mirror to Exit' quick action", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CurveEditorCanvas />
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    // Set known P1 and P2
    act(() => {
      storeApi!.getState().updateDraft({
        bezier: {
          p1: { x: 0.2, y: 0.8 },
          p2: { x: 0.4, y: 1.0 },
        },
      })
    })

    const mirrorBtn = screen.getByRole("button", {
      name: "Mirror curve to exit",
    })
    expect(mirrorBtn).toBeDefined()

    act(() => {
      fireEvent.click(mirrorBtn)
    })

    // (x1, y1, x2, y2) -> (1 - x2, 1 - y2, 1 - x1, 1 - y1)
    // nextP1: 1 - 0.4 = 0.6, 1 - 1.0 = 0
    // nextP2: 1 - 0.2 = 0.8, 1 - 0.8 = 0.2
    const currentBezier = storeApi!.getState().draftCurve!.workingCurve.bezier
    expect(currentBezier.p1.x).toBeCloseTo(0.6, 2)
    expect(currentBezier.p1.y).toBeCloseTo(0, 2)
    expect(currentBezier.p2.x).toBeCloseTo(0.8, 2)
    expect(currentBezier.p2.y).toBeCloseTo(0.2, 2)
  })

  it("snaps spring to critical damping (ζ = 1) with 'Critical' quick action", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CurveEditorCanvas />
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    // Switch to spring engine
    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: "Switch to Spring engine" })
      )
    })

    // Set mass = 1, stiffness = 400, velocity = 0 (critical damping = 2 * sqrt(400 * 1) = 40)
    act(() => {
      storeApi!.getState().updateDraft({
        spring: {
          mass: 1,
          stiffness: 400,
          damping: 10,
          velocity: 0,
        },
      })
    })

    const snapBtn = screen.getByRole("button", {
      name: "Snap to critical damping",
    })
    expect(snapBtn).toBeDefined()

    act(() => {
      fireEvent.click(snapBtn)
    })

    const currentSpring = storeApi!.getState().draftCurve!.workingCurve.spring
    expect(currentSpring.damping).toBeCloseTo(40, 1)
  })

  it("accepts 'cubic-bezier(0.25, 1, 0.5, 1)' via Import bar and updates the active curve", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CurveEditorCanvas />
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    // Toggle import input open
    const importToggle = screen.getByRole("button", {
      name: "Toggle curve import",
    })
    act(() => {
      fireEvent.click(importToggle)
    })

    const importInput = screen.getByLabelText("Curve import definition")
    expect(importInput).toBeDefined()

    act(() => {
      fireEvent.change(importInput, {
        target: { value: "cubic-bezier(0.25, 1, 0.5, 1)" },
      })
    })

    const applyBtn = screen.getByLabelText("Apply imported curve")
    act(() => {
      fireEvent.click(applyBtn)
    })

    const active = storeApi!.getState().getActiveCurve()
    expect(active.engine).toBe("bezier")
    expect(active.bezier.p1.x).toBeCloseTo(0.25, 2)
    expect(active.bezier.p1.y).toBeCloseTo(1, 2)
    expect(active.bezier.p2.x).toBeCloseTo(0.5, 2)
    expect(active.bezier.p2.y).toBeCloseTo(1, 2)
  })

  it("enforces zero React component re-renders on seekScoped", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined
    let renderCount = 0

    function InstrumentedCanvas() {
      renderCount++
      storeApi = useEaseStoreApi()
      return <CurveEditorCanvas />
    }

    render(
      <EaseStoreProvider>
        <InstrumentedCanvas />
      </EaseStoreProvider>
    )

    // Reset render counter after initial mount renders
    renderCount = 0

    // Seek to 100ms
    act(() => {
      storeApi!.getState().seekScoped(100)
    })

    // Invariant: zero React re-renders on clock ticks / seeks
    expect(renderCount).toBe(0)

    // Seek to 250ms
    act(() => {
      storeApi!.getState().seekScoped(250)
    })

    expect(renderCount).toBe(0)
  })

  it("enforces Satisium design language: zero border-border and zero shadow-* outlines", () => {
    const { container } = render(
      <EaseStoreProvider>
        <CurveEditorCanvas />
      </EaseStoreProvider>
    )

    expect(container.innerHTML).not.toContain("border-border")
    expect(container.innerHTML).not.toContain("shadow-")
  })
})
