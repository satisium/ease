import * as React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { StudioUiProvider } from "@/components/studio/studio-ui-context"
import { ToastHabitat } from "@/components/studio/habitats/toast-habitat"
import { TabsHabitat } from "@/components/studio/habitats/tabs-habitat"
import { CarouselHabitat } from "@/components/studio/habitats/carousel-habitat"
import { HabitatStage } from "@/components/studio/habitats/habitat-stage"
import { PreviewTheater } from "@/components/studio/modes/audition/center-stage/preview-theater"

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <EaseStoreProvider>
      <StudioUiProvider>{children}</StudioUiProvider>
    </EaseStoreProvider>
  )
}

describe("In-Process Habitats & Preview Theater (Step B-3B)", () => {
  describe("ToastHabitat", () => {
    it("renders trigger at rest and reveals toast on trigger click and dismisses cleanly", () => {
      render(
        <TestWrapper>
          <ToastHabitat />
        </TestWrapper>
      )

      const triggerBtn = screen.getByRole("button", {
        name: /Send notification toast/i,
      })
      expect(triggerBtn).toBeInTheDocument()

      // Toast is initially not mounted
      expect(screen.queryByText("Invite sent")).not.toBeInTheDocument()

      // Fire toast
      fireEvent.click(triggerBtn)
      expect(screen.getByText("Invite sent")).toBeInTheDocument()
      expect(
        screen.getByText("Dispatched to team@satisium.com")
      ).toBeInTheDocument()

      // Dismiss button
      const dismissBtn = screen.getByRole("button", {
        name: /Dismiss notification toast/i,
      })
      expect(dismissBtn).toBeInTheDocument()
      fireEvent.click(dismissBtn)

      expect(screen.queryByText("Invite sent")).not.toBeInTheDocument()
    })
  })

  describe("TabsHabitat", () => {
    it("renders 3 tabs and updates active segment when a tab is selected", () => {
      render(
        <TestWrapper>
          <TabsHabitat />
        </TestWrapper>
      )

      expect(screen.getByText("Segmented Tabs Stage")).toBeInTheDocument()

      const overviewTab = screen.getByRole("tab", { name: /Overview tab/i })
      const metricsTab = screen.getByRole("tab", { name: /Metrics tab/i })
      const settingsTab = screen.getByRole("tab", { name: /Settings tab/i })

      expect(overviewTab).toHaveAttribute("aria-selected", "true")
      expect(metricsTab).toHaveAttribute("aria-selected", "false")
      expect(settingsTab).toHaveAttribute("aria-selected", "false")
      expect(screen.getByText("Surface Architecture")).toBeInTheDocument()

      // Switch to Metrics
      fireEvent.click(metricsTab)
      expect(metricsTab).toHaveAttribute("aria-selected", "true")
      expect(overviewTab).toHaveAttribute("aria-selected", "false")
      expect(screen.getByText("Kinetic Telemetry")).toBeInTheDocument()

      // Switch to Settings
      fireEvent.click(settingsTab)
      expect(settingsTab).toHaveAttribute("aria-selected", "true")
      expect(screen.getByText("Dynamic Constraints")).toBeInTheDocument()
    })
  })

  describe("CarouselHabitat", () => {
    it("navigates slides forward and backward cleanly", () => {
      render(
        <TestWrapper>
          <CarouselHabitat />
        </TestWrapper>
      )

      expect(screen.getByText("Media Carousel Stage")).toBeInTheDocument()
      expect(screen.getByText("01 / 03")).toBeInTheDocument()

      const nextBtn = screen.getByRole("button", { name: /Next slide/i })
      const prevBtn = screen.getByRole("button", { name: /Previous slide/i })

      // Next
      fireEvent.click(nextBtn)
      expect(screen.getByText("02 / 03")).toBeInTheDocument()

      // Next again
      fireEvent.click(nextBtn)
      expect(screen.getByText("03 / 03")).toBeInTheDocument()

      // Prev
      fireEvent.click(prevBtn)
      expect(screen.getByText("02 / 03")).toBeInTheDocument()
    })
  })

  describe("HabitatStage & PreviewTheater", () => {
    it("mounts in-process HabitatStage without any iframe sandbox", () => {
      const { container } = render(
        <TestWrapper>
          <PreviewTheater />
        </TestWrapper>
      )

      // Guarantee ZERO <iframe> elements exist in Preview Theater
      const iframes = container.querySelectorAll("iframe")
      expect(iframes.length).toBe(0)

      // Check preview theater section and initial Dialog habitat
      expect(
        screen.getByRole("region", { name: /Component Preview Theater/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /Open modal dialog/i })
      ).toBeInTheDocument()
    })

    it("switches cleanly between component habitats when focusedTrack changes", () => {
      function SwitchController() {
        const store = useEaseStoreApi()
        return (
          <div>
            <button onClick={() => store.getState().focusTrack("button:press")}>
              Switch to Button
            </button>
            <button onClick={() => store.getState().focusTrack("toast:fire")}>
              Switch to Toast
            </button>
            <button onClick={() => store.getState().focusTrack("tabs:switch")}>
              Switch to Tabs
            </button>
            <button
              onClick={() => store.getState().focusTrack("carousel:slide")}
            >
              Switch to Carousel
            </button>
          </div>
        )
      }

      render(
        <TestWrapper>
          <SwitchController />
          <HabitatStage />
        </TestWrapper>
      )

      // Initially Dialog
      expect(
        screen.getByRole("button", { name: /Open modal dialog/i })
      ).toBeInTheDocument()

      // Switch to Button
      fireEvent.click(screen.getByText("Switch to Button"))
      expect(
        screen.getByRole("button", { name: /Commit kinetic action/i })
      ).toBeInTheDocument()

      // Switch to Toast
      fireEvent.click(screen.getByText("Switch to Toast"))
      expect(
        screen.getByRole("button", { name: /Send notification toast/i })
      ).toBeInTheDocument()

      // Switch to Tabs
      fireEvent.click(screen.getByText("Switch to Tabs"))
      expect(screen.getByText("Segmented Tabs Stage")).toBeInTheDocument()

      // Switch to Carousel
      fireEvent.click(screen.getByText("Switch to Carousel"))
      expect(screen.getByText("Media Carousel Stage")).toBeInTheDocument()
    })
  })
})
