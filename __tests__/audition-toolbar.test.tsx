import * as React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuditionToolbar } from "@/components/studio/modes/audition/center-stage/audition-toolbar"
import { EaseStoreProvider, useEaseStore } from "@/hooks/use-ease-store"
import { StudioUiProvider } from "@/components/studio/studio-ui-context"

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <EaseStoreProvider>
      <StudioUiProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </StudioUiProvider>
    </EaseStoreProvider>
  )
}

function StoreProbe() {
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
  const focusedChannelId = useEaseStore((s) => s.focusedChannelId)
  const isSolo = useEaseStore((s) => s.isSolo)
  const isPinned = useEaseStore((s) => s.isPinned)
  const compareCount = useEaseStore((s) => s.compareQueue.length)
  const duration = useEaseStore((s) => {
    const track =
      s.trackBindings[s.focusedTrackId] ?? s.getFocusedTrack().channels
    const ch = track.find((c) => c.id === s.focusedChannelId)
    return ch?.durationMs ?? 0
  })

  return (
    <div data-testid="store-probe">
      <span data-testid="probe-track">{focusedTrackId}</span>
      <span data-testid="probe-channel">{focusedChannelId}</span>
      <span data-testid="probe-solo">{String(isSolo)}</span>
      <span data-testid="probe-pinned">{String(isPinned)}</span>
      <span data-testid="probe-compare">{compareCount}</span>
      <span data-testid="probe-duration">{duration}</span>
    </div>
  )
}

describe("AuditionToolbar (In-Process Headless Core Integration)", () => {
  it("renders Component picker, displays Modal Dialog, and switches component on click", () => {
    render(
      <TestWrapper>
        <AuditionToolbar />
        <StoreProbe />
      </TestWrapper>
    )

    // Initially Modal Dialog
    const pickerTrigger = screen.getByRole("button", {
      name: /Select interactive component/i,
    })
    expect(pickerTrigger).toBeInTheDocument()
    expect(screen.getByText("Modal Dialog")).toBeInTheDocument()
    expect(screen.getByTestId("probe-track").textContent).toBe("dialog:open")

    // Open menu
    fireEvent.click(pickerTrigger)
    const drawerOption = screen.getByRole("button", { name: "Drawer Sheet" })
    expect(drawerOption).toBeInTheDocument()

    // Select Drawer Sheet
    fireEvent.click(drawerOption)
    expect(screen.getByTestId("probe-track").textContent).toBe("drawer:open")
  })

  it("renders Phase Switcher and toggles between Entrance and Exit phases", () => {
    render(
      <TestWrapper>
        <AuditionToolbar />
        <StoreProbe />
      </TestWrapper>
    )

    const entranceTab = screen.getByRole("tab", { name: /Entrance phase/i })
    const exitTab = screen.getByRole("tab", { name: /Exit phase/i })

    expect(entranceTab).toBeInTheDocument()
    expect(exitTab).toBeInTheDocument()
    expect(entranceTab).toHaveAttribute("aria-selected", "true")
    expect(exitTab).toHaveAttribute("aria-selected", "false")

    // Click Exit
    fireEvent.click(exitTab)
    expect(screen.getByTestId("probe-track").textContent).toBe("dialog:close")
    expect(exitTab).toHaveAttribute("aria-selected", "true")
    expect(entranceTab).toHaveAttribute("aria-selected", "false")

    // Click Entrance back
    fireEvent.click(entranceTab)
    expect(screen.getByTestId("probe-track").textContent).toBe("dialog:open")
  })

  it("renders Multi-Channel strip and allows selecting specific channels", () => {
    render(
      <TestWrapper>
        <AuditionToolbar />
        <StoreProbe />
      </TestWrapper>
    )

    const allChip = screen.getByRole("tab", { name: /Master Channel/i })
    expect(allChip).toBeInTheDocument()
    expect(allChip).toHaveAttribute("aria-selected", "true")

    const translateYChip = screen.getByRole("tab", {
      name: /Translate Y channel/i,
    })
    expect(translateYChip).toBeInTheDocument()

    // Click Translate Y
    fireEvent.click(translateYChip)
    expect(screen.getByTestId("probe-channel").textContent).toBe("translateY")
    expect(translateYChip).toHaveAttribute("aria-selected", "true")
    expect(allChip).toHaveAttribute("aria-selected", "false")

    // Scoped controls
    expect(
      screen.getByRole("button", { name: /Toggle channel solo/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Customize curve/i })
    ).toBeInTheDocument()
  })

  it("toggles Solo and triggers Customize curve", () => {
    render(
      <TestWrapper>
        <AuditionToolbar />
        <StoreProbe />
      </TestWrapper>
    )

    // Solo is disabled initially when channel is "all"
    const soloBtn = screen.getByRole("button", {
      name: /Toggle channel solo/i,
    })
    expect(soloBtn).toBeDisabled()

    // Focus a channel first so Solo is available
    const scaleChip = screen.getByRole("tab", { name: /Scale channel/i })
    fireEvent.click(scaleChip)
    expect(soloBtn).not.toBeDisabled()

    // Solo
    fireEvent.click(soloBtn)
    expect(screen.getByTestId("probe-solo").textContent).toBe("true")

    // Customize
    const customizeBtn = screen.getByRole("button", {
      name: /Customize curve/i,
    })
    expect(customizeBtn).toBeInTheDocument()
  })
})
