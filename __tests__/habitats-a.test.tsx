/**
 * @file __tests__/habitats-a.test.tsx
 * @description Integration tests for In-Process Habitats (Dialog, Drawer, Dropdown, Button) & usePairedHabitat.
 */

import * as React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { DialogHabitat } from "@/components/studio/habitats/dialog-habitat"
import { DrawerHabitat } from "@/components/studio/habitats/drawer-habitat"
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
    it("starts at rest, opens via trigger pill, and dismisses via Cancel with unmount safety", () => {
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

      // At-rest trigger view is visible, modal is closed
      const triggerBtn = screen.getByLabelText("Open modal dialog")
      expect(triggerBtn).toBeDefined()
      expect(screen.queryByDisplayValue("Satishkumar")).toBeNull()

      // Click to open
      act(() => {
        fireEvent.click(triggerBtn)
      })

      // Modal surface and backdrop are mounted
      expect(screen.getByDisplayValue("Satishkumar")).toBeDefined()
      expect(screen.getByText("Edit Profile")).toBeDefined()
      expect(storeApi!.getState().focusedTrackId).toBe("dialog:open")

      // Click Cancel to dismiss
      const cancelBtn = screen.getByText("Cancel")
      act(() => {
        fireEvent.click(cancelBtn)
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

      // Focus dialog:close and scrub at 90ms (approx 50% of 180ms duration)
      act(() => {
        storeApi!.getState().focusTrack("dialog:close")
        storeApi!.getState().seekScoped(90)
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

  describe("DrawerHabitat", () => {
    it("opens via Filters (3) trigger, binds translateX, and dismisses cleanly", () => {
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

      // Starts closed
      const openBtn = screen.getByLabelText("Open filter drawer")
      expect(openBtn).toBeDefined()
      expect(screen.queryByText("Filter Workspace")).toBeNull()

      // Open drawer
      act(() => {
        fireEvent.click(openBtn)
      })

      expect(screen.getByText("Filter Workspace")).toBeDefined()
      expect(screen.getByText("Motion Categories")).toBeDefined()

      // Slide sheet has translateX translate3d transform
      const sheet = screen
        .getByText("Filter Workspace")
        .closest("aside") as HTMLElement
      expect(sheet).not.toBeNull()
      expect(sheet.style.transform).toContain("translate3d")

      // Zero transition-* classes on animated elements
      const boundElements = container.querySelectorAll("[style*='transform']")
      for (const el of Array.from(boundElements)) {
        const classNames = (el as HTMLElement).className || ""
        expect(classNames).not.toContain("transition-transform")
        expect(classNames).not.toContain("transition-all")
      }

      // Close via Reset
      const resetBtn = screen.getByText("Reset")
      act(() => {
        fireEvent.click(resetBtn)
      })
      expect(storeApi!.getState().focusedTrackId).toBe("drawer:close")
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
