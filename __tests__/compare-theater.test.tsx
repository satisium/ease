/**
 * @file __tests__/compare-theater.test.tsx
 * @description Master integration test for Phase D Step D-1: Compare Theater, Duel Tiles & Habitat compareItemId support.
 */

import * as React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import { MotionConfig } from "motion/react"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { CompareTheater } from "@/components/studio/modes/compare/compare-theater"
import {
  CANONICAL_BEZIER_PRESETS,
  CANONICAL_SPRING_PRESETS,
  type CompareItem,
} from "@/core"
import * as fs from "node:fs"
import * as path from "node:path"

describe("Phase D Step D-1: Compare Theater, Duel Tiles & Habitat compareItemId", () => {
  const easeOutQuart = CANONICAL_BEZIER_PRESETS.find(
    (p) => p.name === "Ease Out Quart"
  )!
  const snappySpring = CANONICAL_SPRING_PRESETS.find(
    (p) => p.name === "Snappy Spring"
  )!

  const tile1: CompareItem = {
    id: "tile-1",
    curve: easeOutQuart,
    visible: true,
  }

  const tile2: CompareItem = {
    id: "tile-2",
    curve: snappySpring,
    visible: true,
  }

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

  it("renders 2 contained CompareTile cards with Open Dialog visible and highlights Fastest tile", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi>

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CompareTheater />
    }

    render(
      <MotionConfig reducedMotion="always">
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </MotionConfig>
    )

    act(() => {
      storeApi.setState({
        mode: "compare",
        compareQueue: [tile1, tile2],
        globalCompareTarget: { trackId: "dialog:open", channelId: "all" },
      })
    })

    // Both curve names visible
    expect(screen.getByText("Ease Out Quart")).toBeDefined()
    expect(screen.getByText("Snappy Spring")).toBeDefined()

    // 2 contained stage cards with "Open Dialog" trigger button in each
    const openDialogButtons = screen.getAllByText("Open Dialog")
    expect(openDialogButtons.length).toBe(2)

    // Snappy Spring is stiffer (k=860) and arrives at t95 faster -> marked Fastest
    const fastestBadge = screen.getByText("Fastest")
    expect(fastestBadge).toBeDefined()
  })

  it("switches grid to grid-rows-2 when 4 curves are staged", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi>

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CompareTheater />
    }

    const { container } = render(
      <MotionConfig reducedMotion="always">
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </MotionConfig>
    )

    const tile3: CompareItem = {
      id: "tile-3",
      curve: CANONICAL_BEZIER_PRESETS[1],
      visible: true,
    }
    const tile4: CompareItem = {
      id: "tile-4",
      curve: CANONICAL_SPRING_PRESETS[1],
      visible: true,
    }

    act(() => {
      storeApi.setState({
        mode: "compare",
        compareQueue: [tile1, tile2, tile3, tile4],
        globalCompareTarget: { trackId: "dialog:open", channelId: "all" },
      })
    })

    const grid = container.querySelector(".grid-rows-2")
    expect(grid).not.toBeNull()
  })

  it("switches all synced tiles simultaneously when changing Global Target in CompareDock", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi>

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CompareTheater />
    }

    render(
      <MotionConfig reducedMotion="always">
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </MotionConfig>
    )

    act(() => {
      storeApi.setState({
        mode: "compare",
        compareQueue: [tile1, tile2],
        globalCompareTarget: { trackId: "dialog:open", channelId: "all" },
      })
    })

    // Open Component Picker in CompareDock
    const compPickerBtn = screen.getByLabelText(
      "Select global comparison component"
    )
    act(() => {
      fireEvent.click(compPickerBtn)
    })

    // Select Drawer Sheet
    const drawerOption = screen.getByLabelText("Select Drawer Sheet")
    act(() => {
      fireEvent.click(drawerOption)
    })

    // Global target is now drawer:open
    expect(storeApi!.getState().globalCompareTarget.trackId).toBe("drawer:open")

    // Both tiles now render Filters (3) simultaneously!
    const filterButtons = screen.getAllByText("Filters (3)")
    expect(filterButtons.length).toBe(2)
  })

  it("per-tile override on Tile 2 changes ONLY Tile 2 to Tabs while Tile 1 stays on Drawer Sheet", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi>

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CompareTheater />
    }

    render(
      <MotionConfig reducedMotion="always">
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </MotionConfig>
    )

    act(() => {
      storeApi.setState({
        mode: "compare",
        compareQueue: [tile1, tile2],
        globalCompareTarget: { trackId: "drawer:open", channelId: "all" },
      })
    })

    // Tile 2 override button
    const tile2OverrideBtn = screen.getByLabelText(
      "Override target for Snappy Spring"
    )
    act(() => {
      fireEvent.click(tile2OverrideBtn)
    })

    // Select Segmented Control override
    const tabsOverrideOption = screen.getByLabelText(
      "Override to Segmented Control"
    )
    act(() => {
      fireEvent.click(tabsOverrideOption)
    })

    // Tile 1 still renders Filters (3)
    expect(screen.getByText("Filters (3)")).toBeDefined()

    // Tile 2 now renders Segmented Control Overview tab
    expect(screen.getByRole("tab", { name: "Overview tab" })).toBeDefined()
  })

  it("clicking Trigger All plays synchronized frames; clicking Use applies winner and exits Compare Mode", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi>

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CompareTheater />
    }

    render(
      <MotionConfig reducedMotion="always">
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </MotionConfig>
    )

    act(() => {
      storeApi.setState({
        mode: "compare",
        compareQueue: [tile1, tile2],
        globalCompareTarget: { trackId: "dialog:open", channelId: "all" },
      })
    })

    // Trigger All button
    const triggerAllBtn = screen.getByLabelText("Trigger all compare tiles")
    act(() => {
      fireEvent.click(triggerAllBtn)
    })

    expect(storeApi!.getState().playbackState).toBe("playing")

    // Click Use on Tile 2 (Snappy Spring)
    const useButtons = screen.getAllByLabelText("Use curve as active winner")
    expect(useButtons.length).toBe(2)

    act(() => {
      fireEvent.click(useButtons[1])
    })

    // Mode is now preview and active curve is Snappy Spring
    expect(storeApi!.getState().mode).toBe("preview")
    expect(storeApi!.getState().getActiveCurve().id).toBe(snappySpring.id)
  })

  it("selecting Primitives in CompareDock renders PrimitivesXRay inside every Duel tile without duplicate internal filter bars", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi>

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CompareTheater />
    }

    render(
      <MotionConfig reducedMotion="always">
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </MotionConfig>
    )

    act(() => {
      storeApi.setState({
        mode: "compare",
        compareQueue: [tile1, tile2],
        globalCompareTarget: { trackId: "dialog:open", channelId: "all" },
      })
    })

    // Open Component Picker in CompareDock
    const compPickerBtn = screen.getByLabelText(
      "Select global comparison component"
    )
    act(() => {
      fireEvent.click(compPickerBtn)
    })

    // Select Primitives
    const primitivesOption = screen.getByLabelText("Select Primitives")
    act(() => {
      fireEvent.click(primitivesOption)
    })

    // Global target is now primitives:all
    expect(storeApi!.getState().globalCompareTarget.trackId).toBe(
      "primitives:all"
    )

    // All 4 primitives are rendered in both tiles
    expect(screen.getAllByText("Position").length).toBe(2)
    expect(screen.getAllByText("Scale").length).toBe(2)
    expect(screen.getAllByText("Opacity").length).toBe(2)
    expect(screen.getAllByText("Rotate").length).toBe(2)

    // Zero internal filter bars in Compare tiles
    expect(screen.queryByLabelText("Filter position primitive")).toBeNull()
  })

  it("switching CompareDock's Channel picker to Position isolates all tiles onto the Position runner", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi>

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CompareTheater />
    }

    render(
      <MotionConfig reducedMotion="always">
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </MotionConfig>
    )

    act(() => {
      storeApi.setState({
        mode: "compare",
        compareQueue: [tile1, tile2],
        globalCompareTarget: { trackId: "primitives:all", channelId: "all" },
      })
    })

    // Open Channel Picker in CompareDock
    const chanPickerBtn = screen.getByLabelText("Select comparison channel")
    act(() => {
      fireEvent.click(chanPickerBtn)
    })

    // Target Translate X (position) channel
    const positionChannelOption = screen.getByLabelText(
      "Target Translate X channel"
    )
    act(() => {
      fireEvent.click(positionChannelOption)
    })

    expect(storeApi!.getState().globalCompareTarget.channelId).toBe("position")

    // Both tiles render only Position runway
    expect(screen.getAllByTestId("primitive-position-wrapper").length).toBe(2)
    expect(screen.queryByTestId("primitive-scale-node")).toBeNull()
  })

  it("setting a Per-Tile Override on Tile 2 to Primitives displays Primitives inside Tile 2 while Tile 1 stays on Modal Dialog", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi>

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CompareTheater />
    }

    render(
      <MotionConfig reducedMotion="always">
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </MotionConfig>
    )

    act(() => {
      storeApi.setState({
        mode: "compare",
        compareQueue: [tile1, tile2],
        globalCompareTarget: { trackId: "dialog:open", channelId: "all" },
      })
    })

    // Tile 2 override button
    const tile2OverrideBtn = screen.getByLabelText(
      "Override target for Snappy Spring"
    )
    act(() => {
      fireEvent.click(tile2OverrideBtn)
    })

    // Select Primitives override
    const primitivesOverrideOption = screen.getByLabelText(
      "Override to Primitives"
    )
    act(() => {
      fireEvent.click(primitivesOverrideOption)
    })

    // Tile 1 still renders Open Dialog
    expect(screen.getByText("Open Dialog")).toBeDefined()

    // Tile 2 renders Primitives
    expect(screen.getByText("Position")).toBeDefined()
    expect(screen.getByText("Scale")).toBeDefined()
  })

  it("verifies Primitives in Compare Mode: Opacity card is not rotated, squircle animates opacity 0 -> 1, and Rotate squircle animates rotate 0deg -> 180deg", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi>

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CompareTheater />
    }

    render(
      <MotionConfig reducedMotion="always">
        <EaseStoreProvider>
          <TestHarness />
        </EaseStoreProvider>
      </MotionConfig>
    )

    act(() => {
      storeApi.setState({
        mode: "compare",
        compareQueue: [tile1, tile2],
        globalCompareTarget: { trackId: "primitives:all", channelId: "all" },
      })
    })

    // At 0ms (resting start):
    act(() => {
      storeApi.conductor.seek(0)
    })

    // Confirm "Opacity" text element's parent card has NO rotate transform
    const opacityLabels = screen.getAllByText("Opacity")
    for (const label of opacityLabels) {
      const card = label.closest("div")
      expect(card?.style.transform).not.toContain("rotate")
    }

    const opacityNodes = screen.getAllByTestId("primitive-opacity-node")
    const rotateNodes = screen.getAllByTestId("primitive-rotate-node")

    // At 0ms:
    // Opacity squircle starts at 0
    expect(Number(opacityNodes[0].style.opacity)).toBeCloseTo(0, 1)
    // Rotate squircle starts at 0deg
    expect(rotateNodes[0].style.transform).toContain("rotate(0deg)")
    // Opacity squircle must NOT have any rotate transform
    expect(opacityNodes[0].style.transform).not.toContain("rotate")

    // At 300ms (settled):
    act(() => {
      storeApi.conductor.seek(300)
    })

    // Opacity squircle transitions opacity: 0 -> 1 cleanly
    expect(Number(opacityNodes[0].style.opacity)).toBeCloseTo(1, 1)
    // Rotate squircle rotates 0deg -> 180deg cleanly (not the Opacity card/squircle!)
    expect(rotateNodes[0].style.transform).toMatch(
      /rotate\((?:179\.\d+|180)deg\)/
    )
    expect(opacityNodes[0].style.transform).not.toContain("rotate")

    // Confirm Opacity card still has no rotate transform
    for (const label of opacityLabels) {
      const card = label.closest("div")
      expect(card?.style.transform).not.toContain("rotate")
    }
  })

  it("strictly enforces Satisium design language: zero border-border, zero shadow-*, zero font-mono", () => {
    const files = [
      "components/studio/modes/compare/compare-tile.tsx",
      "components/studio/modes/compare/compare-dock.tsx",
      "components/studio/modes/compare/compare-theater.tsx",
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
