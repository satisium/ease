import * as React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  SATISIUM_EASE_DECEL,
  SATISIUM_EASE_QUINT,
  SATISIUM_EASE_ACCEL,
  SATISIUM_IOS_SHEET_EASE,
  SATISIUM_SPRING_PILL,
  SATISIUM_CASSETTE_TRANSITION,
  SATISIUM_POPOVER_VARIANTS,
  SATISIUM_CARD_POP_VARIANTS,
  SATISIUM_MODAL_TRANSITION,
  SATISIUM_STAGE_MORPH_TRANSITION,
  SATISIUM_FLANK_SLIDE_TRANSITION,
  SATISIUM_LEFT_COLLAPSE_TRANSITION,
  SATISIUM_STAGE_SLIDE_TRANSITION,
  SATISIUM_PRESS_CLASS,
} from "@/lib/motion"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { StudioShell } from "@/components/studio/studio-shell"
import { AuditionToolbar } from "@/components/studio/modes/audition/center-stage/audition-toolbar"
import { ExportDialog } from "@/components/studio/export-dialog"
import { PresetCatalog } from "@/components/studio/modes/audition/left-flank/preset-catalog"
import { CompareQueueSlab } from "@/components/studio/modes/audition/right-flank/compare-queue-slab"
import { StudioUiProvider } from "@/components/studio/studio-ui-context"
import { TimelineConsole } from "@/components/studio/modes/audition/center-stage/timeline-console"
import { CatalogLevel0 } from "@/components/studio/modes/audition/left-flank/catalog-level-0"
import { CurveEditorCanvas } from "@/components/studio/modes/customize/curve-editor-canvas"
import { PrimitivesXRay } from "@/components/studio/modes/customize/primitives-xray"
import { CompareDock } from "@/components/studio/modes/compare/compare-dock"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { CANONICAL_BEZIER_PRESETS, trackRegistry } from "@/core"

