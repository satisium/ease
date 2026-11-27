/**
 * @file __tests__/habitats-lifecycle.test.tsx
 * @description Comprehensive lifecycle & solo/single-channel scrub retention tests for overlay habitats.
 */

import * as React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { DialogHabitat } from "@/components/studio/habitats/overlays/dialog-habitat"
import { DrawerHabitat } from "@/components/studio/habitats/overlays/drawer-habitat"
import { DropdownHabitat } from "@/components/studio/habitats/overlays/dropdown-habitat"
import { ToastStackHabitat } from "@/components/studio/habitats/disclosure/toast-stack-habitat"

describe("Overlay Habitats Lifecycle & Scrub Retention (Step C-8A)", () => {
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

  it("1. on dialog:open with All active: at 0ms, Modal Card has opacity '0' with Open Dialog clickable; at 100% (380ms), opacity is '1'", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <DialogHabitat />
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    // Open dialog via trigger button
    const openBtn = screen.getByRole("button", { name: "Open modal dialog" })
    expect(openBtn).toBeDefined()

    act(() => {
      storeApi!.getState().focusTrack("dialog:open")
      storeApi!.getState().focusChannel("all")
      // Seek to 0ms
      storeApi!.getState().seekScoped(0)
    })

    const card = screen.getByRole("dialog", { name: /Edit Profile/i })
    expect(card).toBeDefined()
    // At 0ms entrance, card opacity is 0
    expect(card.style.opacity).toBe("0")

    // Scrub to 100% (380ms)
    act(() => {
      storeApi!.getState().seekScoped(380)
    })

    // At 100% entrance, card opacity is 1
    expect(card.style.opacity).toBe("1")
    expect(card.style.transform).toContain("scale(1)")
  })

  it("2. on dialog:close with All active: at 0ms, Modal Card has opacity '1'; at 100% (280ms), opacity is '0'", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <DialogHabitat />
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    act(() => {
      storeApi!.getState().focusTrack("dialog:close")
      storeApi!.getState().focusChannel("all")
      // Seek to 0ms of Exit
      storeApi!.getState().seekScoped(0)
    })

    const card = screen.getByRole("dialog", { name: /Edit Profile/i })
    expect(card).toBeDefined()
    // At 0ms exit, card starts fully visible (opacity 1) with crystal sharp filter (zero blur layer)
    expect(card.style.opacity).toBe("1")
    expect(card.style.filter).toBe("")

    // Scrub to 50% of exit (140ms): zero blur snap throughout exit
    act(() => {
      storeApi!.getState().seekScoped(140)
    })
    expect(card.style.filter).toBe("")

    // Scrub to 100% of exit (280ms)
    act(() => {
      storeApi!.getState().seekScoped(280)
    })

    // At 100% exit with all channels, opacity returns to 0
    expect(card.style.opacity).toBe("0")

    // Open Dialog button remains calmly mounted in DOM
    const openBtn = screen.getByRole("button", { name: "Open modal dialog" })
    expect(openBtn).toBeDefined()
  })

  it("3. Retention Test (Solo & Single-Channel Scrub): with translateY selected on dialog:close, scrubbing to 100% keeps Edit Profile mounted and visible (style.opacity === '1')", () => {
    let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

    function TestHarness() {
      storeApi = useEaseStoreApi()
      return <DialogHabitat />
    }

    render(
      <EaseStoreProvider>
        <TestHarness />
      </EaseStoreProvider>
    )

    // Focus dialog:close and single-channel translateY (auto-activates Solo) and scrub to 280ms
    act(() => {
      storeApi!.getState().focusTrack("dialog:close")
      storeApi!.getState().focusChannel("translateY")
      storeApi!.getState().seekScoped(280)
    })

    // Retention Guarantee: Edit Profile remains mounted
    const card = screen.getByRole("dialog", { name: /Edit Profile/i })
    expect(card).toBeDefined()

    // Solo sibling lock guarantees non-targeted opacity channel is locked to visible rest state (1)
    expect(card.style.opacity).toBe("1")
    // translateY has scrubbed to 8px
    expect(card.style.transform).toContain("8px")

    // Verify toggling Solo off then back on keeps translateY isolated
    act(() => {
      storeApi!.getState().setSolo(false)
      storeApi!.getState().setSolo(true)
      storeApi!.getState().seekScoped(280)
    })

    expect(storeApi!.getState().isSolo).toBe(true)
    expect(card.style.opacity).toBe("1")
    expect(screen.getByText("Edit Profile")).toBeDefined()
  })

  it("4. Drawer, Dropdown, and Toast habitats keep triggers mounted calmly underneath", () => {
    const { unmount: unmountDrawer } = render(
      <EaseStoreProvider>
        <DrawerHabitat />
      </EaseStoreProvider>
    )
    expect(screen.getByRole("button", { name: "Open drawer" })).toBeDefined()
    unmountDrawer()

    const { unmount: unmountDropdown } = render(
      <EaseStoreProvider>
        <DropdownHabitat />
      </EaseStoreProvider>
    )
    expect(
      screen.getByRole("button", { name: "Toggle actions menu" })
    ).toBeDefined()
    unmountDropdown()

    render(
      <EaseStoreProvider>
        <ToastStackHabitat />
      </EaseStoreProvider>
    )
    expect(
      screen.getByRole("button", { name: "Send notification toast" })
    ).toBeDefined()
  })
})
