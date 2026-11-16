import * as React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { EaseStoreProvider, useEaseStore } from "@/hooks/use-ease-store"
import { ArchetypeAdvisorSlab } from "@/components/studio/modes/audition/right-flank/archetype-advisor-slab"
import { CompareQueueSlab } from "@/components/studio/modes/audition/right-flank/compare-queue-slab"
import { ExportSlab } from "@/components/studio/modes/audition/right-flank/export-slab"
import { ExportDialog } from "@/components/studio/export-dialog"

function StoreProbe() {
  const focusedChannel = useEaseStore((s) => s.getFocusedChannel())
  const compareCount = useEaseStore((s) => s.compareQueue.length)
  const isExportOpen = useEaseStore((s) => s.isExportOpen)
  const preferredExporter = useEaseStore((s) => s.preferredExporter)
  const exportScope = useEaseStore((s) => s.exportScope)
  const activeCurve = useEaseStore((s) => s.getActiveCurve())
  const focusedChannelId = useEaseStore((s) => s.focusedChannelId)

  return (
    <div data-testid="probe">
      <span data-testid="probe-channel-curve">{focusedChannel?.curve.id}</span>
      <span data-testid="probe-active-curve">{activeCurve.id}</span>
      <span data-testid="probe-focused-channel-id">{focusedChannelId}</span>
      <span data-testid="probe-channel-duration">
        {focusedChannel?.durationMs}
      </span>
      <span data-testid="probe-compare-count">{compareCount}</span>
      <span data-testid="probe-export-open">{String(isExportOpen)}</span>
      <span data-testid="probe-exporter">{preferredExporter}</span>
      <span data-testid="probe-export-scope">{exportScope}</span>
    </div>
  )
}

function StoreActions() {
  const selectCurveForFocused = useEaseStore((s) => s.selectCurveForFocused)
  const focusChannel = useEaseStore((s) => s.focusChannel)
  const enterCustomize = useEaseStore((s) => s.enterCustomize)
  const updateDraft = useEaseStore((s) => s.updateDraft)
  const enterCompare = useEaseStore((s) => s.enterCompare)
  const stageActiveCurveToCompare = useEaseStore(
    (s) => s.stageActiveCurveToCompare
  )

  return (
    <div>
      <button
        type="button"
        data-testid="btn-select-material-decelerate"
        onClick={() => selectCurveForFocused("material-decelerate")}
      >
        Select Material Decelerate
      </button>
      <button
        type="button"
        data-testid="btn-select-expo-out"
        onClick={() => selectCurveForFocused("expo-out")}
      >
        Select Expo Out
      </button>
      <button
        type="button"
        data-testid="btn-focus-all-channels"
        onClick={() => focusChannel("all")}
      >
        Focus All Channels
      </button>
      <button
        type="button"
        data-testid="btn-enter-customize"
        onClick={() => enterCustomize()}
      >
        Enter Customize
      </button>
      <button
        type="button"
        data-testid="btn-update-draft"
        onClick={() =>
          updateDraft({
            bezier: { p1: { x: 0.1, y: 0.9 }, p2: { x: 0.2, y: 1 } },
          })
        }
      >
        Update Draft
      </button>
      <button
        type="button"
        data-testid="btn-stage-curve"
        onClick={() => stageActiveCurveToCompare()}
      >
        Stage Active Curve
      </button>
      <button
        type="button"
        data-testid="btn-enter-compare"
        onClick={() => enterCompare()}
      >
        Enter Compare
      </button>
    </div>
  )
}

function TestRig() {
  return (
    <EaseStoreProvider>
      <ArchetypeAdvisorSlab />
      <CompareQueueSlab />
      <ExportSlab />
      <ExportDialog />
      <StoreProbe />
      <StoreActions />
    </EaseStoreProvider>
  )
}

