/**
 * @file __tests__/customize-micro-preview.test.tsx
 * @description Comprehensive unit tests for CustomizeMicroPreview, PrimitivesXRay, and Working Tree Lifecycle.
 */

import * as React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { CustomizeMicroPreview } from "@/components/studio/modes/customize/customize-micro-preview"
import { CurveEditorCanvas } from "@/components/studio/modes/customize/curve-editor-canvas"

describe("CustomizeMicroPreview & Working Tree Lifecycle (Step C-5B)", () => {
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

  it("toggles between Component and Primitives X-Ray modes with zero borders, zero shadows, and zero competing transition classes", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CustomizeMicroPreview />
    }

    const { container } = render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    // Ensure customize mode is initiated
    act(() => {
      storeApi!.getState().focusTrack("dialog:open")
      storeApi!.getState().enterCustomize()
    })

    // Default mode is component, showing interactive component switcher and channel dropdown
    expect(storeApi!.getState().customizePreviewMode).toBe("component")
    expect(screen.getAllByText(/Dialog/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Modal Dialog")).toBeDefined()

    const componentDropdownBtn = screen.getByRole("button", {
      name: "Select interactive component",
    })
    const channelDropdownBtn = screen.getByRole("button", {
      name: "Select target channel",
    })
    expect(componentDropdownBtn).toBeDefined()
    expect(channelDropdownBtn).toBeDefined()

    // Opening channel dropdown reveals channels
    act(() => {
      fireEvent.click(channelDropdownBtn)
    })
    expect(
      screen.getByRole("button", { name: "Target Scale channel" })
    ).toBeDefined()
    expect(
      screen.getByRole("button", { name: "Target Backdrop channel" })
    ).toBeDefined()
    act(() => {
      fireEvent.click(channelDropdownBtn)
    })

    // Contained card-in-card stage parity with Primitives
    const stageCard = container.querySelector(
      ".contain-paint.rounded-\\[12px\\]"
    )
    expect(stageCard).not.toBeNull()

    // Switch to Primitives
    const primitivesBtn = screen.getByRole("button", {
      name: "Switch to Primitives X-Ray preview",
    })
    act(() => {
      fireEvent.click(primitivesBtn)
    })

    expect(storeApi!.getState().customizePreviewMode).toBe("primitives")
    expect(storeApi!.getState().focusedTrackId).toBe("primitives:all")

    // All 4 primitive inspection tiles are rendered
    expect(screen.getByText("Position")).toBeDefined()
    expect(screen.getByText("Scale")).toBeDefined()
    expect(screen.getByText("Opacity")).toBeDefined()
    expect(screen.getByText("Rotate")).toBeDefined()

    // Inspect kinetic nodes receiving bindRef: NO competing CSS transition classes
    const posWrapper = screen.getByTestId("primitive-position-wrapper")
    const scaleNode = screen.getByTestId("primitive-scale-node")
    const opacityNode = screen.getByTestId("primitive-opacity-node")
    const rotateNode = screen.getByTestId("primitive-rotate-node")

    // Primitives traveling boxes are 64px (size-16) squircles
    expect(scaleNode.className).toContain("size-16")

    expect(posWrapper.className).not.toMatch(
      /transition-(all|transform|opacity)/
    )
    expect(scaleNode.className).not.toMatch(
      /transition-(all|transform|opacity)/
    )
    expect(opacityNode.className).not.toMatch(
      /transition-(all|transform|opacity)/
    )
    expect(rotateNode.className).not.toMatch(
      /transition-(all|transform|opacity)/
    )

    // Satisium design language: zero border-border and zero shadow-*
    expect(container.innerHTML).not.toContain("border-border")
    expect(container.innerHTML).not.toContain("shadow-")

    // Switch back to Component mode
    const componentBtn = screen.getByRole("button", {
      name: "Switch to Component preview",
    })
    act(() => {
      fireEvent.click(componentBtn)
    })
    expect(storeApi!.getState().customizePreviewMode).toBe("component")
  })

  it("imperatively drives translate3d, scale, opacity, and rotate on primitives:all upon scrubbing", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CustomizeMicroPreview />
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    act(() => {
      storeApi!.getState().enterCustomize()
      storeApi!.getState().setCustomizePreviewMode("primitives")
    })

    const posWrapper = screen.getByTestId("primitive-position-wrapper")
    const scaleNode = screen.getByTestId("primitive-scale-node")
    const opacityNode = screen.getByTestId("primitive-opacity-node")
    const rotateNode = screen.getByTestId("primitive-rotate-node")

    // Seek to 150ms in playback / scrub
    act(() => {
      storeApi!.getState().seekScoped(150)
    })

    // Assert imperative styling across all 4 channels
    expect(posWrapper.style.transform).toContain("translate3d")
    expect(scaleNode.style.transform).toContain("scale")
    expect(opacityNode.style.opacity).not.toBe("")
    expect(rotateNode.style.transform).toContain("rotate")
  })

  it("supports Git Working Tree lifecycle in CurveEditorCanvas: Revert, Save Custom, Commit, Fork Variant, and Back", () => {
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

    act(() => {
      storeApi!.getState().focusTrack("dialog:open")
      storeApi!.getState().enterCustomize()
    })

    // 1. Initial clean preset state: Revert is hidden, Save Custom and Done (Back) are visible
    expect(
      screen.queryByRole("button", { name: "Revert uncommitted draft" })
    ).toBeNull()
    expect(
      screen.getByRole("button", { name: "Save draft as new custom curve" })
    ).toBeDefined()
    expect(
      screen.getByRole("button", { name: "Back to Audition mode" })
    ).toBeDefined()

    // 2. Modifying draft reveals Revert
    act(() => {
      storeApi!.getState().updateDraft({ suggestedDurationMs: 450 })
    })
    expect(storeApi!.getState().draftCurve?.isDirty).toBe(true)
    const revertBtn = screen.getByRole("button", {
      name: "Revert uncommitted draft",
    })
    expect(revertBtn).toBeDefined()

    // Click Revert -> restores clean state and hides Revert
    act(() => {
      fireEvent.click(revertBtn)
    })
    expect(storeApi!.getState().draftCurve?.isDirty).toBe(false)
    expect(
      screen.queryByRole("button", { name: "Revert uncommitted draft" })
    ).toBeNull()

    // 3. Save Custom commits draft as a Level-0 custom root
    const initialCustomCount = storeApi!.getState().customCurves.length
    act(() => {
      storeApi!.getState().updateDraft({ suggestedDurationMs: 480 })
    })
    const saveCustomBtn = screen.getByRole("button", {
      name: "Save draft as new custom curve",
    })
    act(() => {
      fireEvent.click(saveCustomBtn)
    })

    expect(storeApi!.getState().customCurves.length).toBe(
      initialCustomCount + 1
    )
    expect(storeApi!.getState().draftCurve?.sourceScope).toBe("custom-root")

    // 4. On custom curve: Commit is hidden when clean, + Fork Variant and Done are visible
    expect(
      screen.queryByRole("button", { name: "Commit draft changes to curve" })
    ).toBeNull()
    const forkVariantBtn = screen.getByRole("button", {
      name: "Fork draft as variant branch",
    })
    expect(forkVariantBtn).toBeDefined()

    // Modify custom curve -> reveals Commit button
    act(() => {
      storeApi!.getState().updateDraft({ suggestedDurationMs: 520 })
    })
    const commitBtn = screen.getByRole("button", {
      name: "Commit draft changes to curve",
    })
    expect(commitBtn).toBeDefined()
    act(() => {
      fireEvent.click(commitBtn)
    })
    expect(storeApi!.getState().customCurves[0].suggestedDurationMs).toBe(520)
    expect(storeApi!.getState().draftCurve?.isDirty).toBe(false)
    expect(
      screen.queryByRole("button", { name: "Commit draft changes to curve" })
    ).toBeNull()

    // 5. Fork Variant adds a 2nd-tier variant branch
    act(() => {
      fireEvent.click(forkVariantBtn)
    })
    expect(storeApi!.getState().customCurves[0].variants?.length).toBe(1)
    expect(storeApi!.getState().draftCurve?.sourceScope).toBe("custom-variant")

    // 6. Done (Back) exits customize mode and returns to preview
    const backBtn = screen.getByRole("button", {
      name: "Back to Audition mode",
    })
    act(() => {
      fireEvent.click(backBtn)
    })
    expect(storeApi!.getState().mode).toBe("preview")
    expect(storeApi!.getState().draftCurve).toBeNull()
  })

  it("switches focused channel and phase dynamically via the interactive Target Strip inside Customize Mode", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CustomizeMicroPreview />
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    act(() => {
      storeApi!.getState().focusTrack("dialog:open")
      storeApi!.getState().enterCustomize()
    })

    // Initially promoted to first non-opacity spatial channel (translateY) in dialog:open
    expect(storeApi!.getState().focusedChannelId).toBe("translateY")
    expect(storeApi!.getState().focusedTrackId).toBe("dialog:open")

    // Open channel dropdown and click Scale channel
    const channelDropdownTrigger = screen.getByRole("button", {
      name: "Select target channel",
    })
    act(() => {
      fireEvent.click(channelDropdownTrigger)
    })
    const scaleBtn = screen.getByRole("button", {
      name: "Target Scale channel",
    })
    act(() => {
      fireEvent.click(scaleBtn)
    })

    expect(storeApi!.getState().focusedChannelId).toBe("scale")
    expect(storeApi!.getState().draftCurve).toBeDefined()

    // Open channel dropdown and click Backdrop channel
    act(() => {
      fireEvent.click(channelDropdownTrigger)
    })
    const backdropBtn = screen.getByRole("button", {
      name: "Target Backdrop channel",
    })
    act(() => {
      fireEvent.click(backdropBtn)
    })

    expect(storeApi!.getState().focusedChannelId).toBe("backdrop")
    expect(storeApi!.getState().draftCurve).toBeDefined()

    // Click Out phase toggle
    const outPhaseBtn = screen.getByRole("button", {
      name: "Switch to Out phase",
    })
    act(() => {
      fireEvent.click(outPhaseBtn)
    })

    expect(storeApi!.getState().focusedTrackId).toBe("dialog:close")
    expect(storeApi!.getState().draftCurve).toBeDefined()

    // Switch interactive component via component dropdown
    const componentDropdownTrigger = screen.getByRole("button", {
      name: "Select interactive component",
    })
    act(() => {
      fireEvent.click(componentDropdownTrigger)
    })
    const drawerBtn = screen.getByRole("button", {
      name: "Select Drawer Sheet component",
    })
    act(() => {
      fireEvent.click(drawerBtn)
    })
    expect(storeApi!.getState().focusedTrackId).toBe("drawer:open")
  })
})
