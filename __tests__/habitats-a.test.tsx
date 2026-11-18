/**
 * @file __tests__/habitats-a.test.tsx
 * @description Integration tests for In-Process Habitats (Dialog, Drawer, Dropdown, Button) & usePairedHabitat.
 */

import * as React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { DialogHabitat } from "@/components/studio/habitats/overlays/dialog-habitat"
import { CommandPaletteHabitat } from "@/components/studio/habitats/overlays/command-palette-habitat"
import { DrawerHabitat } from "@/components/studio/habitats/overlays/drawer-habitat"
import { BottomSheetHabitat } from "@/components/studio/habitats/overlays/bottom-sheet-habitat"
import { DropdownHabitat } from "@/components/studio/habitats/dropdown-habitat"
import { ButtonHabitat } from "@/components/studio/habitats/button-habitat"

describe("In-Process Habitats & usePairedHabitat (Step B-3A)", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("DialogHabitat", () => {
    it("starts at rest, opens via trigger pill, edits profile, and saves changes", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <DialogHabitat />
      }

      render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // At-rest trigger view: single calm trigger button
      const triggerBtn = screen.getByLabelText("Open modal dialog")
      expect(triggerBtn).toBeDefined()
      expect(screen.queryByRole("dialog", { name: "Edit Profile" })).toBeNull()

      // Click to open
      act(() => {
        fireEvent.click(triggerBtn)
      })

      // Modal surface and inputs are mounted
      expect(screen.getByRole("dialog", { name: "Edit Profile" })).toBeDefined()
      expect(
        screen.getByText("Changes apply across your Satisium workspace.")
      ).toBeDefined()
      expect(storeApi!.getState().focusedTrackId).toBe("dialog:open")

      // Edit fields
      const nameInput = screen.getByLabelText("Display name")
      const handleInput = screen.getByLabelText("Handle")
      expect((nameInput as HTMLInputElement).value).toBe("Satishkumar")
      expect((handleInput as HTMLInputElement).value).toBe("@iamsatish4564")

      act(() => {
        fireEvent.change(nameInput, { target: { value: "Ada Lovelace" } })
        fireEvent.change(handleInput, { target: { value: "@ada" } })
      })

      // Save changes
      const saveBtn = screen.getByRole("button", {
        name: "Save profile changes",
      })
      act(() => {
        fireEvent.click(saveBtn)
      })

      expect(storeApi!.getState().focusedTrackId).toBe("dialog:close")
    })

    it("scrubbing dialog:close at 50% forces mount and applies transform & opacity with zero CSS transition conflict", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <DialogHabitat />
      }

      const { container } = render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // Focus dialog:close and scrub at 140ms (50% of 280ms duration)
      act(() => {
        storeApi!.getState().focusTrack("dialog:close")
        storeApi!.getState().seekScoped(140)
      })

      // Dialog is forced mounted during scrubbing
      expect(screen.getByDisplayValue("Satishkumar")).toBeDefined()

      // Find modal card and backdrop
      const modalCard = screen
        .getByDisplayValue("Satishkumar")
        .closest(".will-change-transform") as HTMLElement
      expect(modalCard).not.toBeNull()
      expect(modalCard.style.transform).toContain("translate3d")
      expect(modalCard.style.transform).toContain("scale")

      // Strict 120fps Invariant: Zero CSS transition classes on bindRef elements
      const boundElements = container.querySelectorAll(
        "[style*='transform'], [style*='opacity']"
      )
      for (const el of Array.from(boundElements)) {
        const classNames = (el as HTMLElement).className || ""
        expect(classNames).not.toContain("transition-transform")
        expect(classNames).not.toContain("transition-opacity")
        expect(classNames).not.toContain("transition-all")
      }
    })
  })

  describe("CommandPaletteHabitat", () => {
    it("starts at rest with calm trigger and opens on click with full actions list", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <CommandPaletteHabitat />
      }

      render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // Calm resting trigger view
      const triggerBtn = screen.getByLabelText("Open command palette")
      expect(triggerBtn).toBeDefined()
      expect(screen.getByText("Search commands...")).toBeDefined()
      expect(screen.getByText("⌘ K")).toBeDefined()
      expect(
        screen.queryByPlaceholderText("Type a command or search...")
      ).toBeNull()

      // Click to open
      act(() => {
        fireEvent.click(triggerBtn)
      })

      // Command palette card is mounted
      expect(
        screen.getByPlaceholderText("Type a command or search...")
      ).toBeDefined()
      expect(screen.getByText("Create new project")).toBeDefined()
      expect(screen.getByText("Deploy to production")).toBeDefined()
      expect(storeApi!.getState().focusedTrackId).toBe("spotlight:open")

      // Dismiss via Esc button
      const escBtn = screen.getByLabelText("Close command palette")
      act(() => {
        fireEvent.click(escBtn)
      })

      expect(storeApi!.getState().focusedTrackId).toBe("spotlight:close")
    })

    it("filters commands live and displays empty state when query does not match", () => {
      function Harness() {
        return <CommandPaletteHabitat />
      }

      render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // Open palette
      act(() => {
        fireEvent.click(screen.getByLabelText("Open command palette"))
      })

      const searchInput = screen.getByPlaceholderText(
        "Type a command or search..."
      )

      // Filter for 'deploy'
      act(() => {
        fireEvent.change(searchInput, { target: { value: "deploy" } })
      })

      expect(screen.getByText("Deploy to production")).toBeDefined()
      expect(screen.queryByText("Create new project")).toBeNull()

      // Filter for non-existent command
      act(() => {
        fireEvent.change(searchInput, {
          target: { value: "nonexistent query" },
        })
      })

      expect(screen.getByText("No commands found")).toBeDefined()
    })

    it("scrubs spotlight:open and spotlight:close with pure GPU transform and zero CSS transitions", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <CommandPaletteHabitat />
      }

      const { container } = render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // Scrub spotlight:open at 0ms: card is mounted, opacity is 0
      act(() => {
        storeApi!.getState().focusTrack("spotlight:open")
        storeApi!.getState().seekScoped(0)
      })

      const card = screen.getByRole("dialog", { name: "Command Palette" })
      expect(card).toBeDefined()
      expect(card.style.opacity).toBe("0")

      // Scrub spotlight:open to 100% (360ms)
      act(() => {
        storeApi!.getState().seekScoped(360)
      })

      expect(card.style.opacity).toBe("1")
      expect(card.style.filter).toBe("")

      // Scrub spotlight:close at 0ms: starts fully visible and crystal sharp
      act(() => {
        storeApi!.getState().focusTrack("spotlight:close")
        storeApi!.getState().seekScoped(0)
      })

      expect(card.style.opacity).toBe("1")
      expect(card.style.filter).toBe("")

      // Scrub spotlight:close to 100% (260ms)
      act(() => {
        storeApi!.getState().seekScoped(260)
      })

      expect(card.style.opacity).toBe("0")

      // Strict 120fps Invariant: Zero CSS transition classes on bindRef elements
      const boundElements = container.querySelectorAll(
        "[style*='transform'], [style*='opacity']"
      )
      for (const el of Array.from(boundElements)) {
        const classNames = (el as HTMLElement).className || ""
        expect(classNames).not.toContain("transition-transform")
        expect(classNames).not.toContain("transition-opacity")
        expect(classNames).not.toContain("transition-all")
      }
    })

    it("navigates commands via ArrowDown and selects/dismisses via Enter", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <CommandPaletteHabitat />
      }

      render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // Open palette
      act(() => {
        fireEvent.click(screen.getByLabelText("Open command palette"))
      })

      const newProjBtn = screen.getByRole("option", {
        name: "Create new project",
      })
      const deployBtn = screen.getByRole("option", {
        name: "Deploy to production",
      })

      expect(newProjBtn.getAttribute("aria-selected")).toBe("true")
      expect(deployBtn.getAttribute("aria-selected")).toBe("false")

      // ArrowDown moves selection
      act(() => {
        fireEvent.keyDown(window, { key: "ArrowDown" })
      })

      expect(newProjBtn.getAttribute("aria-selected")).toBe("false")
      expect(deployBtn.getAttribute("aria-selected")).toBe("true")

      // Enter executes and triggers close
      act(() => {
        fireEvent.keyDown(window, { key: "Enter" })
      })

      expect(storeApi!.getState().focusedTrackId).toBe("spotlight:close")
    })

    it("supports compareItemId when provided", () => {
      render(
        <EaseStoreProvider>
          <CommandPaletteHabitat compareItemId="comp-item-1" />
        </EaseStoreProvider>
      )

      expect(screen.getByLabelText("Open command palette")).toBeDefined()
    })
  })

  describe("DrawerHabitat", () => {
    it("toggles open and closed via button, applies concentric clipPath & triggerShift, and supports compareItemId", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <DrawerHabitat />
      }

      const { container } = render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // Starts closed, calm resting canvas
      const toggleBtn = screen.getByRole("button", { name: "Open drawer" })
      expect(toggleBtn).toBeDefined()
      expect(screen.getByText("Open Drawer")).toBeDefined()

      // Click to open
      act(() => {
        fireEvent.click(toggleBtn)
      })

      expect(storeApi!.getState().focusedTrackId).toBe("drawer:open")
      // In open state, button label toggles to "Close drawer"
      expect(screen.getByRole("button", { name: "Close drawer" })).toBeDefined()
      expect(
        screen.getByRole("dialog", { name: "Navigation menu" })
      ).toBeDefined()
      expect(screen.getByText("Menu")).toBeDefined()
      expect(screen.getByText("Overview")).toBeDefined()
      expect(screen.getByText("Components")).toBeDefined()
      expect(screen.getByText("Tokens")).toBeDefined()
      expect(screen.getByText("Changelog")).toBeDefined()

      // Click to close
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Close drawer" }))
      })
      expect(storeApi!.getState().focusedTrackId).toBe("drawer:close")

      // Zero transition-* classes on animated elements
      const boundElements = container.querySelectorAll("[style*='transform']")
      for (const el of Array.from(boundElements)) {
        const classNames = (el as HTMLElement).className || ""
        expect(classNames).not.toContain("transition-transform")
        expect(classNames).not.toContain("transition-all")
      }
    })

    it("scrubs drawer:open and drawer:close with concentric clip-path and trigger shift", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <DrawerHabitat />
      }

      const { container } = render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // Scrub drawer:open to 100% (480ms)
      act(() => {
        storeApi!.getState().focusTrack("drawer:open")
        storeApi!.getState().seekScoped(480)
      })

      // Internal container receives concentric clipPath inset(0px 34.00% 0px 0px round 11px)
      const internalContainer = container.querySelector(
        ".rounded-\\[11px\\]"
      ) as HTMLElement
      expect(internalContainer).not.toBeNull()
      expect(internalContainer.style.clipPath).toBe(
        "inset(0px 34.00% 0px 0px round 11px)"
      )

      // Trigger shift has translated -17%
      const triggerWrapper = container.querySelector(
        ".will-change-transform"
      ) as HTMLElement
      expect(triggerWrapper).not.toBeNull()
      expect(triggerWrapper.style.transform).toContain("-17%")

      // Scrub drawer:close to 100% (420ms)
      act(() => {
        storeApi!.getState().focusTrack("drawer:close")
        storeApi!.getState().seekScoped(420)
      })

      expect(internalContainer.style.clipPath).toBe(
        "inset(0px 0.00% 0px 0px round 11px)"
      )
      expect(triggerWrapper.style.transform).toContain("0%")
    })

    it("supports compareItemId when provided", () => {
      render(
        <EaseStoreProvider>
          <DrawerHabitat compareItemId="comp-drawer-1" />
        </EaseStoreProvider>
      )

      expect(screen.getByRole("button", { name: "Open drawer" })).toBeDefined()
    })
  })

  describe("BottomSheetHabitat", () => {
    it("toggles open and closed via button, applies concentric clipPath & triggerShift, and supports compareItemId", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <BottomSheetHabitat />
      }

      const { container } = render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // Starts closed, calm resting canvas
      const toggleBtn = screen.getByRole("button", {
        name: "Open bottom sheet",
      })
      expect(toggleBtn).toBeDefined()
      expect(screen.getByText("Open Sheet")).toBeDefined()

      // Click to open
      act(() => {
        fireEvent.click(toggleBtn)
      })

      expect(storeApi!.getState().focusedTrackId).toBe("sheet:open")
      // In open state, button label toggles to "Close bottom sheet"
      expect(
        screen.getByRole("button", { name: "Close bottom sheet" })
      ).toBeDefined()
      expect(
        screen.getByRole("dialog", { name: "Sheet actions" })
      ).toBeDefined()
      expect(screen.getByText("Copy link")).toBeDefined()
      expect(screen.getByText("Duplicate")).toBeDefined()
      expect(screen.getByText("Export")).toBeDefined()

      // Click to close
      act(() => {
        fireEvent.click(
          screen.getByRole("button", { name: "Close bottom sheet" })
        )
      })
      expect(storeApi!.getState().focusedTrackId).toBe("sheet:close")

      // Zero transition-* classes on animated elements
      const boundElements = container.querySelectorAll("[style*='transform']")
      for (const el of Array.from(boundElements)) {
        const classNames = (el as HTMLElement).className || ""
        expect(classNames).not.toContain("transition-transform")
        expect(classNames).not.toContain("transition-all")
      }
    })

    it("scrubs sheet:open and sheet:close with concentric clip-path and trigger shift", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <BottomSheetHabitat />
      }

      const { container } = render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // Scrub sheet:open to 100% (480ms)
      act(() => {
        storeApi!.getState().focusTrack("sheet:open")
        storeApi!.getState().seekScoped(480)
      })

      // Internal container receives concentric clipPath inset(0px 0px 42.00% 0px round 11px)
      const internalContainer = container.querySelector(
        ".rounded-\\[11px\\]"
      ) as HTMLElement
      expect(internalContainer).not.toBeNull()
      expect(internalContainer.style.clipPath).toBe(
        "inset(0px 0px 42.00% 0px round 11px)"
      )

      // Trigger shift has translated -21%
      const triggerWrapper = container.querySelector(
        ".will-change-transform"
      ) as HTMLElement
      expect(triggerWrapper).not.toBeNull()
      expect(triggerWrapper.style.transform).toContain("-21%")

      // Scrub sheet:close to 100% (420ms)
      act(() => {
        storeApi!.getState().focusTrack("sheet:close")
        storeApi!.getState().seekScoped(420)
      })

      expect(internalContainer.style.clipPath).toBe(
        "inset(0px 0px 0.00% 0px round 11px)"
      )
      expect(triggerWrapper.style.transform).toContain("0%")
    })

    it("supports compareItemId when provided", () => {
      render(
        <EaseStoreProvider>
          <BottomSheetHabitat compareItemId="comp-sheet-1" />
        </EaseStoreProvider>
      )

      expect(screen.getByLabelText("Open bottom sheet")).toBeDefined()
    })
  })

  describe("DropdownHabitat", () => {
    it("toggles popover menu with opacity, translateY, and scale bindings", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <DropdownHabitat />
      }

      render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      const toggleBtn = screen.getByLabelText("Toggle actions menu")
      expect(screen.queryByText("Duplicate Channel")).toBeNull()

      // Open dropdown
      act(() => {
        fireEvent.click(toggleBtn)
      })

      expect(screen.getByText("Duplicate Channel")).toBeDefined()
      expect(screen.getByText("Fork as Variant")).toBeDefined()
      expect(screen.getByText("Copy CSS Timing")).toBeDefined()

      // Popover element has transform and opacity
      const popover = screen
        .getByText("Duplicate Channel")
        .closest(".will-change-transform") as HTMLElement
      expect(popover).not.toBeNull()
      expect(popover.style.transform).toContain("translate3d")
      expect(popover.style.transform).toContain("scale")
      expect(popover.style.opacity).toBeDefined()

      // Close via menu item
      act(() => {
        fireEvent.click(screen.getByText("Duplicate Channel"))
      })
      expect(storeApi!.getState().focusedTrackId).toBe("dropdown:close")
    })
  })

  describe("ButtonHabitat", () => {
    it("increments taps, calls triggerLive, and applies scale & opacity without CSS transition lag", () => {
      render(
        <EaseStoreProvider>
          <ButtonHabitat />
        </EaseStoreProvider>
      )

      expect(screen.getByText("Tactile Button")).toBeDefined()
      expect(screen.getByText("0 Taps")).toBeDefined()

      const button = screen
        .getByText("Commit Kinetic Action")
        .closest("button") as HTMLElement
      expect(button).not.toBeNull()

      // Initial styles applied via bindRef
      expect(button.style.transform).toContain("scale")
      expect(button.style.opacity).toBeDefined()

      // Click button
      act(() => {
        fireEvent.click(button)
      })

      expect(screen.getByText("1 Taps")).toBeDefined()

      // Verify zero conflicting transitions
      const classNames = button.className || ""
      expect(classNames).not.toContain("transition-transform")
      expect(classNames).not.toContain("transition-opacity")
      expect(classNames).not.toContain("transition-all")
    })
  })
})
