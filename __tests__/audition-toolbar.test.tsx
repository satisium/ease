import * as React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, beforeEach } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuditionToolbar } from "@/components/studio/modes/audition/center-stage/audition-toolbar"
import { useStudioStore } from "@/store/useStudioStore"

describe("AuditionToolbar (Phase 1 UI/UX Overhaul)", () => {
  beforeEach(() => {
    useStudioStore.setState({
      activeScenarioKey: "dialog",
      activeSlotId: "enter",
      activeChannelId: "all",
      viewportMode: "desktop",
      discoveredChannels: {
        dialog: {
          enter: [
            {
              id: "backdrop",
              label: "Backdrop",
              targetSelector: "[data-ease-target='backdrop']",
              property: "opacity",
              kind: "scalar",
              unit: "",
              from: 0,
              to: 1,
              role: "Atmospheric Scrim",
              defaultCurveId: "material-decelerate",
            },
            {
              id: "translateY",
              label: "Translate Y",
              targetSelector: "[data-ease-target='card']",
              property: "translateY",
              kind: "dimension",
              unit: "px",
              from: 16,
              to: 0,
              role: "Focal Surface Lock",
              defaultCurveId: "modal-sheet",
            },
            {
              id: "scale",
              label: "Scale",
              targetSelector: "[data-ease-target='card']",
              property: "scale",
              kind: "scalar",
              unit: "",
              from: 0.95,
              to: 1.0,
              role: "Focal Surface Lock",
              defaultCurveId: "gentle",
            },
          ],
        },
      },
    })
  })

  it("renders semantic Phase Switcher with Entrance and Exit tabs", () => {
    render(
      <TooltipProvider>
        <AuditionToolbar />
      </TooltipProvider>
    )

    // Check Archetype badge
    expect(screen.getByText("Dialog")).toBeInTheDocument()

    // Phase Switcher tabs (explicit semantic labels, NOT curve names)
    const entranceTab = screen.getByRole("tab", { name: /Entrance/i })
    const exitTab = screen.getByRole("tab", { name: /Exit/i })

    expect(entranceTab).toBeInTheDocument()
    expect(exitTab).toBeInTheDocument()
    expect(entranceTab).toHaveAttribute("aria-selected", "true")
    expect(exitTab).toHaveAttribute("aria-selected", "false")
  })

  it("renders Master Channel and individual channel chips", () => {
    render(
      <TooltipProvider>
        <AuditionToolbar />
      </TooltipProvider>
    )

    // Master chip
    const allChip = screen.getByRole("tab", { name: /All/i })
    expect(allChip).toBeInTheDocument()
    expect(allChip).toHaveAttribute("aria-selected", "true")

    // Detected channel chips
    expect(screen.getByRole("tab", { name: /Backdrop/i })).toBeInTheDocument()
    expect(
      screen.getByRole("tab", { name: /Translate Y/i })
    ).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Scale/i })).toBeInTheDocument()
  })

  it("switches to Exit phase and updates active tab state when clicked", () => {
    render(
      <TooltipProvider>
        <AuditionToolbar />
      </TooltipProvider>
    )

    const exitTab = screen.getByRole("tab", { name: /Exit/i })
    fireEvent.click(exitTab)

    expect(useStudioStore.getState().activeSlotId).toBe("exit")
  })

  it("switches active channel chip when clicked", () => {
    render(
      <TooltipProvider>
        <AuditionToolbar />
      </TooltipProvider>
    )

    const translateYChip = screen.getByRole("tab", { name: /Translate Y/i })
    fireEvent.click(translateYChip)

    expect(useStudioStore.getState().activeChannelId).toBe("translateY")
  })
})
