/**
 * @file __tests__/compare-mode-morph.test.tsx
 * @description Master end-to-end integration test for Phase D: Compare Telemetry Slab, Left Flank Slide-Out & Full 3-Mode Morph.
 */

import * as React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react"
import { MotionConfig } from "motion/react"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { StudioShell } from "@/components/studio/studio-shell"
import { CANONICAL_BEZIER_PRESETS, CANONICAL_SPRING_PRESETS } from "@/core"
import * as fs from "node:fs"
import * as path from "node:path"

describe("Phase D Master Integration: Mode 1 <-> Mode 2 <-> Mode 3 In-Place Morph (Step D-2)", () => {
  const easeOutQuart = CANONICAL_BEZIER_PRESETS.find(
    (p) => p.name === "Ease Out Quart"
  )!
  const snappySpring = CANONICAL_SPRING_PRESETS.find(
    (p) => p.name === "Snappy Spring"
  )!

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

  it("smoothly morphs between Preview, Customize and Compare with Left Flank slide-out and anchored slabs", async () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <StudioShell />
    }

    const { container } = render(
      <MotionConfig reducedMotion="always">
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </MotionConfig>
    )

    // 1. Initial State: Mode 1 (Preview)
    expect(storeApi!.getState().mode).toBe("preview")
    expect(screen.getByText("Open Dialog")).toBeDefined()
    expect(screen.getByLabelText("Motion Guide")).toBeDefined()

    // Left flank is open
    const leftFlank = container.querySelector("aside[aria-hidden='false']")
    expect(leftFlank).not.toBeNull()

    // Anchors are continuously mounted: BrandSlab, PresetCatalog, TimelineConsole, CompareQueueSlab, Export
    expect(screen.getByText("Ease")).toBeDefined()
    expect(screen.getByText("v1.0")).toBeDefined()
    expect(screen.getByLabelText("Preset Catalog")).toBeDefined()
    expect(screen.getByLabelText("Play animation")).toBeDefined()
    expect(screen.getByLabelText("Compare Queue")).toBeDefined()
    expect(screen.getByLabelText("Export kinetic curve code")).toBeDefined()

    // 2. Stage 2 curves into Compare Queue
    act(() => {
      storeApi!.setState({
        compareQueue: [
          { id: "tile-1", curve: easeOutQuart, visible: true },
          { id: "tile-2", curve: snappySpring, visible: true },
        ],
      })
    })

    // Compare queue shows "2 Staged" and Duel button is enabled
    expect(screen.getByText("2 Staged")).toBeDefined()
    const duelBtn = screen.getByLabelText("Enter compare duel mode")
    expect(duelBtn).toBeDefined()

    // 3. Click Duel button to enter Compare Mode
    act(() => {
      fireEvent.click(duelBtn)
    })

    expect(storeApi!.getState().mode).toBe("compare")

    // Left Flank is collapsed (aria-hidden="true")
    await waitFor(() => {
      const collapsedLeftFlank = container.querySelector(
        "aside[aria-hidden='true']"
      )
      expect(collapsedLeftFlank).not.toBeNull()
    })

    // Center Stage has morphed to CompareTheater with 2 side-by-side tiles
    expect(screen.getAllByText("Ease Out Quart").length).toBeGreaterThanOrEqual(
      2
    )
    expect(screen.getAllByText("Snappy Spring").length).toBeGreaterThanOrEqual(
      2
    )
    const openDialogButtons = screen.getAllByText("Open Dialog")
    expect(openDialogButtons.length).toBe(2)

    // CompareDock is mounted
    expect(screen.getByLabelText("Trigger all compare tiles")).toBeDefined()
    expect(
      screen.getByLabelText("Interrupt mid-flight transition")
    ).toBeDefined()

    // Right Flank has morphed to CompareTelemetrySlab
    expect(screen.getByLabelText("Duel Telemetry")).toBeDefined()
    expect(screen.getAllByText("Fastest").length).toBe(2)
    expect(screen.getByText(/Δ .* spread/)).toBeDefined()

    // CompareQueueSlab reflects Compare Mode: shows "2 Active" badge and "Exit Duel" button
    expect(screen.getByText("2 Active")).toBeDefined()
    const exitDuelBtn = screen.getByLabelText("Exit compare duel mode")
    expect(exitDuelBtn).toBeDefined()

    // Anchors remain continuously mounted in Compare Mode!
    expect(screen.getByLabelText("Play animation")).toBeDefined()
    expect(screen.getByLabelText("Compare Queue")).toBeDefined()
    expect(screen.getByLabelText("Studio Modes")).toBeDefined()
    expect(screen.getByLabelText("Export kinetic curve code")).toBeDefined()

    // 4. Click Exit Duel to smoothly return to Preview Mode
    act(() => {
      fireEvent.click(exitDuelBtn)
    })

    expect(storeApi!.getState().mode).toBe("preview")

    // Left Flank slides back in (aria-hidden="false")
    await waitFor(() => {
      const restoredLeftFlank = container.querySelector(
        "aside[aria-hidden='false']"
      )
      expect(restoredLeftFlank).not.toBeNull()
    })

    // Center Stage restored to PreviewTheater, Right Flank to ArchetypeAdvisorSlab
    expect(screen.getByLabelText("Motion Guide")).toBeDefined()
    expect(screen.getByLabelText("Preset Catalog")).toBeDefined()
  })

  it("supports mode switching across all 3 modes via ModeSwitcherSlab", async () => {
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

    // Stage 2 curves so Compare mode is enabled
    act(() => {
      storeApi!.setState({
        compareQueue: [
          { id: "tile-1", curve: easeOutQuart, visible: true },
          { id: "tile-2", curve: snappySpring, visible: true },
        ],
      })
    })

    // 1. Switch to Customize (Mode 2)
    const customizeTab = screen.getByLabelText("Switch to Customize mode")
    act(() => {
      fireEvent.click(customizeTab)
    })
    expect(storeApi!.getState().mode).toBe("customize")
    expect(screen.getByLabelText("Curve Telemetry")).toBeDefined()

    // 2. Switch to Compare (Mode 3)
    const compareTab = screen.getByLabelText("Switch to Compare mode")
    act(() => {
      fireEvent.click(compareTab)
    })
    expect(storeApi!.getState().mode).toBe("compare")
    expect(screen.getByLabelText("Duel Telemetry")).toBeDefined()

    // 3. Switch back to Preview (Mode 1)
    const previewTab = screen.getByLabelText("Switch to Preview mode")
    act(() => {
      fireEvent.click(previewTab)
    })
    expect(storeApi!.getState().mode).toBe("preview")
    expect(screen.getByLabelText("Motion Guide")).toBeDefined()
  })

  it("strictly enforces Satisium design language: zero border-border, zero shadow-*, zero font-mono", () => {
    const files = [
      "components/studio/modes/compare/compare-telemetry-slab.tsx",
      "components/studio/modes/audition/right-flank/compare-queue-slab.tsx",
      "components/studio/modes/audition/audition-view.tsx",
    ]

    for (const relPath of files) {
      const fullPath = path.resolve(process.cwd(), relPath)
      const content = fs.readFileSync(fullPath, "utf-8")

      expect(content).not.toMatch(/border-border/)
      expect(content).not.toMatch(/shadow-(?:sm|md|lg|xl|2xl|xs)/)
      expect(content).not.toMatch(/font-mono/)
      expect(content).not.toMatch(
        /\b(?:bg|text|border)-[a-z0-9-]+\/(?:[0-9]{1,2})\b/
      )
    }
  })
})
