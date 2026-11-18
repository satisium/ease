/**
 * @file __tests__/customize-mode-morph.test.tsx
 * @description Master integration test for Phase C in-place mode morph (Preview Mode 1 <-> Customize Mode 2).
 */

import * as React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react"
import { MotionConfig } from "motion/react"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { StudioShell } from "@/components/studio/studio-shell"

describe("Phase C Master Integration: Mode 1 <-> Mode 2 In-Place Morph (Step C-5B)", () => {
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

  it("smoothly morphs between PreviewTheater and CustomizeTheater in-place with continuous PresetCatalog and anchor mounting", async () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <StudioShell />
    }

    render(
      <MotionConfig reducedMotion="always">
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </MotionConfig>
    )

    // 1. Initial State: Mode 1 (Preview)
    expect(storeApi!.getState().mode).toBe("preview")
    expect(screen.getAllByText("Position").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByLabelText("Motion Guide")).toBeDefined()

    // Anchors are continuously mounted: BrandSlab, PresetCatalog, TimelineConsole, CompareQueueSlab, Export
    expect(screen.getByText("Ease")).toBeDefined()
    expect(screen.getByText("v1.0")).toBeDefined()
    expect(screen.getByLabelText("Preset Catalog")).toBeDefined()
    expect(screen.getByLabelText("Play animation")).toBeDefined()
    expect(screen.getByLabelText("Compare Queue")).toBeDefined()
    expect(screen.getByLabelText("Export kinetic curve code")).toBeDefined()

    // 2. Click Tune squircle (aria-label="Customize curve")
    const tuneBtn = screen.getByLabelText("Customize curve")
    act(() => {
      fireEvent.click(tuneBtn)
    })

    // Mode morphs to customize
    expect(storeApi!.getState().mode).toBe("customize")

    // Left Flank: PresetCatalog remains permanently open so user can switch presets while customizing!
    expect(screen.getByLabelText("Preset Catalog")).toBeDefined()

    // Center Stage has morphed to CustomizeTheater (CurveEditorCanvas + CustomizeMicroPreview)
    await waitFor(() => {
      expect(screen.getByLabelText("Curve Editor Canvas")).toBeDefined()
    })
    expect(
      screen.getByRole("button", { name: "Switch to Bezier engine" })
    ).toBeDefined()
    expect(
      screen.getByRole("button", { name: "Switch to Spring engine" })
    ).toBeDefined()
    expect(screen.getByLabelText("P1 X coordinate")).toBeDefined()
    expect(
      screen.getByRole("button", { name: "Switch to Component preview" })
    ).toBeDefined()

    // Right Flank has morphed to CustomizeTelemetrySlab
    await waitFor(() => {
      expect(screen.getByLabelText("Curve Telemetry")).toBeDefined()
    })
    expect(screen.getByText("t95 Arrival")).toBeDefined()
    expect(screen.getByText("Settle (ts)")).toBeDefined()
    expect(screen.queryByText(/Diff vs/i)).toBeNull()
    expect(screen.getByText("Best Use Cases")).toBeDefined()

    // Anchors remain mounted in Customize mode!
    expect(screen.getByText("Ease")).toBeDefined()
    expect(screen.getByLabelText("Play animation")).toBeDefined()
    expect(screen.getByLabelText("Compare Queue")).toBeDefined()
    expect(screen.getByLabelText("Export kinetic curve code")).toBeDefined()

    // 3. Nudging P1 updates Diff vs & shows Draft *
    const p1Handle = screen.getByLabelText("Control handle P1")
    act(() => {
      fireEvent.keyDown(p1Handle, { key: "ArrowRight" })
    })
    expect(screen.getAllByText("Draft *").length).toBeGreaterThanOrEqual(1)
    expect(storeApi!.getState().draftCurve?.isDirty).toBe(true)
    expect(screen.getByText(/Diff vs/i)).toBeDefined()

    // 4. Switching modes in Customize: switch to Component preview, then back to Primitives
    const componentBtn = screen.getByRole("button", {
      name: "Switch to Component preview",
    })
    act(() => {
      fireEvent.click(componentBtn)
    })
    expect(screen.getByText("Open Dialog")).toBeDefined()

    const primitivesBtn = screen.getByRole("button", {
      name: "Switch to Primitives X-Ray preview",
    })
    act(() => {
      fireEvent.click(primitivesBtn)
    })
    expect(screen.getAllByText("Position").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Scale").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Opacity").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Rotate").length).toBeGreaterThanOrEqual(1)

    // 5. Clicking Done (aria-label="Back to Audition mode") cleanly morphs Center & Right Flanks back to Preview Mode
    const backBtn = screen.getByRole("button", {
      name: "Back to Audition mode",
    })
    act(() => {
      fireEvent.click(backBtn)
    })

    expect(storeApi!.getState().mode).toBe("preview")
    expect(storeApi!.getState().draftCurve).toBeNull()

    // PresetCatalog still mounted
    expect(screen.getByLabelText("Preset Catalog")).toBeDefined()

    // Center Stage & Right Flank have morphed back
    await waitFor(() => {
      expect(screen.getAllByText("Position").length).toBeGreaterThanOrEqual(1)
      expect(screen.getByLabelText("Motion Guide")).toBeDefined()
    })

    // 6. Test keyboard hotkey 2 -> enterCustomize
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "2" }))
    })
    expect(storeApi!.getState().mode).toBe("customize")
    await waitFor(() => {
      expect(screen.getByLabelText("Curve Editor Canvas")).toBeDefined()
      expect(screen.getByLabelText("Curve Telemetry")).toBeDefined()
    })

    // 7. Satisium Design Language Invariant: Zero border-border and Zero shadow-* on Customize surfaces
    const curveCanvas = screen.getByLabelText("Curve Editor Canvas")
    const telemetrySlab = screen.getByLabelText("Curve Telemetry")
    expect(curveCanvas.outerHTML).not.toContain("border-border")
    expect(curveCanvas.outerHTML).not.toContain("shadow-")
    expect(telemetrySlab.outerHTML).not.toContain("border-border")
    expect(telemetrySlab.outerHTML).not.toContain("shadow-")

    // 8. Escape -> exitCustomize
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })
    expect(storeApi!.getState().mode).toBe("preview")
    await waitFor(() => {
      expect(screen.getByLabelText("Motion Guide")).toBeDefined()
    })
  }, 15000)
})
