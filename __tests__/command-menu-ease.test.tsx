import { render, screen, fireEvent, act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CommandMenuDialog } from "@/components/layout/command-menu"
import { useCommandStore } from "@/store/use-command-store"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock("next-themes", () => ({
  useTheme: () => ({
    setTheme: vi.fn(),
    theme: "light",
  }),
}))

describe("⌘K Command Menu Ease Integration", () => {
  beforeEach(() => {
    window.localStorage.clear()
    useCommandStore.getState().setIsOpen(false)
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
    if (typeof window.ResizeObserver === "undefined") {
      window.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver
    }
  })

  it("mounts and opens cleanly outside EaseStoreProvider with zero errors", () => {
    render(<CommandMenuDialog />)

    // Open via store (simulating ⌘K)
    act(() => {
      useCommandStore.getState().setIsOpen(true)
    })

    // Dialog is visible
    expect(
      screen.getByPlaceholderText(
        "Search components, categories, or actions..."
      )
    ).toBeDefined()

    // Studio Curves & Components heading is NOT rendered outside EaseStoreProvider
    expect(screen.queryByText("Studio Curves & Components")).toBeNull()

    // System items like Theme are still accessible
    expect(screen.getByText("Light Theme")).toBeDefined()
  })

  it("renders Studio Curves & Components inside EaseStoreProvider, searches and selects curve and track", async () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <CommandMenuDialog />
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    // 1. Open Command Menu via ⌘K
    act(() => {
      useCommandStore.getState().setIsOpen(true)
    })

    // Studio Curves & Components section is rendered
    expect(screen.getByText("Studio Curves & Components")).toBeDefined()

    const input = screen.getByPlaceholderText(
      "Search components, categories, or actions..."
    )

    const initialFocusedTrackId = storeApi!.getState().focusedTrackId
    const initialBindings =
      storeApi!.getState().trackBindings[initialFocusedTrackId] ?? []
    const targetChannel =
      initialBindings.find((b) => b.id === "translateY") ?? initialBindings[0]
    const initialDuration = targetChannel?.durationMs ?? 300

    // 2. Search for "Expo Out"
    act(() => {
      fireEvent.change(input, { target: { value: "Expo Out" } })
    })

    const expoItem = await screen.findByText("Expo Out")
    expect(expoItem).toBeDefined()

    // Click the Expo Out command item
    const expoCommandOption = expoItem.closest('[role="option"]') ?? expoItem
    act(() => {
      fireEvent.click(expoCommandOption)
    })

    // Active focused track should now have "expo-out" applied while honoring Duration Integrity
    const focusedTrackId = storeApi!.getState().focusedTrackId
    const bindings = storeApi!.getState().trackBindings[focusedTrackId] ?? []
    const curveIds = bindings.map((b) => b.curve.id)
    expect(curveIds).toContain("expo-out")
    const updatedChannel =
      bindings.find((b) => b.id === targetChannel?.id) ?? bindings[0]
    expect(updatedChannel?.durationMs).toBe(
      focusedTrackId === "primitives:all" ? 280 : initialDuration
    )

    // Dialog closes on select
    expect(useCommandStore.getState().isOpen).toBe(false)

    // 3. Re-open and search for "Drawer"
    act(() => {
      useCommandStore.getState().setIsOpen(true)
    })

    const freshInput = screen.getByPlaceholderText(
      "Search components, categories, or actions..."
    )
    act(() => {
      fireEvent.change(freshInput, { target: { value: "Drawer" } })
    })

    const drawerItem = await screen.findByText("Drawer Sheet (Entrance)")
    expect(drawerItem).toBeDefined()

    // Click the Drawer command option
    const drawerCommandOption =
      drawerItem.closest('[role="option"]') ?? drawerItem
    act(() => {
      fireEvent.click(drawerCommandOption)
    })

    // focusedTrackId should switch to "drawer:open"
    expect(storeApi!.getState().focusedTrackId).toBe("drawer:open")
    expect(useCommandStore.getState().isOpen).toBe(false)
  })
})
