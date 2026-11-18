import * as React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuditionToolbar } from "@/components/studio/modes/audition/center-stage/audition-toolbar"
import {
  EaseStoreProvider,
  useEaseStore,
  useEaseStoreApi,
} from "@/hooks/use-ease-store"
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
  it("renders Component picker, displays Primitives by default, and switches component on click", () => {
    render(
      <TestWrapper>
        <AuditionToolbar />
        <StoreProbe />
      </TestWrapper>
    )

    // Initially Primitives
    const pickerTrigger = screen.getByRole("button", {
      name: /Select interactive component/i,
    })
    expect(pickerTrigger).toBeInTheDocument()
    expect(screen.getByText("Primitives")).toBeInTheDocument()
    expect(screen.getByTestId("probe-track").textContent).toBe("primitives:all")

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

    // Select Modal Dialog first so paired phase switcher is available
    const pickerTrigger = screen.getByRole("button", {
      name: /Select interactive component/i,
    })
    fireEvent.click(pickerTrigger)
    const modalOption = screen.getByRole("button", { name: "Modal Dialog" })
    fireEvent.click(modalOption)

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

  it("renders Channel Dropdown and allows selecting specific channels", () => {
    render(
      <TestWrapper>
        <AuditionToolbar />
        <StoreProbe />
      </TestWrapper>
    )

    const channelTrigger = screen.getByRole("button", {
      name: /Select kinetic channel/i,
    })
    expect(channelTrigger).toBeInTheDocument()
    expect(screen.getByText("All Channels")).toBeInTheDocument()

    // Open channel dropdown on default primitives:all
    fireEvent.click(channelTrigger)
    const positionOption = screen.getByRole("button", {
      name: /Position channel/i,
    })
    expect(positionOption).toBeInTheDocument()

    // Click Position
    fireEvent.click(positionOption)
    expect(screen.getByTestId("probe-channel").textContent).toBe("position")
    expect(screen.getByText("Position")).toBeInTheDocument()

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

    // Focus a channel first via Channel Dropdown so Solo is available
    const channelTrigger = screen.getByRole("button", {
      name: /Select kinetic channel/i,
    })
    fireEvent.click(channelTrigger)
    const positionOption = screen.getByRole("button", {
      name: /Position channel/i,
    })
    fireEvent.click(positionOption)
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

  it("switches across all 7 interactive UI components and closes the menu after each selection", () => {
    render(
      <TestWrapper>
        <AuditionToolbar />
        <StoreProbe />
      </TestWrapper>
    )

    const expectedComponents = [
      { label: "Drawer Sheet", trackId: "drawer:open" },
      { label: "Filter Dropdown", trackId: "dropdown:open" },
      { label: "Morphing Button", trackId: "button:press" },
      { label: "Toast Stack", trackId: "toast:fire" },
      { label: "Segmented Control", trackId: "tabs:switch" },
      { label: "Wallet Card Deck", trackId: "carousel:slide" },
      { label: "Modal Dialog", trackId: "dialog:open" },
    ]

    for (const { label, trackId } of expectedComponents) {
      // 1. Open component menu
      const pickerTrigger = screen.getByRole("button", {
        name: /Select interactive component/i,
      })
      fireEvent.click(pickerTrigger)

      // 2. Select component option
      const option = screen.getByRole("button", { name: label })
      expect(option).toBeInTheDocument()
      fireEvent.click(option)

      // 3. Verify store focused track updated
      expect(screen.getByTestId("probe-track").textContent).toBe(trackId)

      // 4. Verify menu is closed
      expect(screen.queryByText("Components")).toBeNull()
    }
  })

  it("closes the Component menu on Escape key and on outside click", () => {
    render(
      <TestWrapper>
        <div data-testid="outside-area">Outside</div>
        <AuditionToolbar />
        <StoreProbe />
      </TestWrapper>
    )

    const pickerTrigger = screen.getByRole("button", {
      name: /Select interactive component/i,
    })

    // Test Escape key dismissal
    fireEvent.click(pickerTrigger)
    expect(screen.getByText("Components")).toBeInTheDocument()
    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.queryByText("Components")).toBeNull()

    // Test outside click dismissal
    fireEvent.click(pickerTrigger)
    expect(screen.getByText("Components")).toBeInTheDocument()
    fireEvent.pointerDown(screen.getByTestId("outside-area"))
    expect(screen.queryByText("Components")).toBeNull()
  })

  it("allows selecting Primitives with Lab badge and isolates channel in Channel Dropdown", () => {
    render(
      <TestWrapper>
        <AuditionToolbar />
        <StoreProbe />
      </TestWrapper>
    )

    // Switch to another component first
    const pickerTrigger = screen.getByRole("button", {
      name: /Select interactive component/i,
    })
    fireEvent.click(pickerTrigger)
    const modalOption = screen.getByRole("button", { name: "Modal Dialog" })
    fireEvent.click(modalOption)
    expect(screen.getByTestId("probe-track").textContent).toBe("dialog:open")

    // Open component menu again
    fireEvent.click(pickerTrigger)

    // Verify Lab badge and Primitives option
    expect(screen.getByText("Lab")).toBeInTheDocument()
    const primitivesOption = screen.getByRole("button", { name: "Primitives" })
    expect(primitivesOption).toBeInTheDocument()

    // Select Primitives
    fireEvent.click(primitivesOption)
    expect(screen.getByTestId("probe-track").textContent).toBe("primitives:all")
    expect(screen.getByTestId("probe-channel").textContent).toBe("all")

    // Open Channel Dropdown
    const channelTrigger = screen.getByRole("button", {
      name: /Select kinetic channel/i,
    })
    fireEvent.click(channelTrigger)

    // Verify Position option is available and click it
    const positionOption = screen.getByRole("button", {
      name: /Position channel/i,
    })
    expect(positionOption).toBeInTheDocument()
    fireEvent.click(positionOption)

    expect(screen.getByTestId("probe-channel").textContent).toBe("position")
    expect(screen.getByText("Position")).toBeInTheDocument()
  })

  it("enables Reset button when track is modified and restores defaults on click", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function StoreCapture() {
      const api = useEaseStoreApi()
      React.useEffect(() => {
        storeApi = api
      }, [api])
      return null
    }

    render(
      <TestWrapper>
        <AuditionToolbar />
        <StoreCapture />
      </TestWrapper>
    )

    const resetBtn = screen.getByRole("button", {
      name: /Reset component to default curves/i,
    })
    expect(resetBtn).toBeInTheDocument()
    // Initially unmodified -> disabled
    expect(resetBtn).toBeDisabled()

    // Modify a channel duration inside act
    act(() => {
      storeApi!.getState().setFocusedDurationMs(999)
    })

    // Now track is modified -> button becomes enabled
    expect(resetBtn).not.toBeDisabled()

    // Click Reset inside act
    act(() => {
      fireEvent.click(resetBtn)
    })

    // Track is restored back to default -> button disabled again
    expect(resetBtn).toBeDisabled()
  })
})
