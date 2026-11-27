import * as React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, beforeEach } from "vitest"
import {
  EaseStoreProvider,
  useEaseStore,
  useEaseStoreApi,
} from "@/hooks/use-ease-store"
import { StudioShell } from "@/components/studio/studio-shell"

function StoreProbe() {
  const store = useEaseStoreApi()
  const isPlaying = useEaseStore((s) => s.isPlaying)
  const isLooping = useEaseStore((s) => s.isLooping)
  const isSolo = useEaseStore((s) => s.isSolo)
  const compareCount = useEaseStore((s) => s.compareQueue.length)
  const isExportOpen = useEaseStore((s) => s.isExportOpen)
  const mode = useEaseStore((s) => s.mode)
  const navLevel = useEaseStore((s) => s.navStack.level)

  return (
    <div data-testid="probe">
      <span data-testid="probe-playing">{String(isPlaying)}</span>
      <span data-testid="probe-looping">{String(isLooping)}</span>
      <span data-testid="probe-solo">{String(isSolo)}</span>
      <span data-testid="probe-compare">{compareCount}</span>
      <span data-testid="probe-export">{String(isExportOpen)}</span>
      <span data-testid="probe-mode">{mode}</span>
      <span data-testid="probe-nav-level">{navLevel}</span>
      <button
        data-testid="focus-channel-btn"
        onClick={() => store.getState().focusChannel("dialog:scale")}
      >
        Focus Channel
      </button>
    </div>
  )
}

function TestRig() {
  return (
    <EaseStoreProvider>
      <StudioShell />
      <StoreProbe />
    </EaseStoreProvider>
  )
}

describe("StudioShell Global Shortcuts & StudioStoreProvider Retirement (Step B-4B)", () => {
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

  it("triggers Play/Pause with Space, Loop with L, and Solo with S", () => {
    render(<TestRig />)

    expect(screen.getByTestId("probe-playing").textContent).toBe("false")
    expect(screen.getByTestId("probe-looping").textContent).toBe("false")
    expect(screen.getByTestId("probe-solo").textContent).toBe("false")

    // 1. Space triggers live playback
    fireEvent.keyDown(window, { key: " " })
    expect(screen.getByTestId("probe-playing").textContent).toBe("true")

    // 2. Space pauses playback
    fireEvent.keyDown(window, { key: " " })
    expect(screen.getByTestId("probe-playing").textContent).toBe("false")

    // 3. L toggles looping
    fireEvent.keyDown(window, { key: "l" })
    expect(screen.getByTestId("probe-looping").textContent).toBe("true")
    fireEvent.keyDown(window, { key: "L" })
    expect(screen.getByTestId("probe-looping").textContent).toBe("false")

    // 4. S toggles solo (focusing a channel auto-activates solo)
    fireEvent.click(screen.getByTestId("focus-channel-btn"))
    expect(screen.getByTestId("probe-solo").textContent).toBe("true")
    fireEvent.keyDown(window, { key: "s" })
    expect(screen.getByTestId("probe-solo").textContent).toBe("false")
    fireEvent.keyDown(window, { key: "S" })
    expect(screen.getByTestId("probe-solo").textContent).toBe("true")
  })

  it("stages curve to compare with C and triggers replay with R", () => {
    render(<TestRig />)

    expect(screen.getByTestId("probe-compare").textContent).toBe("0")

    // C stages curve
    fireEvent.keyDown(window, { key: "c" })
    expect(screen.getByTestId("probe-compare").textContent).toBe("1")

    // R triggers live replay
    fireEvent.keyDown(window, { key: "r" })
    expect(screen.getByTestId("probe-playing").textContent).toBe("true")
  })

  it("opens Export dialog with Meta+E and dismisses with Escape", () => {
    render(<TestRig />)

    expect(screen.getByTestId("probe-export").textContent).toBe("false")

    // Meta+E opens export dialog
    fireEvent.keyDown(window, { key: "e", metaKey: true })
    expect(screen.getByTestId("probe-export").textContent).toBe("true")
    expect(screen.getByText("Export Motion Kinetics")).toBeInTheDocument()

    // Escape closes export dialog
    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.getByTestId("probe-export").textContent).toBe("false")
  })

  it("handles Escape in Level 1 to navigate back to Level 0 presets", () => {
    function LevelNavigator() {
      const store = useEaseStoreApi()
      return (
        <button onClick={() => store.getState().drillIntoCurve("modal-sheet")}>
          Drill
        </button>
      )
    }

    render(
      <EaseStoreProvider>
        <StudioShell />
        <LevelNavigator />
        <StoreProbe />
      </EaseStoreProvider>
    )

    // Drill to Level 1
    fireEvent.click(screen.getByText("Drill"))
    expect(screen.getByTestId("probe-nav-level").textContent).toBe("1")

    // Escape navigates back to Level 0
    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.getByTestId("probe-nav-level").textContent).toBe("0")
  })

  it("suppresses keyboard shortcuts when user is focused inside a text input", () => {
    render(<TestRig />)

    const searchInput = screen.getByPlaceholderText(/Search curves/i)
    searchInput.focus()

    // Typing Space or L into input must NOT trigger play or loop
    fireEvent.keyDown(searchInput, { key: " " })
    expect(screen.getByTestId("probe-playing").textContent).toBe("false")

    fireEvent.keyDown(searchInput, { key: "l" })
    expect(screen.getByTestId("probe-looping").textContent).toBe("false")

    fireEvent.keyDown(searchInput, { key: "s" })
    expect(screen.getByTestId("probe-solo").textContent).toBe("false")
  })
})