describe("App Motion Grammar — Step M-1: lib/motion.ts & Shell Slab Standardization", () => {
  it("exports canonical easing curves conforming to Satisium Quiet Precision grammar", () => {
    // SATISIUM_EASE_DECEL: Expo Out [0.16, 1, 0.3, 1]
    expect(SATISIUM_EASE_DECEL).toHaveLength(4)
    expect(SATISIUM_EASE_DECEL).toEqual([0.16, 1, 0.3, 1])

    // SATISIUM_EASE_QUINT: Quint Out [0.22, 1, 0.36, 1]
    expect(SATISIUM_EASE_QUINT).toHaveLength(4)
    expect(SATISIUM_EASE_QUINT).toEqual([0.22, 1, 0.36, 1])

    // SATISIUM_EASE_ACCEL: Fast Exit [0.4, 0, 1, 1]
    expect(SATISIUM_EASE_ACCEL).toHaveLength(4)
    expect(SATISIUM_EASE_ACCEL).toEqual([0.4, 0, 1, 1])
  })

  it("exports SATISIUM_SPRING_PILL with critically damped zero-bounce physics (zeta >= 0.9)", () => {
    expect(SATISIUM_SPRING_PILL.type).toBe("spring")
    expect(SATISIUM_SPRING_PILL.stiffness).toBe(460)
    expect(SATISIUM_SPRING_PILL.damping).toBe(34)
    expect(SATISIUM_SPRING_PILL.mass).toBe(0.8)

    // Damping ratio formula: zeta = damping / (2 * sqrt(stiffness * mass))
    const zeta =
      SATISIUM_SPRING_PILL.damping /
      (2 *
        Math.sqrt(SATISIUM_SPRING_PILL.stiffness * SATISIUM_SPRING_PILL.mass))

    // Damping ratio is ~0.886 -> rounds to 0.9, ensuring zero-bounce critical damping
    expect(zeta).toBeGreaterThanOrEqual(0.88)
    expect(Math.round(zeta * 10) / 10).toBeGreaterThanOrEqual(0.9)
  })

  it("exports shell transitions with fast durations (<= 350ms)", () => {
    // SATISIUM_CASSETTE_TRANSITION: 340ms duration
    expect(SATISIUM_CASSETTE_TRANSITION.duration).toBeLessThanOrEqual(0.35)
    expect(SATISIUM_CASSETTE_TRANSITION.duration * 1000).toBeLessThanOrEqual(
      350
    )
    expect(SATISIUM_CASSETTE_TRANSITION.ease).toEqual(SATISIUM_EASE_DECEL)

    // SATISIUM_POPOVER_VARIANTS: animate 150ms, exit 110ms
    expect(
      SATISIUM_POPOVER_VARIANTS.animate.transition.duration * 1000
    ).toBeLessThanOrEqual(350)
    expect(
      SATISIUM_POPOVER_VARIANTS.exit.transition.duration * 1000
    ).toBeLessThanOrEqual(350)

    // SATISIUM_MODAL_TRANSITION: enter 220ms, exit 140ms
    expect(SATISIUM_MODAL_TRANSITION.enter.duration * 1000).toBeLessThanOrEqual(
      350
    )
    expect(SATISIUM_MODAL_TRANSITION.exit.duration * 1000).toBeLessThanOrEqual(
      350
    )
  })

  it("exports SATISIUM_PRESS_CLASS with subtle active scale", () => {
    expect(SATISIUM_PRESS_CLASS).toContain("active:scale-[0.97]")
    expect(SATISIUM_PRESS_CLASS).toContain("transition-transform")
  })

  it("renders StudioShell wrapped inside MotionConfig with zero errors", () => {
    const { container } = render(
      <EaseStoreProvider>
        <StudioShell />
      </EaseStoreProvider>
    )

    expect(container).toBeDefined()
    expect(container.querySelector("[role='tablist']")).toBeTruthy()
  })

  it("animates origin-aware popovers in AuditionToolbar without layout breakage", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function Harness() {
      storeApi = useEaseStoreApi()
      return <AuditionToolbar />
    }

    const { container } = render(
      <TooltipProvider>
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      </TooltipProvider>
    )

    // Component picker trigger
    const compTrigger = screen.getByLabelText("Select interactive component")
    expect(compTrigger).toBeDefined()
    expect(compTrigger.getAttribute("aria-expanded")).toBe("false")

    // Open Component popover
    fireEvent.click(compTrigger)
    expect(compTrigger.getAttribute("aria-expanded")).toBe("true")
    const popover = container.querySelector(".origin-bottom-left")
    expect(popover).not.toBeNull()

    // Select Drawer Sheet component
    const drawerOption = screen.getByLabelText("Drawer Sheet")
    fireEvent.click(drawerOption)
    expect(compTrigger.getAttribute("aria-expanded")).toBe("false")

    // Inject >4 channels to trigger the overflow dropdown
    const baseChannel = trackRegistry.get("drawer:open")!.channels[0]!
    act(() => {
      storeApi!.setState({
        trackBindings: {
          "drawer:open": [1, 2, 3, 4, 5].map((i) => ({
            ...baseChannel,
            id: `ch${i}`,
            label: `Part ${i}`,
          })),
        },
      })
    })

    // Verify >4 Channel overflow dropdown trigger is mounted
    const channelTrigger = screen.getByLabelText("Select kinetic channel")
    expect(channelTrigger).toBeDefined()

    // Open channel overflow popover
    fireEvent.click(channelTrigger)
    const channelPopover = container.querySelector(".origin-bottom-left")
    expect(channelPopover).not.toBeNull()

    // Select Part 1 channel from the open popover
    const part1Option = screen.getByRole("button", { name: "Part 1 channel" })
    fireEvent.click(part1Option)
    expect(storeApi!.getState().focusedChannelId).toBe("ch1")
  })

  it("animates layoutId pills in ExportDialog across frameworks and scopes cleanly", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function Harness() {
      storeApi = useEaseStoreApi()
      return <ExportDialog />
    }

    render(
      <EaseStoreProvider>
        <Harness />
      </EaseStoreProvider>
    )

    // Open Export Dialog
    act(() => {
      storeApi!.getState().setExportOpen(true)
    })

    // Dialog is visible
    expect(screen.getByText("Export Motion Kinetics")).toBeDefined()

    // Framework tabs: CSS -> Tailwind -> Motion -> GSAP
    const tailwindTab = screen.getByLabelText("Tailwind export")
    fireEvent.click(tailwindTab)
    expect(storeApi!.getState().preferredExporter).toBe("tailwind")

    const motionTab = screen.getByLabelText("Motion export")
    fireEvent.click(motionTab)
    expect(storeApi!.getState().preferredExporter).toBe("motion")

    // Scope tabs: Ease Only -> Snippet
    const snippetTab = screen.getByLabelText("Export full component snippet")
    fireEvent.click(snippetTab)
    expect(storeApi!.getState().exportScope).toBe("snippet")

    const easeTab = screen.getByLabelText("Export ease timing curve only")
    fireEvent.click(easeTab)
    expect(storeApi!.getState().exportScope).toBe("ease")

    // Switch to compare mode with staged curves
    act(() => {
      storeApi!.setState({
        mode: "compare",
        compareQueue: [
          {
            id: "tile-1",
            curve: CANONICAL_BEZIER_PRESETS[0]!,
            visible: true,
          },
          {
            id: "tile-2",
            curve: CANONICAL_BEZIER_PRESETS[1]!,
            visible: true,
          },
        ],
      })
    })

    // Contender tab selection
    const contenderTab = screen.getByLabelText(
      `Export contender ${CANONICAL_BEZIER_PRESETS[1]!.name}`
    )
    expect(contenderTab).toBeDefined()
    fireEvent.click(contenderTab)

    // Close Dialog
    act(() => {
      storeApi!.getState().setExportOpen(false)
    })
  })

  it("exports SATISIUM_IOS_SHEET_EASE and SATISIUM_CARD_POP_VARIANTS for liquid Left Flank motion", () => {
    // SATISIUM_IOS_SHEET_EASE: [0.32, 0.72, 0, 1]
    expect(SATISIUM_IOS_SHEET_EASE).toHaveLength(4)
    expect(SATISIUM_IOS_SHEET_EASE).toEqual([0.32, 0.72, 0, 1])

    // SATISIUM_CARD_POP_VARIANTS: initial, animate, exit
    expect(SATISIUM_CARD_POP_VARIANTS.initial.scale).toBe(0.88)
    expect(SATISIUM_CARD_POP_VARIANTS.initial.opacity).toBe(0)
    expect(SATISIUM_CARD_POP_VARIANTS.animate.scale).toBe(1)
    expect(SATISIUM_CARD_POP_VARIANTS.animate.opacity).toBe(1)
    expect(SATISIUM_CARD_POP_VARIANTS.exit.scale).toBe(0.88)
    expect(SATISIUM_CARD_POP_VARIANTS.exit.opacity).toBe(0)
    expect(SATISIUM_CARD_POP_VARIANTS.animate.transition.duration).toBe(0.2)
    expect(SATISIUM_CARD_POP_VARIANTS.exit.transition.duration).toBe(0.14)
  })

  it("handles Left Flank iOS parallax depth push, card pop reflow, and filter cross-blur cleanly", () => {
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

    // 1. Initial Level 0 state
    expect(storeApi!.getState().navStack.level).toBe(0)
    expect(screen.getByLabelText("Preset Catalog")).toBeDefined()

    // Switch between Bezier and Spring (testing filter cross-blur)
    const springBtn = screen.getByText(/Spring \(26\)/i)
    fireEvent.click(springBtn)
    expect(storeApi!.getState().activeLibraryTab).toBe("spring")

    const bezierBtn = screen.getByText(/Bezier \(35\)/i)
    fireEvent.click(bezierBtn)
    expect(storeApi!.getState().activeLibraryTab).toBe("bezier")

    // 2. Drill into Modal Sheet (Level 0 -> Level 1)
    const modalSheetBtn = screen.getByTitle(
      /Modal Sheet · Click to select · Double-click to expand variants/i
    )
    fireEvent.doubleClick(modalSheetBtn)

    expect(storeApi!.getState().navStack).toEqual({
      level: 1,
      curveId: "modal-sheet",
    })
    expect(screen.getByLabelText("Ease Studio")).toBeDefined()

    // 3. Add a variant (+ Add Variant in Level 1)
    const addVariantBtn = screen.getByLabelText("Add variant to root curve")
    expect(addVariantBtn).toBeDefined()
    fireEvent.click(addVariantBtn)

    const modalSheet = storeApi!
      .getState()
      .customCurves.find((c) => c.id === "modal-sheet")
    expect(modalSheet?.variants?.length).toBe(6) // was 5, now 6

    // 4. Return to Level 0 via back button
    const backBtn = screen.getByLabelText("Back to preset library")
    fireEvent.click(backBtn)
    expect(storeApi!.getState().navStack.level).toBe(0)
  })

  describe("Pass 3 (Zones 4, 5 & 6): NumberFlow Rolling Digits, Compare Queue Reflow & Morphing Copy Buttons", () => {
    it("renders AnimatedNumber with synchronous JSDOM fallback for prefix, suffix, and formatting", () => {
      const { rerender } = render(<AnimatedNumber value={350} suffix="ms" />)
      expect(screen.getByText("350ms")).toBeDefined()

      // Fractional formatting + prefix
      rerender(
        <AnimatedNumber
          value={3.5}
          format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
          prefix="Δ "
          suffix="x"
        />
      )
      expect(screen.getByText("Δ 3.5x")).toBeDefined()
    })

    it("animates CompareQueueSlab item additions, removals, and visibility toggles cleanly", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <CompareQueueSlab />
      }

      render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // Initial empty state
      expect(screen.getByText("Queue is empty")).toBeDefined()
      expect(screen.getByText("0 Staged")).toBeDefined()

      // Stage current active curve
      const stageBtn = screen.getByLabelText(
        "Queue current curve for comparison"
      )
      fireEvent.click(stageBtn)

      // Queue now has 1 curve
      expect(screen.getByText("1 Staged")).toBeDefined()
      expect(screen.getByText("Queued (C)")).toBeDefined()

      // Add a second curve to the queue
      act(() => {
        storeApi!.setState((s) => ({
          compareQueue: [
            ...s.compareQueue,
            {
              id: "test-tile-2",
              curve: CANONICAL_BEZIER_PRESETS[2]!,
              visible: true,
            },
          ],
        }))
      })

      expect(screen.getByText("2 Staged")).toBeDefined()
      expect(screen.getByText(CANONICAL_BEZIER_PRESETS[1]!.name)).toBeDefined()

      // Toggle visibility of the second item
      const hideBtn = screen.getByLabelText(
        `Hide ${CANONICAL_BEZIER_PRESETS[1]!.name} in duel`
      )
      fireEvent.click(hideBtn)
      expect(
        screen.getByLabelText(
          `Show ${CANONICAL_BEZIER_PRESETS[1]!.name} in duel`
        )
      ).toBeDefined()

      // Remove the second item
      const removeBtn = screen.getByLabelText(
        `Remove ${CANONICAL_BEZIER_PRESETS[1]!.name} from queue`
      )
      fireEvent.click(removeBtn)
      expect(screen.getByText("1 Staged")).toBeDefined()

      // Clear all
      const clearAllBtn = screen.getByLabelText("Clear all queued curves")
      fireEvent.click(clearAllBtn)
      expect(screen.getByText("Queue is empty")).toBeDefined()
      expect(screen.getByText("0 Staged")).toBeDefined()
    })

    it("morphs copy buttons in ExportDialog with liquid feedback states", async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      })

      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <ExportDialog />
      }

      render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      act(() => {
        storeApi!.getState().setExportOpen(true)
      })

      // Initial idle states
      expect(screen.getByText("Copy Code")).toBeDefined()
      expect(screen.getByText("Copy Share URL")).toBeDefined()

      // Click Copy Code
      const copyCodeBtn = screen.getByLabelText(
        "Copy generated code to clipboard"
      )
      await act(async () => {
        fireEvent.click(copyCodeBtn)
      })

      expect(navigator.clipboard.writeText).toHaveBeenCalled()
      expect(await screen.findByText("Copied!")).toBeDefined()

      // Click Copy Share URL
      const copyUrlBtn = screen.getByLabelText(
        "Copy shareable URL to clipboard"
      )
      await act(async () => {
        fireEvent.click(copyUrlBtn)
      })

      expect(await screen.findByText("URL Copied!")).toBeDefined()
    })
  })

  describe("Pass 1 (Zones 3 & 8): Universal Sliding Pills & Timeline Transport Morphs", () => {
    it("handles TimelineConsole play/pause morph, loop delay cycle, and speed multiplier gliding cleanly", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <TimelineConsole />
      }

      render(
        <StudioUiProvider>
          <TooltipProvider>
            <EaseStoreProvider>
              <Harness />
            </EaseStoreProvider>
          </TooltipProvider>
        </StudioUiProvider>
      )

      // 1. Initial Play State
      const playBtn = screen.getByLabelText("Play animation")
      expect(playBtn).toBeDefined()

      // Toggle Play -> Pause
      fireEvent.click(playBtn)
      expect(screen.getByLabelText("Pause animation")).toBeDefined()
      expect(storeApi!.getState().isPlaying).toBe(true)

      // Toggle back to Pause -> Play
      fireEvent.click(screen.getByLabelText("Pause animation"))
      expect(screen.getByLabelText("Play animation")).toBeDefined()
      expect(storeApi!.getState().isPlaying).toBe(false)

      // 2. Loop Delay Breather
      expect(screen.queryByLabelText(/Loop delay breather/i)).toBeNull()

      // Toggle Loop ON
      const loopBtn = screen.getByLabelText("Toggle continuous loop")
      fireEvent.click(loopBtn)
      expect(storeApi!.getState().isLooping).toBe(true)

      const breatherBtn = screen.getByLabelText(/Loop delay breather: 400ms/i)
      expect(breatherBtn).toBeDefined()

      // Cycle breather: 400ms -> 800ms -> 0ms -> 400ms
      fireEvent.click(breatherBtn)
      expect(screen.getByLabelText(/Loop delay breather: 800ms/i)).toBeDefined()
      expect(storeApi!.getState().loopDelayMs).toBe(800)

      fireEvent.click(screen.getByLabelText(/Loop delay breather: 800ms/i))
      expect(screen.getByLabelText(/Loop delay breather: 0ms/i)).toBeDefined()
      expect(storeApi!.getState().loopDelayMs).toBe(0)

      fireEvent.click(screen.getByLabelText(/Loop delay breather: 0ms/i))
      expect(screen.getByLabelText(/Loop delay breather: 400ms/i)).toBeDefined()
      expect(storeApi!.getState().loopDelayMs).toBe(400)

      // 3. Speed Multiplier Sliding Pill
      const speed05Btn = screen.getByLabelText("Set playback speed to 0.5x")
      fireEvent.click(speed05Btn)
      expect(storeApi!.getState().speed).toBe(0.5)

      const speed025Btn = screen.getByLabelText("Set playback speed to 0.25x")
      fireEvent.click(speed025Btn)
      expect(storeApi!.getState().speed).toBe(0.25)

      const speed1Btn = screen.getByLabelText("Set playback speed to 1x")
      fireEvent.click(speed1Btn)
      expect(storeApi!.getState().speed).toBe(1)
    })

    it("animates sliding pills across CatalogLevel0, CurveEditorCanvas, PrimitivesXRay and CompareDock", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return (
          <div data-testid="test-harness">
            <CatalogLevel0 />
            <CurveEditorCanvas />
            <PrimitivesXRay />
            <CompareDock />
          </div>
        )
      }

      render(
        <TooltipProvider>
          <EaseStoreProvider>
            <Harness />
          </EaseStoreProvider>
        </TooltipProvider>
      )

      // 1. CatalogLevel0: Engine & Filter Switcher
      const springEngineBtn = screen.getByText(/Spring \(26\)/i)
      fireEvent.click(springEngineBtn)
      expect(storeApi!.getState().activeLibraryTab).toBe("spring")

      const popularFilterBtn = screen.getByText("★ Popular")
      fireEvent.click(popularFilterBtn)
      expect(screen.getByText("★ Popular")).toBeDefined()

      // 2. CurveEditorCanvas: Engine & Spring Mode Switcher
      const canvasSpringBtn = screen.getByLabelText("Switch to Spring engine")
      fireEvent.click(canvasSpringBtn)
      expect(storeApi!.getState().draftCurve?.workingCurve.engine).toBe(
        "spring"
      )

      const physicsModeBtn = screen.getByLabelText(
        "Switch to Physics spring mode"
      )
      fireEvent.click(physicsModeBtn)
      expect(physicsModeBtn).toBeDefined()

      const simpleModeBtn = screen.getByLabelText(
        "Switch to Simple spring mode"
      )
      fireEvent.click(simpleModeBtn)
      expect(simpleModeBtn).toBeDefined()

      // 3. PrimitivesXRay: Filter Pills
      const scaleFilterBtn = screen.getByLabelText("Filter scale primitive")
      fireEvent.click(scaleFilterBtn)
      expect(scaleFilterBtn).toBeDefined()

      const allFilterBtn = screen.getByLabelText("Filter all primitive")
      fireEvent.click(allFilterBtn)
      expect(allFilterBtn).toBeDefined()

      // 4. CompareDock: Phase Switcher (In / Out)
      // Switch target to a component with enter & exit tracks (e.g. dialog:open)
      act(() => {
        storeApi!.setState({
          globalCompareTarget: {
            trackId: "dialog:open",
            channelId: "all",
          },
        })
      })

      const outPhaseBtn = screen.getByLabelText("Exit phase")
      fireEvent.click(outPhaseBtn)
      expect(storeApi!.getState().globalCompareTarget.trackId).toBe(
        "dialog:close"
      )

      const inPhaseBtn = screen.getByLabelText("Entrance phase")
      fireEvent.click(inPhaseBtn)
      expect(storeApi!.getState().globalCompareTarget.trackId).toBe(
        "dialog:open"
      )
    })
  })

  describe("App Motion Grammar — Pass 4: Zones 1 & 7 Optical Stage Morphs & SVG Studio Polish", () => {
    it("exports SATISIUM_STAGE_MORPH_TRANSITION with 260ms duration and Quint Out easing", () => {
      expect(SATISIUM_STAGE_MORPH_TRANSITION.duration).toBe(0.26)
      expect(SATISIUM_STAGE_MORPH_TRANSITION.duration * 1000).toBe(260)
      expect(SATISIUM_STAGE_MORPH_TRANSITION.ease).toEqual(SATISIUM_EASE_QUINT)
    })

    it("toggles Import drawer and Velocity curve overlay cleanly in CurveEditorCanvas", () => {
      render(
        <TooltipProvider>
          <EaseStoreProvider>
            <CurveEditorCanvas />
          </EaseStoreProvider>
        </TooltipProvider>
      )

      // Toggle Import drawer
      const importBtn = screen.getByLabelText("Toggle curve import")
      expect(screen.queryByLabelText("Curve import definition")).toBeNull()

      fireEvent.click(importBtn)
      expect(screen.getByLabelText("Curve import definition")).toBeDefined()

      fireEvent.click(importBtn)
      expect(screen.queryByLabelText("Curve import definition")).toBeNull()

      // Toggle Velocity overlay
      const velocityBtn = screen.getByLabelText("Toggle velocity slope curve")
      fireEvent.click(velocityBtn)
      expect(screen.getAllByText("Velocity").length).toBe(2)

      fireEvent.click(velocityBtn)
      expect(screen.getAllByText("Velocity").length).toBe(1)
    })

    it("morphs workspace smoothly between Preview, Customize, and Compare modes in StudioShell", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <StudioShell />
      }

      render(
        <TooltipProvider>
          <EaseStoreProvider>
            <Harness />
          </EaseStoreProvider>
        </TooltipProvider>
      )

      expect(storeApi!.getState().mode).toBe("preview")

      // Switch to Customize mode
      const customizeTab = screen.getByRole("tab", { name: /Customize/i })
      fireEvent.click(customizeTab)
      expect(storeApi!.getState().mode).toBe("customize")
      expect(screen.getByText(/Telemetry/i)).toBeDefined()

      // Stage 2 curves to enable Compare mode
      act(() => {
        storeApi!.setState({
          compareQueue: [
            { id: "tile-1", curve: CANONICAL_BEZIER_PRESETS[0], visible: true },
            { id: "tile-2", curve: CANONICAL_BEZIER_PRESETS[1], visible: true },
          ],
        })
      })

      // Switch to Compare mode
      const compareTab = screen.getByRole("tab", { name: /Compare/i })
      fireEvent.click(compareTab)
      expect(storeApi!.getState().mode).toBe("compare")

      // Switch back to Preview mode
      const previewTab = screen.getByRole("tab", { name: /Preview/i })
      fireEvent.click(previewTab)
      expect(storeApi!.getState().mode).toBe("preview")
    })
  })

  describe("App Motion Grammar — Step S-1: 100% Opaque Block Slides & Edge Progressive Blur", () => {
    it("exports distance-calibrated opaque slide transitions with iOS Sheet easing", () => {
      // SATISIUM_FLANK_SLIDE_TRANSITION: 380ms
      expect(SATISIUM_FLANK_SLIDE_TRANSITION.duration).toBe(0.38)
      expect(SATISIUM_FLANK_SLIDE_TRANSITION.duration * 1000).toBe(380)
      expect(SATISIUM_FLANK_SLIDE_TRANSITION.ease).toEqual(
        SATISIUM_IOS_SHEET_EASE
      )

      // SATISIUM_LEFT_COLLAPSE_TRANSITION: 420ms
      expect(SATISIUM_LEFT_COLLAPSE_TRANSITION.duration).toBe(0.42)
      expect(SATISIUM_LEFT_COLLAPSE_TRANSITION.duration * 1000).toBe(420)
      expect(SATISIUM_LEFT_COLLAPSE_TRANSITION.ease).toEqual(
        SATISIUM_IOS_SHEET_EASE
      )

      // SATISIUM_STAGE_SLIDE_TRANSITION: 460ms
      expect(SATISIUM_STAGE_SLIDE_TRANSITION.duration).toBe(0.46)
      expect(SATISIUM_STAGE_SLIDE_TRANSITION.duration * 1000).toBe(460)
      expect(SATISIUM_STAGE_SLIDE_TRANSITION.ease).toEqual(
        SATISIUM_IOS_SHEET_EASE
      )
    })
  })

  describe("App Motion Grammar — Step S-2: 100% Opaque Left Flank & Export Dialog Content Slides", () => {
    it("renders Left Flank cassette with 100% opaque sliding blocks and will-change-transform", () => {
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

      const level0Section = screen.getByRole("region", {
        name: "Preset Catalog",
      })
      const level1Section = screen.getByRole("region", {
        name: "Ease Studio",
      })

      expect(level0Section.className).toContain("will-change-transform")
      expect(level1Section.className).toContain("will-change-transform")
      expect(level0Section.className).toContain("pointer-events-auto")
      expect(level1Section.className).toContain("pointer-events-none")

      // Drill into curve (Level 1)
      act(() => {
        storeApi!.getState().drillIntoCurve("modal-sheet")
      })

      expect(level0Section.className).toContain("pointer-events-none")
      expect(level1Section.className).toContain("pointer-events-auto")
    })

    it("slides CatalogLevel0 library between Bezier and Spring without opacity fading", () => {
      render(
        <EaseStoreProvider>
          <CatalogLevel0 />
        </EaseStoreProvider>
      )

      expect(screen.getByText(/Bezier \(35\)/i)).toBeDefined()
      expect(screen.getByText(/Spring \(26\)/i)).toBeDefined()

      // Switch to Spring
      const springBtn = screen.getByText(/Spring \(26\)/i)
      fireEvent.click(springBtn)

      expect(screen.getByText("Snappy Spring")).toBeDefined()

      // Switch back to Bezier
      const bezierBtn = screen.getByText(/Bezier \(35\)/i)
      fireEvent.click(bezierBtn)

      expect(screen.getByText("Ease Out Quart")).toBeDefined()
    })

    it("slides ExportDialog code blocks horizontally and rolls copy buttons vertically at opacity 1", async () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <ExportDialog />
      }

      render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      act(() => {
        storeApi!.getState().setExportOpen(true)
      })

      // Viewport has overflow-hidden and rounded-[14px]
      const dialog = screen.getByRole("dialog")
      const codeViewport = dialog.querySelector(
        ".overflow-hidden.rounded-\\[14px\\]"
      )
      expect(codeViewport).not.toBeNull()

      // Switch frameworks: CSS -> Tailwind -> Motion -> GSAP
      const tailwindTab = screen.getByLabelText("Tailwind export")
      fireEvent.click(tailwindTab)
      expect(storeApi!.getState().preferredExporter).toBe("tailwind")

      const gsapTab = screen.getByLabelText("GSAP export")
      fireEvent.click(gsapTab)
      expect(storeApi!.getState().preferredExporter).toBe("gsap")

      // Buttons have overflow-hidden for vertical text roll
      const copyCodeBtn = screen.getByLabelText(
        "Copy generated code to clipboard"
      )
      const copyUrlBtn = screen.getByLabelText(
        "Copy shareable URL to clipboard"
      )
      expect(copyCodeBtn.className).toContain("overflow-hidden")
      expect(copyUrlBtn.className).toContain("overflow-hidden")
    })
  })
})
