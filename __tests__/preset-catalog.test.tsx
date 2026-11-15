/**
 * @file __tests__/preset-catalog.test.tsx
 * @description Comprehensive unit tests for Left Flank PresetCatalog decomposition (Level 0 & Level 1).
 */

import * as React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, act, fireEvent, within } from "@testing-library/react"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { PresetCatalog } from "@/components/studio/modes/audition/left-flank/preset-catalog"

describe("PresetCatalog & 2-Tier Git Cassette (Step B-2)", () => {
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

  it("renders Custom curves (+5, +2), engine switcher counts, and supports search filtering & popular toggle", () => {
    render(
      <EaseStoreProvider>
        <PresetCatalog />
      </EaseStoreProvider>
    )

    // Pinned Custom curves apex
    expect(screen.getByText("Custom curves")).toBeDefined()
    expect(screen.getByText("Modal Sheet")).toBeDefined()
    expect(screen.getByText("Drawer Physics")).toBeDefined()
    expect(screen.getByText("+5")).toBeDefined()
    expect(screen.getByText("+2")).toBeDefined()

    // Engine switcher with exact counts
    const bezierBtn = screen.getByText(/Bezier \(33\)/i)
    const springBtn = screen.getByText(/Spring \(26\)/i)
    expect(bezierBtn).toBeDefined()
    expect(springBtn).toBeDefined()

    // Search filtering
    const searchInput = screen.getByPlaceholderText("Search curves...")
    act(() => {
      fireEvent.change(searchInput, { target: { value: "quart" } })
    })
    expect(screen.getByText("Ease Out Quart")).toBeDefined()
    expect(screen.queryByText("Linear")).toBeNull()

    // Clear search
    act(() => {
      fireEvent.change(searchInput, { target: { value: "" } })
    })

    // Popular toggle
    const popularBtn = screen.getByText("★ Popular")
    act(() => {
      fireEvent.click(popularBtn)
    })
    expect(screen.getByText("Ease Out Quart")).toBeDefined()

    // Switch back to All
    const allBtn = screen.getByText("All")
    act(() => {
      fireEvent.click(allBtn)
    })
    expect(screen.getByText("Linear")).toBeDefined()
  })

  it("selecting a curve updates useEaseStore focused channel curve without overwriting durationMs", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function Harness() {
      storeApi = useEaseStoreApi()
      return <PresetCatalog />
    }

    render(
      <EaseStoreProvider>
        <Harness />
      </EaseStoreProvider>
    )

    const initialChannel = storeApi!.getState().getFocusedChannel()
    expect(initialChannel).not.toBeNull()
    const initialDuration = initialChannel!.durationMs

    // Single-click on "Linear" preset
    const linearBtn = screen.getByTitle(/Linear · Click to select/i)
    act(() => {
      fireEvent.click(linearBtn)
    })

    const updatedChannel = storeApi!.getState().getFocusedChannel()
    expect(updatedChannel?.curve.id).toBe("linear")
    // Duration Integrity Law: durationMs is NOT overwritten by the curve selection!
    expect(updatedChannel?.durationMs).toBe(initialDuration)
  })

  it("double-clicking Modal Sheet slides to Level 1, supports inline rename", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function Harness() {
      storeApi = useEaseStoreApi()
      return <PresetCatalog />
    }

    render(
      <EaseStoreProvider>
        <Harness />
      </EaseStoreProvider>
    )

    // Double-click Modal Sheet to inspect
    const modalSheetBtn = screen.getByTitle(
      /Modal Sheet · Click to select · Double-click to expand variants/i
    )
    act(() => {
      fireEvent.doubleClick(modalSheetBtn)
    })

    expect(storeApi!.getState().navStack).toEqual({
      level: 1,
      curveId: "modal-sheet",
    })

    // Level 1 cassette displays top nav, back button, and curve details
    expect(screen.getByLabelText("Back to preset library")).toBeDefined()
    expect(screen.getByText("Variants")).toBeDefined()

    // Inline rename
    const renameBtn = screen.getByLabelText("Rename curve")
    act(() => {
      fireEvent.click(renameBtn)
    })

    const titleInput = screen.getByDisplayValue("Modal Sheet")
    act(() => {
      fireEvent.change(titleInput, { target: { value: "Modal Sheet Renamed" } })
      fireEvent.keyDown(titleInput, { key: "Enter" })
    })

    // Verifies store updated the curve name
    const updatedCustom = storeApi!
      .getState()
      .customCurves.find((c) => c.id === "modal-sheet")
    expect(updatedCustom?.name).toBe("Modal Sheet Renamed")

    // Back to presets
    const backBtn = screen.getByLabelText("Back to preset library")
    act(() => {
      fireEvent.click(backBtn)
    })
    expect(storeApi!.getState().navStack).toEqual({ level: 0 })
  })

  it("handles + Add Variant, Promote to Root cleanly, and Deletion cascades safely", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function Harness() {
      storeApi = useEaseStoreApi()
      return <PresetCatalog />
    }

    render(
      <EaseStoreProvider>
        <Harness />
      </EaseStoreProvider>
    )

    // Navigate to Level 1 for "drawer-physics" (which has 2 variants)
    act(() => {
      storeApi!.getState().drillIntoCurve("drawer-physics")
    })

    expect(storeApi!.getState().navStack).toEqual({
      level: 1,
      curveId: "drawer-physics",
    })

    const initialVariantsCount =
      storeApi!.getState().customCurves.find((c) => c.id === "drawer-physics")
        ?.variants?.length ?? 0
    expect(initialVariantsCount).toBe(2)

    // Click "+ Add Variant"
    const addVariantBtn = screen.getByLabelText("Add variant to root curve")
    act(() => {
      fireEvent.click(addVariantBtn)
    })

    const rootAfterAdd = storeApi!
      .getState()
      .customCurves.find((c) => c.id === "drawer-physics")
    expect(rootAfterAdd?.variants?.length).toBe(3)

    // Promote variant "Cushioned" to root
    const promoteBtn = screen.getByLabelText("Promote Cushioned to root")
    act(() => {
      fireEvent.click(promoteBtn)
    })

    const stateAfterPromote = storeApi!.getState()
    // Promoted variant should now exist as a Root in customCurves
    const promotedRoot = stateAfterPromote.customCurves.find((c) =>
      c.name.includes("Cushioned")
    )
    expect(promotedRoot).toBeDefined()
    // And removed from old parent variants (zero ghost duplicate)
    const oldParent = stateAfterPromote.customCurves.find(
      (c) => c.id === "drawer-physics"
    )
    expect(
      oldParent?.variants?.some((v) => v.id === "drawer-physics-cushion")
    ).toBe(false)

    // Delete the root curve from Level 1
    const level1Section = screen.getByLabelText("Ease Studio")
    const deleteBtn = within(level1Section).getByLabelText(
      "Delete Drawer Physics"
    )
    act(() => {
      fireEvent.click(deleteBtn)
    })

    const stateAfterDelete = storeApi!.getState()
    expect(
      stateAfterDelete.customCurves.some((c) => c.id === "drawer-physics")
    ).toBe(false)
  })
})
