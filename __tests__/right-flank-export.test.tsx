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

  return (
    <div data-testid="probe">
      <span data-testid="probe-channel-curve">{focusedChannel?.curve.id}</span>
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

function TestRig() {
  return (
    <EaseStoreProvider>
      <ArchetypeAdvisorSlab />
      <CompareQueueSlab />
      <ExportSlab />
      <ExportDialog />
      <StoreProbe />
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

      // Switch framework to Tailwind
      const tailwindTab = screen.getByRole("tab", { name: "Tailwind export" })
      fireEvent.click(tailwindTab)
      expect(screen.getByTestId("probe-exporter").textContent).toBe("tailwind")

      // Switch framework to Motion
      const motionTab = screen.getByRole("tab", { name: "Motion export" })
      fireEvent.click(motionTab)
      expect(screen.getByTestId("probe-exporter").textContent).toBe("motion")

      // Switch scope to Full Track
      const fullTrackBtn = screen.getByRole("tab", {
        name: "Export full track channels",
      })
      fireEvent.click(fullTrackBtn)
      expect(screen.getByTestId("probe-export-scope").textContent).toBe("track")

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
  })
})