describe("Right Flank & Export Dialog (Step B-4A)", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  describe("ArchetypeAdvisorSlab", () => {
    it("renders Motion Guide, active channel role, and quiet duration line", () => {
      render(<TestRig />)

      // Motion guide header
      expect(
        screen.getByText(/Motion Guide · Translate Y/i)
      ).toBeInTheDocument()
      expect(screen.getByText("Surface Elevation")).toBeInTheDocument()

      // Quiet, borderless active curve & duration line
      expect(screen.getByText("280ms")).toBeInTheDocument()
    })

    it("applies recommended preset while preserving channel duration integrity", () => {
      render(<TestRig />)

      const initialDuration = screen.getByTestId(
        "probe-channel-duration"
      ).textContent

      // Find and click recommended preset (e.g. Expo Out)
      const expoBtn = screen.getByRole("button", {
        name: /Apply Expo Out preset/i,
      })
      expect(expoBtn).toBeInTheDocument()
      fireEvent.click(expoBtn)

      // Curve updated
      expect(screen.getByTestId("probe-channel-curve").textContent).toBe(
        "expo-out"
      )
      // Duration preserved
      expect(screen.getByTestId("probe-channel-duration").textContent).toBe(
        initialDuration
      )
    })
  })

  describe("CompareQueueSlab", () => {
    it("queues curves, toggles visibility, removes items, and enables Duel", () => {
      render(<TestRig />)

      const queueBtn = screen.getByRole("button", {
        name: /Queue current curve for comparison/i,
      })
      const duelBtn = screen.getByRole("button", {
        name: /Enter compare duel mode/i,
      })

      // Initially disabled Duel (< 2 curves)
      expect(duelBtn).toBeDisabled()
      expect(screen.getByText("0 Staged")).toBeInTheDocument()

      // 1. Queue first curve
      fireEvent.click(queueBtn)
      expect(screen.getByText("1 Staged")).toBeInTheDocument()
      expect(duelBtn).toBeDisabled()

      // 2. Select another curve (Quart Out) and queue it
      const quartBtn = screen.getByRole("button", {
        name: /Apply Ease Out Quart preset/i,
      })
      fireEvent.click(quartBtn)
      fireEvent.click(
        screen.getByRole("button", {
          name: /Queue current curve for comparison/i,
        })
      )

      expect(screen.getByText("2 Staged")).toBeInTheDocument()
      expect(duelBtn).not.toBeDisabled()

      // 3. Toggle visibility of an item
      const toggleVisBtns = screen.getAllByRole("button", {
        name: /Hide .* in duel/i,
      })
      expect(toggleVisBtns.length).toBeGreaterThan(0)
      fireEvent.click(toggleVisBtns[0])

      // 4. Remove an item
      const removeBtns = screen.getAllByRole("button", {
        name: /Remove .* from queue/i,
      })
      fireEvent.click(removeBtns[0])
      expect(screen.getByText("1 Staged")).toBeInTheDocument()
      expect(duelBtn).toBeDisabled()
    })
  })

  describe("ExportSlab & ExportDialog", () => {
    it("opens ExportDialog on trigger click, switches framework/scope, and copies code & URL", async () => {
      render(<TestRig />)

      // Trigger export
      const exportBtn = screen.getByRole("button", {
        name: /Export kinetic curve code/i,
      })
      expect(exportBtn.className).toContain("justify-between")
      expect(exportBtn.className).toContain("rounded-[16px]")
      fireEvent.click(exportBtn)

      expect(screen.getByTestId("probe-export-open").textContent).toBe("true")
      expect(screen.getByText("Export Motion Kinetics")).toBeInTheDocument()

      // Dialog container has sm:max-w-[640px] and rounded-[20px]
      const dialogContent = screen.getByRole("dialog")
      expect(dialogContent.className).toContain("sm:max-w-[640px]")
      expect(dialogContent.className).toContain("rounded-[20px]")

      // Subtitle contains engine label
      expect(dialogContent.textContent).toMatch(/Cubic Bézier|Spring Physics/)

      // Default export scope is "ease"
      expect(screen.getByTestId("probe-export-scope").textContent).toBe("ease")

      // Switch framework to Tailwind
      const tailwindTab = screen.getByRole("tab", { name: "Tailwind export" })
      fireEvent.click(tailwindTab)
      expect(screen.getByTestId("probe-exporter").textContent).toBe("tailwind")

      // Switch framework to Motion
      const motionTab = screen.getByRole("tab", { name: "Motion export" })
      fireEvent.click(motionTab)
      expect(screen.getByTestId("probe-exporter").textContent).toBe("motion")

      // Switch scope to Snippet
      const snippetBtn = screen.getByRole("tab", {
        name: "Export full component snippet",
      })
      fireEvent.click(snippetBtn)
      expect(screen.getByTestId("probe-export-scope").textContent).toBe(
        "snippet"
      )

      // Switch scope back to Ease Only
      const easeOnlyBtn = screen.getByRole("tab", {
        name: "Export ease timing curve only",
      })
      fireEvent.click(easeOnlyBtn)
      expect(screen.getByTestId("probe-export-scope").textContent).toBe("ease")

      // Copy code
      const copyCodeBtn = screen.getByRole("button", {
        name: /Copy generated code to clipboard/i,
      })
      await act(async () => {
        fireEvent.click(copyCodeBtn)
      })
      expect(navigator.clipboard.writeText).toHaveBeenCalled()

      // Copy share URL
      const copyUrlBtn = screen.getByRole("button", {
        name: /Copy shareable URL to clipboard/i,
      })
      await act(async () => {
        fireEvent.click(copyUrlBtn)
      })
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })

    it("selecting Material Decelerate with focusedChannelId === 'all' exports Material Decelerate's exact cubic-bezier, not Backdrop's Expo In; switching between Ease Only and Snippet updates CSS, Tailwind, Motion, GSAP", async () => {
      render(<TestRig />)

      // Ensure focusedChannelId is "all" and select Material Decelerate
      fireEvent.click(screen.getByTestId("btn-focus-all-channels"))
      fireEvent.click(screen.getByTestId("btn-select-material-decelerate"))

      expect(screen.getByTestId("probe-focused-channel-id").textContent).toBe(
        "all"
      )
      expect(screen.getByTestId("probe-active-curve").textContent).toBe(
        "material-decelerate"
      )

      // Open export dialog
      fireEvent.click(
        screen.getByRole("button", { name: /Export kinetic curve code/i })
      )
      const dialogContent = screen.getByRole("dialog")
      expect(dialogContent.textContent).toContain("Material Decelerate")
      expect(dialogContent.textContent).toContain("Cubic Bézier")

      // 1. CSS Exporter
      fireEvent.click(screen.getByRole("tab", { name: "CSS export" }))
      fireEvent.click(
        screen.getByRole("tab", { name: "Export ease timing curve only" })
      )
      expect(dialogContent.textContent).toContain(
        "transition-timing-function: cubic-bezier(0, 0, 0.2, 1);"
      )
      expect(dialogContent.textContent).not.toContain("expo-in")

      fireEvent.click(
        screen.getByRole("tab", { name: "Export full component snippet" })
      )
      expect(dialogContent.textContent).toContain(".ease-target {")
      expect(dialogContent.textContent).toContain("transition: transform")
      expect(dialogContent.textContent).toContain("cubic-bezier(0, 0, 0.2, 1);")

      // 2. Tailwind Exporter
      fireEvent.click(screen.getByRole("tab", { name: "Tailwind export" }))
      fireEvent.click(
        screen.getByRole("tab", { name: "Export ease timing curve only" })
      )
      expect(dialogContent.textContent).toContain(
        "ease-[cubic-bezier(0,0,0.2,1)]"
      )

      fireEvent.click(
        screen.getByRole("tab", { name: "Export full component snippet" })
      )
      expect(dialogContent.textContent).toContain(
        "transition-transform duration-["
      )
      expect(dialogContent.textContent).toContain(
        "ease-[cubic-bezier(0,0,0.2,1)]"
      )

      // 3. Motion Exporter
      fireEvent.click(screen.getByRole("tab", { name: "Motion export" }))
      fireEvent.click(
        screen.getByRole("tab", { name: "Export ease timing curve only" })
      )
      expect(dialogContent.textContent).toContain("[0, 0, 0.2, 1]")

      fireEvent.click(
        screen.getByRole("tab", { name: "Export full component snippet" })
      )
      expect(dialogContent.textContent).toContain("transition={{ duration:")
      expect(dialogContent.textContent).toContain("ease: [0, 0, 0.2, 1]")

      // 4. GSAP Exporter
      fireEvent.click(screen.getByRole("tab", { name: "GSAP export" }))
      fireEvent.click(
        screen.getByRole("tab", { name: "Export ease timing curve only" })
      )
      expect(dialogContent.textContent).toContain('"cubic-bezier(0,0,0.2,1)"')

      fireEvent.click(
        screen.getByRole("tab", { name: "Export full component snippet" })
      )
      expect(dialogContent.textContent).toContain('gsap.to(".target", {')
      expect(dialogContent.textContent).toContain(
        'ease: "cubic-bezier(0,0,0.2,1)"'
      )
    })

    it("displays prominent active ease name and engine/duration pill in Preview Mode", () => {
      render(<TestRig />)

      // Open export dialog
      fireEvent.click(
        screen.getByRole("button", { name: /Export kinetic curve code/i })
      )

      const dialogContent = screen.getByRole("dialog")
      expect(dialogContent).toBeInTheDocument()
      // Title
      expect(screen.getByText("Export Motion Kinetics")).toBeInTheDocument()
      // Prominent curve name
      expect(dialogContent.textContent).toContain("Decelerate")
      // Pill
      expect(dialogContent.textContent).toMatch(/Cubic Bézier · \d+ms/)
      // Not dirty, so no "Unsaved Draft *"
      expect(dialogContent.textContent).not.toContain("Unsaved Draft *")
    })

    it("displays Unsaved Draft * badge and exports live uncommitted Bézier coordinates during customization", () => {
      render(<TestRig />)

      // Enter customize mode and update draft curve
      fireEvent.click(screen.getByTestId("btn-enter-customize"))
      fireEvent.click(screen.getByTestId("btn-update-draft"))

      // Open export dialog
      fireEvent.click(
        screen.getByRole("button", { name: /Export kinetic curve code/i })
      )

      const dialogContent = screen.getByRole("dialog")
      expect(screen.getByText("Unsaved Draft *")).toBeInTheDocument()

      // Switch to CSS ease only to check coordinates
      fireEvent.click(screen.getByRole("tab", { name: "CSS export" }))
      fireEvent.click(
        screen.getByRole("tab", { name: "Export ease timing curve only" })
      )

      expect(dialogContent.textContent).toContain(
        "transition-timing-function: cubic-bezier(0.1, 0.9, 0.2, 1);"
      )
    })

    it("allows selecting contender to export in Compare Mode and updates exported code immediately", () => {
      render(<TestRig />)

      // 1. Stage first curve (Material Decelerate)
      fireEvent.click(screen.getByTestId("btn-select-material-decelerate"))
      fireEvent.click(screen.getByTestId("btn-stage-curve"))

      // 2. Stage second curve (Expo Out)
      fireEvent.click(screen.getByTestId("btn-select-expo-out"))
      fireEvent.click(screen.getByTestId("btn-stage-curve"))

      // 3. Enter Compare mode
      fireEvent.click(screen.getByTestId("btn-enter-compare"))

      // 4. Open export dialog
      fireEvent.click(
        screen.getByRole("button", { name: /Export kinetic curve code/i })
      )

      const dialogContent = screen.getByRole("dialog")
      expect(screen.getByText("Select Contender to Export")).toBeInTheDocument()

      // Both contenders rendered in the contender tablist
      const decelTab = screen.getByRole("tab", {
        name: "Export contender Material Decelerate",
      })
      const expoTab = screen.getByRole("tab", {
        name: "Export contender Expo Out",
      })
      expect(decelTab).toBeInTheDocument()
      expect(expoTab).toBeInTheDocument()

      // Initially first contender (Material Decelerate) is selected
      expect(decelTab).toHaveAttribute("aria-selected", "true")
      expect(expoTab).toHaveAttribute("aria-selected", "false")
      expect(dialogContent.textContent).toContain("Material Decelerate")

      // Ensure CSS Ease Only scope
      fireEvent.click(screen.getByRole("tab", { name: "CSS export" }))
      fireEvent.click(
        screen.getByRole("tab", { name: "Export ease timing curve only" })
      )
      expect(dialogContent.textContent).toContain("cubic-bezier(0, 0, 0.2, 1)")

      // Switch to Expo Out contender
      fireEvent.click(expoTab)
      expect(expoTab).toHaveAttribute("aria-selected", "true")
      expect(decelTab).toHaveAttribute("aria-selected", "false")
      expect(dialogContent.textContent).toContain("Expo Out")
      expect(dialogContent.textContent).toContain(
        "cubic-bezier(0.16, 1, 0.3, 1)"
      )
    })
  })
})
