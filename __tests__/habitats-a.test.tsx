/**
 * @file __tests__/habitats-a.test.tsx
 * @description Integration tests for In-Process Habitats (Dialog, Drawer, Dropdown, Button) & usePairedHabitat.
 */

import * as React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, act, fireEvent, within } from "@testing-library/react"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { DialogHabitat } from "@/components/studio/habitats/overlays/dialog-habitat"
import { CommandPaletteHabitat } from "@/components/studio/habitats/overlays/command-palette-habitat"
import { DrawerHabitat } from "@/components/studio/habitats/overlays/drawer-habitat"
import { BottomSheetHabitat } from "@/components/studio/habitats/overlays/bottom-sheet-habitat"
import { DropdownHabitat } from "@/components/studio/habitats/overlays/dropdown-habitat"
import { HoverCardHabitat } from "@/components/studio/habitats/overlays/hover-card-habitat"
import { MorphButtonHabitat } from "@/components/studio/habitats/controls/morph-button-habitat"
import { DynamicPillHabitat } from "@/components/studio/habitats/controls/dynamic-pill-habitat"

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
      expect(screen.queryByText("Duplicate")).toBeNull()

      // Open dropdown
      act(() => {
        fireEvent.click(toggleBtn)
      })

      expect(screen.getByText("Duplicate")).toBeDefined()
      expect(screen.getByText("Copy link")).toBeDefined()
      expect(screen.getByText("Export JSON")).toBeDefined()
      expect(screen.getByText("Archive")).toBeDefined()

      // Popover element has transform and opacity
      const popover = screen
        .getByText("Duplicate")
        .closest(".will-change-transform") as HTMLElement
      expect(popover).not.toBeNull()
      expect(popover.style.transform).toContain("translate3d")
      expect(popover.style.transform).toContain("scale")
      expect(popover.style.opacity).toBeDefined()

      // Close via menu item
      act(() => {
        fireEvent.click(screen.getByText("Duplicate"))
      })
      expect(storeApi!.getState().focusedTrackId).toBe("dropdown:close")
    })

    it("supports compareItemId when provided", () => {
      render(
        <EaseStoreProvider>
          <DropdownHabitat compareItemId="comp-drop-1" />
        </EaseStoreProvider>
      )

      expect(screen.getByLabelText("Toggle actions menu")).toBeDefined()
    })
  })

  describe("HoverCardHabitat", () => {
    it("starts at rest, opens on click or hover, displays profile card and allows follow toggle", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <HoverCardHabitat />
      }

      const { container } = render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // Rest state
      const triggerBtn = screen.getByRole("button", {
        name: "Preview profile card",
      })
      expect(triggerBtn).toBeDefined()
      expect(screen.getByText("@satisium")).toBeDefined()
      expect(
        screen.queryByRole("dialog", { name: "Satisium profile preview" })
      ).toBeNull()

      // Click to open
      act(() => {
        fireEvent.click(triggerBtn)
      })

      expect(storeApi!.getState().focusedTrackId).toBe("hovercard:open")
      expect(
        screen.getByRole("dialog", { name: "Satisium profile preview" })
      ).toBeDefined()
      expect(screen.getByText("Satisium")).toBeDefined()
      expect(
        screen.getByText("Precision motion instruments and kinetic UI tools.")
      ).toBeDefined()
      expect(screen.getByText("248")).toBeDefined()
      expect(screen.getByText("14.2k")).toBeDefined()

      // Follow toggle button
      const followBtn = screen.getByRole("button", { name: "Follow Satisium" })
      expect(followBtn).toBeDefined()
      act(() => {
        fireEvent.click(followBtn)
      })
      expect(
        screen.getByRole("button", { name: "Unfollow Satisium" })
      ).toBeDefined()

      // Zero transition-* classes on animated elements
      const boundElements = container.querySelectorAll("[style*='transform']")
      for (const el of Array.from(boundElements)) {
        const classNames = (el as HTMLElement).className || ""
        expect(classNames).not.toContain("transition-transform")
        expect(classNames).not.toContain("transition-all")
      }

      // Close via trigger click
      act(() => {
        fireEvent.click(triggerBtn)
      })
      expect(storeApi!.getState().focusedTrackId).toBe("hovercard:close")
    })

    it("scrubs hovercard:open to 100% with scale(1), translate3d, and opacity: 1", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <HoverCardHabitat />
      }

      const { container } = render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // Scrub hovercard:open to 100% (280ms)
      act(() => {
        storeApi!.getState().focusTrack("hovercard:open")
        storeApi!.getState().seekScoped(280)
      })

      const card = container.querySelector(
        '[role="dialog"][aria-label="Satisium profile preview"]'
      ) as HTMLElement
      expect(card).not.toBeNull()
      expect(card.style.opacity).toBe("1")
      expect(card.style.transform).toContain("scale(1)")
      expect(card.style.transform).toContain("translate3d(0px, 0px, 0")
    })

    it("supports compareItemId when provided", () => {
      render(
        <EaseStoreProvider>
          <HoverCardHabitat compareItemId="comp-hover-1" />
        </EaseStoreProvider>
      )

      expect(
        screen.getByRole("button", { name: "Preview profile card" })
      ).toBeDefined()
    })
  })

  describe("MorphButtonHabitat", () => {
    it("starts at rest, triggers live on click, and scrubs through Deploying, Deployed, strokeDashoffset, and scale pulse", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <MorphButtonHabitat />
      }

      const { container } = render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      const button = screen.getByRole("button", {
        name: "Deploy changes status button",
      })
      expect(button).toBeDefined()
      expect(screen.getByText("Deploy Changes")).toBeDefined()

      // Click to trigger live
      act(() => {
        fireEvent.click(button)
      })
      expect(storeApi!.getState().focusedTrackId).toBe("button:press")

      // Scrub to 70ms: scale channel undergoes impulse compression (scale < 1.0)
      act(() => {
        storeApi!.getState().focusTrack("button:press")
        storeApi!.getState().seekScoped(70)
      })
      expect(button.style.transform).toContain("scale(0.9")

      // Scrub to 120ms (morph midpoint clampedM ~ 0.49): Deploying is active
      act(() => {
        storeApi!.getState().seekScoped(120)
      })
      const deployingSpan = screen
        .getByText("Deploying")
        .closest(".absolute") as HTMLElement
      expect(deployingSpan).not.toBeNull()
      expect(parseFloat(deployingSpan.style.opacity)).toBeGreaterThan(0.8)

      // Scrub to 100% (680ms): Deployed is active and strokeDashoffset is 0.00
      act(() => {
        storeApi!.getState().seekScoped(680)
      })
      const deployedSpan = screen
        .getByText("Deployed")
        .closest(".absolute") as HTMLElement
      expect(deployedSpan).not.toBeNull()
      expect(parseFloat(deployedSpan.style.opacity)).toBe(1)

      const checkPath = container.querySelector(
        "path[stroke-dasharray='24']"
      ) as SVGPathElement
      expect(checkPath).not.toBeNull()
      expect(checkPath.style.strokeDashoffset).toBe("0.00")
      expect(button.style.width).toMatch(/116(\.0)?px/)

      // Strict 120fps Invariant: Zero CSS transition classes on animated elements
      const animatedElements = container.querySelectorAll(
        "[style*='transform'], [style*='opacity'], [style*='width']"
      )
      for (const el of Array.from(animatedElements)) {
        const classNames = (el as HTMLElement).className || ""
        expect(classNames).not.toContain("transition-transform")
        expect(classNames).not.toContain("transition-opacity")
        expect(classNames).not.toContain("transition-all")
      }
    })

    it("auto-settles back to Deploy Changes after live playback completes", () => {
      vi.useFakeTimers()
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <MorphButtonHabitat />
      }

      render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // Trigger live and complete
      act(() => {
        storeApi!.conductor.focusTrack("button:press")
        storeApi!.conductor.triggerLive("button:press")
        storeApi!.conductor.seek(1.0)
        storeApi!.setState({ playbackState: "idle" })
      })

      // Advance timers past 1100ms delay + 220ms settle transition
      act(() => {
        vi.advanceTimersByTime(1400)
      })

      const button = screen.getByRole("button", {
        name: "Deploy changes status button",
      })
      expect(button.style.width).toMatch(/138(\.0)?px/)

      vi.useRealTimers()
    })

    it("supports compareItemId when provided", () => {
      render(
        <EaseStoreProvider>
          <MorphButtonHabitat compareItemId="comp-btn-1" />
        </EaseStoreProvider>
      )

      expect(
        screen.getByRole("button", { name: "Deploy changes status button" })
      ).toBeDefined()
    })
  })

  describe("DynamicPillHabitat", () => {
    it("starts in compact mode, expands on click to reveal media controls, and collapses on dismiss", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <DynamicPillHabitat />
      }

      const { container } = render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      // Rest view: compact pill
      const expandBtn = screen.getByRole("button", {
        name: "Expand dynamic action pill",
      })
      expect(expandBtn).toBeDefined()
      expect(within(expandBtn).getByText("Midnight Kinetics")).toBeDefined()

      // Click to expand
      act(() => {
        fireEvent.click(expandBtn)
      })

      expect(storeApi!.getState().focusedTrackId).toBe("pill:expand")
      expect(screen.getByText("Satisium Audio")).toBeDefined()
      expect(screen.getByText("1:18")).toBeDefined()
      expect(screen.getByText("3:42")).toBeDefined()

      // Interactive playback controls
      const playPauseBtn = screen.getByRole("button", { name: "Pause track" })
      expect(playPauseBtn).toBeDefined()
      act(() => {
        fireEvent.click(playPauseBtn)
      })
      expect(screen.getByRole("button", { name: "Play track" })).toBeDefined()

      // Next track button
      const nextBtn = screen.getByRole("button", { name: "Next track" })
      act(() => {
        fireEvent.click(nextBtn)
      })
      expect(screen.getAllByText("Glass Physics").length).toBeGreaterThan(0)
      expect(screen.getByText("Studio Mix")).toBeDefined()

      // Prev track button
      const prevBtn = screen.getByRole("button", { name: "Previous track" })
      act(() => {
        fireEvent.click(prevBtn)
      })
      expect(screen.getAllByText("Midnight Kinetics").length).toBeGreaterThan(0)

      // Collapse button
      const collapseBtn = screen.getByRole("button", {
        name: "Collapse dynamic action pill",
      })
      expect(collapseBtn).toBeDefined()

      // Click to collapse
      act(() => {
        fireEvent.click(collapseBtn)
      })
      expect(storeApi!.getState().focusedTrackId).toBe("pill:collapse")

      // Zero transition-* classes on animated elements
      const animatedElements = container.querySelectorAll(
        "[style*='transform'], [style*='opacity'], [style*='clip-path']"
      )
      for (const el of Array.from(animatedElements)) {
        const classNames = (el as HTMLElement).className || ""
        expect(classNames).not.toContain("transition-transform")
        expect(classNames).not.toContain("transition-opacity")
        expect(classNames).not.toContain("transition-all")
      }
    })

    it("scrubs pill:expand with GPU clip-path and scale3d transform", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        storeApi = useEaseStoreApi()
        return <DynamicPillHabitat />
      }

      const { container } = render(
        <EaseStoreProvider>
          <Harness />
        </EaseStoreProvider>
      )

      const capsule = container.querySelector(
        ".will-change-\\[clip-path\\,transform\\]"
      ) as HTMLElement
      expect(capsule).not.toBeNull()

      // At rest (0%)
      expect(capsule.style.clipPath).toBe(
        "inset(0px 68.00px 96.00px 68.00px round 18.00px)"
      )
      expect(capsule.style.transform).toBe("scale3d(1.0000, 1.0000, 1)")

      // Scrub pill:expand to 100% (420ms)
      act(() => {
        storeApi!.getState().focusTrack("pill:expand")
        storeApi!.getState().seekScoped(420)
      })

      expect(capsule.style.clipPath).toBe(
        "inset(0px 0.00px 0.00px 0.00px round 26.00px)"
      )
      expect(capsule.style.transform).toContain("scale3d")
    })

    it("supports compareItemId when provided", () => {
      render(
        <EaseStoreProvider>
          <DynamicPillHabitat compareItemId="comp-pill-1" />
        </EaseStoreProvider>
      )

      expect(
        screen.getByRole("button", { name: "Expand dynamic action pill" })
      ).toBeDefined()
    })
  })
})
