import * as React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { StudioUiProvider } from "@/components/studio/studio-ui-context"
import { ToastStackHabitat } from "@/components/studio/habitats/disclosure/toast-stack-habitat"
import { SegmentedTabsHabitat } from "@/components/studio/habitats/controls/segmented-tabs-habitat"
import { ShimmerCtaHabitat } from "@/components/studio/habitats/controls/shimmer-cta-habitat"
import { CollapsibleSidebarHabitat } from "@/components/studio/habitats/controls/collapsible-sidebar-habitat"
import { TactileTogglesHabitat } from "@/components/studio/habitats/controls/tactile-toggles-habitat"
import { FloatingInputHabitat } from "@/components/studio/habitats/controls/floating-input-habitat"
import { OtpShakeHabitat } from "@/components/studio/habitats/controls/otp-shake-habitat"
import { WalletDeckHabitat } from "@/components/studio/habitats/disclosure/wallet-deck-habitat"
import { AccordionHabitat } from "@/components/studio/habitats/disclosure/accordion-habitat"
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
  describe("ToastStackHabitat", () => {
    it("renders stacked toasts and responds to Send notification toast trigger", () => {
      render(
        <TestWrapper>
          <ToastStackHabitat />
        </TestWrapper>
      )

      const triggerBtn = screen.getByRole("button", {
        name: /Send notification toast/i,
      })
      expect(triggerBtn).toBeInTheDocument()

      // Stacked toasts are mounted
      expect(screen.getByText("Changes published")).toBeInTheDocument()
      expect(screen.getByText("Event created")).toBeInTheDocument()
      expect(screen.getByText("Invite link copied")).toBeInTheDocument()

      // Click trigger advances or re-triggers toast
      fireEvent.click(triggerBtn)
      expect(screen.getByText("Invite link copied")).toBeInTheDocument()
    })

    it("scrubs toast:fire and validates kinetic transform and opacity interpolation", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <ToastStackHabitat />
      }

      const { container } = render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      // Scrub to 380ms (100% complete)
      act(() => {
        storeApi!.getState().focusTrack("toast:fire")
        storeApi!.getState().seekScoped(380)
      })

      const cards = container.querySelectorAll("[data-toast-slot]")
      expect(cards.length).toBe(3)
      // Slot 0 incoming front card should be at full opacity and translate3d(0px, 0.00px, 0px)
      const frontCard = cards[0] as HTMLElement
      expect(Number(frontCard.style.opacity)).toBeCloseTo(1, 2)
      expect(frontCard.style.transform).toContain(
        "translate3d(0px, 0.00px, 0px)"
      )
    })

    it("supports compareItemId when provided", () => {
      render(
        <TestWrapper>
          <ToastStackHabitat compareItemId="comp-toast-1" />
        </TestWrapper>
      )

      expect(
        screen.getByRole("button", { name: /Send notification toast/i })
      ).toBeInTheDocument()
    })
  })

  describe("SegmentedTabsHabitat", () => {
    it("renders 3 tabs and updates active segment when a tab is selected", () => {
      const { container } = render(
        <TestWrapper>
          <SegmentedTabsHabitat />
        </TestWrapper>
      )

      const overviewTab = screen.getByRole("tab", { name: /Overview tab/i })
      const activityTab = screen.getByRole("tab", { name: /Activity tab/i })
      const settingsTab = screen.getByRole("tab", { name: /Settings tab/i })

      expect(overviewTab).toHaveAttribute("aria-selected", "true")
      expect(activityTab).toHaveAttribute("aria-selected", "false")
      expect(settingsTab).toHaveAttribute("aria-selected", "false")
      expect(
        screen.getByText("3 active deployments · 99.98% uptime")
      ).toBeInTheDocument()

      // Switch to Activity
      fireEvent.click(activityTab)
      expect(activityTab).toHaveAttribute("aria-selected", "true")
      expect(overviewTab).toHaveAttribute("aria-selected", "false")
      expect(
        screen.getByText("2 kinetic presets updated 4m ago")
      ).toBeInTheDocument()

      // Switch to Settings
      fireEvent.click(settingsTab)
      expect(settingsTab).toHaveAttribute("aria-selected", "true")
      expect(
        screen.getByText("Workspace visibility · Private")
      ).toBeInTheDocument()

      // Verify zero CSS transition-* classes on animated elements
      const animatedElements = container.querySelectorAll(
        "[style*='transform'], [style*='opacity']"
      )
      for (const el of Array.from(animatedElements)) {
        const classNames = (el as HTMLElement).className || ""
        expect(classNames).not.toContain("transition-transform")
        expect(classNames).not.toContain("transition-opacity")
        expect(classNames).not.toContain("transition-all")
      }
    })

    it("supports compareItemId when provided", () => {
      render(
        <TestWrapper>
          <SegmentedTabsHabitat compareItemId="comp-tabs-1" />
        </TestWrapper>
      )

      expect(
        screen.getByRole("tab", { name: /Overview tab/i })
      ).toBeInTheDocument()
    })
  })

  describe("ShimmerCtaHabitat", () => {
    it("renders CTA button at rest, responds to click and triggers live animation", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <ShimmerCtaHabitat />
      }

      const { container } = render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      const ctaBtn = screen.getByRole("button", {
        name: "Get started CTA button",
      })
      expect(ctaBtn).toBeInTheDocument()
      expect(screen.getByText("Get Started")).toBeInTheDocument()

      // Click CTA triggers live animation
      fireEvent.click(ctaBtn)
      expect(storeApi!.getState().focusedTrackId).toBe("cta:press")

      // Verify zero CSS transition-* classes on animated elements
      const animatedElements = container.querySelectorAll(
        "[style*='transform'], [style*='opacity']"
      )
      for (const el of Array.from(animatedElements)) {
        const classNames = (el as HTMLElement).className || ""
        expect(classNames).not.toContain("transition-transform")
        expect(classNames).not.toContain("transition-opacity")
        expect(classNames).not.toContain("transition-all")
      }
    })

    it("scrubs cta:press with scale pulse, arrow swap, and shimmer sweep", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <ShimmerCtaHabitat />
      }

      const { container } = render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      const ctaBtn = screen.getByRole("button", {
        name: "Get started CTA button",
      })
      expect(ctaBtn).toBeInTheDocument()

      // Scrub cta:press to 520ms (100% complete)
      act(() => {
        storeApi!.getState().focusTrack("cta:press")
        storeApi!.getState().seekScoped(520)
      })

      // At end, shimmer translated
      const shimmerEl = container.querySelector(
        ".pointer-events-none.absolute.inset-y-0.left-0"
      ) as HTMLElement
      expect(shimmerEl).toBeDefined()
      expect(shimmerEl.style.transform).toContain("translate3d")
    })

    it("supports compareItemId when provided", () => {
      render(
        <TestWrapper>
          <ShimmerCtaHabitat compareItemId="comp-cta-1" />
        </TestWrapper>
      )

      expect(
        screen.getByRole("button", { name: "Get started CTA button" })
      ).toBeInTheDocument()
    })
  })

  describe("CollapsibleSidebarHabitat", () => {
    it("renders compact sidebar rail and expands on toggle click", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <CollapsibleSidebarHabitat />
      }

      const { container } = render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      expect(screen.getByText("S")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Inbox" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Issues" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Cycles" })).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Settings" })
      ).toBeInTheDocument()

      const toggleBtn = screen.getByRole("button", { name: "Expand sidebar" })
      expect(toggleBtn).toBeInTheDocument()

      // Initial clip-path is 56px
      const workspaceEl = container.querySelector(
        ".will-change-\\[clip-path\\]"
      ) as HTMLElement
      expect(workspaceEl).toBeInTheDocument()
      expect(workspaceEl.style.clipPath).toMatch(
        /inset\(0px 0px 0px 54(\.00)?px round 11px\)/
      )

      // Click Expand
      fireEvent.click(toggleBtn)
      expect(storeApi!.getState().focusedTrackId).toBe("sidebar:expand")
      expect(
        screen.getByRole("button", { name: "Collapse sidebar" })
      ).toBeInTheDocument()

      // Verify zero CSS transition-* classes on animated elements
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

    it("scrubs sidebar:expand to reveal labels and glide workspace", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <CollapsibleSidebarHabitat />
      }

      const { container } = render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      const workspaceEl = container.querySelector(
        ".will-change-\\[clip-path\\]"
      ) as HTMLElement

      // Scrub to 380ms (100% of sidebar:expand)
      act(() => {
        storeApi!.getState().focusTrack("sidebar:expand")
        storeApi!.getState().seekScoped(380)
      })

      expect(workspaceEl.style.clipPath).toMatch(
        /inset\(0px 0px 0px 156(\.00)?px round 11px\)/
      )
    })

    it("supports compareItemId when provided", () => {
      render(
        <TestWrapper>
          <CollapsibleSidebarHabitat compareItemId="comp-sidebar-1" />
        </TestWrapper>
      )

      expect(
        screen.getByRole("button", { name: "Expand sidebar" })
      ).toBeInTheDocument()
    })
  })

  describe("TactileTogglesHabitat", () => {
    it("renders switch, checkbox, and favorite buttons at rest and verifies independent toggle activation", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <TactileTogglesHabitat />
      }

      render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      const switchBtn = screen.getByRole("switch", {
        name: /feature switch/i,
      })
      const checkBtn = screen.getByRole("checkbox", {
        name: /task option/i,
      })
      const likeBtn = screen.getByRole("button", {
        name: /Like component/i,
      })

      expect(switchBtn).toBeInTheDocument()
      expect(checkBtn).toBeInTheDocument()
      expect(likeBtn).toBeInTheDocument()

      expect(switchBtn).toHaveAttribute("aria-checked", "false")
      expect(checkBtn).toHaveAttribute("aria-checked", "false")
      expect(likeBtn).toHaveAttribute("aria-pressed", "false")

      // Click switch toggles ONLY switch
      fireEvent.click(switchBtn)
      expect(switchBtn).toHaveAttribute("aria-checked", "true")
      expect(checkBtn).toHaveAttribute("aria-checked", "false")
      expect(likeBtn).toHaveAttribute("aria-pressed", "false")
      expect(storeApi!.getState().focusedTrackId).toBe("toggles:press")
    })

    it("scrubs toggles:press and updates switch thumb, checkmark stroke, and burst ring", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <TactileTogglesHabitat />
      }

      const { container } = render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      act(() => {
        storeApi!.getState().focusTrack("toggles:press")
        storeApi!.getState().seekScoped(260)
      })

      const thumb = container.querySelector(
        ".size-5.rounded-\\[6px\\]"
      ) as HTMLElement
      expect(thumb.style.transform).toMatch(/translate3d\(16(\.\d+)?px/)
    })

    it("supports compareItemId when provided", () => {
      render(
        <TestWrapper>
          <TactileTogglesHabitat compareItemId="comp-toggles-1" />
        </TestWrapper>
      )
      expect(
        screen.getByRole("switch", { name: /feature switch/i })
      ).toBeInTheDocument()
    })
  })

  describe("FloatingInputHabitat", () => {
    it("renders floating input and search trigger, lifts label on focus, and keeps search collapsed", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <FloatingInputHabitat />
      }

      const { container } = render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      const input = screen.getByLabelText("Workspace name")
      const searchBtn = screen.getByRole("button", {
        name: "Expand search bar",
      })
      const searchWrap = container.querySelector(
        ".will-change-\\[clip-path\\]"
      ) as HTMLElement

      expect(input).toBeInTheDocument()
      expect(searchBtn).toBeInTheDocument()
      expect(searchWrap.style.clipPath).toMatch(
        /inset\(0px 0px 0px 204(\.00)?px round 10px\)/
      )

      // Focus floating input lifts label and does NOT expand search
      fireEvent.focus(input)
      expect(storeApi!.getState().focusedTrackId).toBe("input:focus")
      expect(searchWrap.style.clipPath).toMatch(
        /inset\(0px 0px 0px 204(\.00)?px round 10px\)/
      )

      fireEvent.blur(input)
      expect(storeApi!.getState().focusedTrackId).toBe("input:blur")

      // Toggle search expands search bar
      fireEvent.click(searchBtn)
      expect(
        screen.getByRole("button", { name: "Collapse search bar" })
      ).toBeInTheDocument()
    })

    it("scrubs input:focus and evaluates label lift and search clip-path", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <FloatingInputHabitat />
      }

      const { container } = render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      const label = screen.getByText("Workspace name")
      const searchWrap = container.querySelector(
        ".will-change-\\[clip-path\\]"
      ) as HTMLElement

      act(() => {
        storeApi!.getState().focusTrack("input:focus")
        storeApi!.getState().seekScoped(300)
      })

      expect(label.style.transform).toMatch(
        /translate3d\(0px, -1[01](\.\d+)?px, 0px\)/
      )
      expect(label.style.transform).toContain("scale(0.78")
      expect(searchWrap.style.clipPath).toMatch(
        /inset\(0px 0px 0px 0(\.00)?px round 10px\)/
      )
    })

    it("supports compareItemId when provided", () => {
      render(
        <TestWrapper>
          <FloatingInputHabitat compareItemId="comp-input-1" />
        </TestWrapper>
      )
      expect(screen.getByLabelText("Workspace name")).toBeInTheDocument()
    })
  })

  describe("OtpShakeHabitat", () => {
    it("renders empty verification code input with 4 visual slots", () => {
      render(
        <TestWrapper>
          <OtpShakeHabitat />
        </TestWrapper>
      )

      const input = screen.getByLabelText("Verification code input")
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue("")

      const verifyBtn = screen.getByRole("button", {
        name: "Verify code",
      })
      expect(verifyBtn).toHaveTextContent("Verify Code")
    })

    it("handles typing 1234 and transitions to verified", () => {
      render(
        <TestWrapper>
          <OtpShakeHabitat />
        </TestWrapper>
      )

      const input = screen.getByLabelText("Verification code input")
      fireEvent.change(input, { target: { value: "1234" } })

      expect(input).toHaveValue("1234")
      expect(
        screen.getByRole("button", { name: "Verify code" })
      ).toHaveTextContent("Verified")
    })

    it("handles typing, backspace editing, and paste", () => {
      render(
        <TestWrapper>
          <OtpShakeHabitat />
        </TestWrapper>
      )

      const input = screen.getByLabelText("Verification code input")

      // Typing 9999
      fireEvent.change(input, { target: { value: "9999" } })
      expect(input).toHaveValue("9999")

      // Backspace editing to 999
      fireEvent.change(input, { target: { value: "999" } })
      expect(input).toHaveValue("999")

      // Paste 5678
      fireEvent.change(input, { target: { value: "5678" } })
      expect(input).toHaveValue("5678")
    })

    it("scrubs otp:verify at 50% progress and evaluates lateral shake", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <OtpShakeHabitat />
      }

      const { container } = render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      act(() => {
        storeApi!.getState().focusTrack("otp:verify")
        storeApi!.getState().seekScoped(190) // 50% of 380ms
      })

      const row = container.querySelector(
        ".will-change-transform"
      ) as HTMLElement
      expect(row.style.transform).toMatch(
        /translate3d\(-?[0-9.]+px, 0px, 0px\)/
      )
    })

    it("supports compareItemId when provided", () => {
      render(
        <TestWrapper>
          <OtpShakeHabitat compareItemId="comp-otp-1" />
        </TestWrapper>
      )
      expect(
        screen.getByLabelText("Verification code input")
      ).toBeInTheDocument()
    })
  })

  describe("WalletDeckHabitat", () => {
    it("renders wallet card deck and shuffles cards forward", () => {
      const { container } = render(
        <TestWrapper>
          <WalletDeckHabitat />
        </TestWrapper>
      )

      expect(screen.getByText("Satisium Core")).toBeInTheDocument()
      expect(screen.getByText("Kinetic Lab")).toBeInTheDocument()
      expect(screen.getByText("Spring Physics")).toBeInTheDocument()
      expect(screen.getByText("01 / 03")).toBeInTheDocument()

      const nextBtn = screen.getByRole("button", { name: /Next card slide/i })
      expect(nextBtn).toBeInTheDocument()

      // Click next card slide advances
      fireEvent.click(nextBtn)
      expect(screen.getByText("02 / 03")).toBeInTheDocument()

      // Click card itself also advances
      const cards = container.querySelectorAll("[data-card-slot]")
      expect(cards.length).toBe(3)
      fireEvent.click(cards[0])
      expect(screen.getByText("03 / 03")).toBeInTheDocument()
    })

    it("scrubs carousel:slide with lateral arc shuffle and depth promotion", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <WalletDeckHabitat />
      }

      const { container } = render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      // Scrub carousel:slide to 240ms (50% apex lateral sweep)
      act(() => {
        storeApi!.getState().focusTrack("carousel:slide")
        storeApi!.getState().seekScoped(240)
      })

      const cards = container.querySelectorAll("[data-card-slot]")
      expect(cards.length).toBe(3)
      const frontCard = cards[0] as HTMLElement
      expect(frontCard.style.transform).toContain("translate3d")

      // Scrub to 480ms (100% complete)
      act(() => {
        storeApi!.getState().seekScoped(480)
      })
      expect(frontCard.style.transform).toContain("scale(0.8800)")
    })

    it("supports compareItemId when provided", () => {
      render(
        <TestWrapper>
          <WalletDeckHabitat compareItemId="comp-carousel-1" />
        </TestWrapper>
      )

      expect(
        screen.getByRole("button", { name: /Next card slide/i })
      ).toBeInTheDocument()
    })
  })

  describe("AccordionHabitat", () => {
    it("renders 3 closed FAQ items, expands on click, shifts lower rows, and rotates icon", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <AccordionHabitat />
      }

      const { container } = render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      const q1Btn = screen.getByRole("button", {
        name: "Why use springs over Bézier?",
      })
      const q2Btn = screen.getByRole("button", {
        name: "When does Duration Integrity apply?",
      })
      const q3Btn = screen.getByRole("button", {
        name: "Why animate only transform & opacity?",
      })

      expect(q1Btn).toHaveAttribute("aria-expanded", "false")
      expect(q2Btn).toHaveAttribute("aria-expanded", "false")
      expect(q3Btn).toHaveAttribute("aria-expanded", "false")

      // Click row 0 (Why use springs...)
      fireEvent.click(q1Btn)
      expect(q1Btn).toHaveAttribute("aria-expanded", "true")

      // Scrub to 360ms (100% complete of accordion:open)
      act(() => {
        storeApi!.getState().focusTrack("accordion:open")
        storeApi!.getState().seekScoped(360)
      })

      const cardBgs = container.querySelectorAll("[data-card-bg]")
      const rows = container.querySelectorAll("[data-accordion-row]")
      const icons = container.querySelectorAll("[data-icon]")

      // Row 0 background clipPath expanded to 0.00px
      const cardBg0 = cardBgs[0] as HTMLElement
      expect(cardBg0.style.clipPath).toContain("0.00px 0px round 11px")

      // Lower rows (1 and 2) shifted down by 56px
      const row1 = rows[1] as HTMLElement
      const row2 = rows[2] as HTMLElement
      expect(row1.style.transform).toContain("56.00px")
      expect(row2.style.transform).toContain("56.00px")

      // Icon rotated by 45deg
      const icon0 = icons[0] as HTMLElement
      expect(icon0.style.transform).toBe("rotate(45.0deg)")

      // Verify zero CSS transition-* classes on animated elements
      const animatedElements = container.querySelectorAll(
        "[style*='transform'], [style*='opacity'], [style*='clip-path']"
      )
      for (const el of Array.from(animatedElements)) {
        const classNames = (el as HTMLElement).className || ""
        expect(classNames).not.toContain("transition-transform")
        expect(classNames).not.toContain("transition-all")
      }
    })

    it("handles concurrent row swap when clicking Row 0 then Row 1", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <AccordionHabitat />
      }

      const { container } = render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      const q1Btn = screen.getByRole("button", {
        name: "Why use springs over Bézier?",
      })
      const q2Btn = screen.getByRole("button", {
        name: "When does Duration Integrity apply?",
      })

      // Click Row 0
      fireEvent.click(q1Btn)
      expect(q1Btn).toHaveAttribute("aria-expanded", "true")

      // Now click Row 1 while Row 0 is open -> concurrent swap!
      fireEvent.click(q2Btn)
      expect(q2Btn).toHaveAttribute("aria-expanded", "true")
      expect(q1Btn).toHaveAttribute("aria-expanded", "false")

      // Scrub to halfway (180ms)
      act(() => {
        storeApi!.getState().focusTrack("accordion:open")
        storeApi!.getState().seekScoped(180)
      })

      const cardBgs = container.querySelectorAll("[data-card-bg]")
      const cardBg0 = cardBgs[0] as HTMLElement
      const cardBg1 = cardBgs[1] as HTMLElement

      // Both Row 0 and Row 1 are animating concurrently
      expect(cardBg0.style.clipPath).toBeDefined()
      expect(cardBg1.style.clipPath).toBeDefined()

      // At end of accordion:open (360ms)
      act(() => {
        storeApi!.getState().seekScoped(360)
      })

      // Row 1 fully open (clipPath 0.00px), Row 0 fully closed (clipPath 56.00px)
      expect(cardBg1.style.clipPath).toContain("0.00px 0px round 11px")
      expect(cardBg0.style.clipPath).toContain("56.00px 0px round 11px")
    })

    it("supports compareItemId when provided", () => {
      render(
        <TestWrapper>
          <AccordionHabitat compareItemId="comp-accordion-1" />
        </TestWrapper>
      )

      expect(
        screen.getByRole("button", { name: "Why use springs over Bézier?" })
      ).toBeInTheDocument()
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

      // Check preview theater section and initial Primitives habitat
      expect(
        screen.getByRole("region", { name: /Component Preview Theater/i })
      ).toBeInTheDocument()
      expect(
        screen.getByTestId("primitive-position-wrapper")
      ).toBeInTheDocument()
    })

    it("switches cleanly between component habitats when focusedTrack changes", () => {
      function SwitchController() {
        const store = useEaseStoreApi()
        return (
          <div>
            <button onClick={() => store.getState().focusTrack("dialog:open")}>
              Switch to Dialog
            </button>
            <button onClick={() => store.getState().focusTrack("button:press")}>
              Switch to Button
            </button>
            <button onClick={() => store.getState().focusTrack("toast:fire")}>
              Switch to Toast
            </button>
            <button onClick={() => store.getState().focusTrack("tabs:switch")}>
              Switch to Tabs
            </button>
            <button onClick={() => store.getState().focusTrack("cta:press")}>
              Switch to CTA
            </button>
            <button
              onClick={() => store.getState().focusTrack("sidebar:expand")}
            >
              Switch to Sidebar
            </button>
            <button
              onClick={() => store.getState().focusTrack("toggles:press")}
            >
              Switch to Toggles
            </button>
            <button onClick={() => store.getState().focusTrack("input:focus")}>
              Switch to Input
            </button>
            <button onClick={() => store.getState().focusTrack("otp:verify")}>
              Switch to OTP
            </button>
            <button
              onClick={() => store.getState().focusTrack("carousel:slide")}
            >
              Switch to Carousel
            </button>
            <button
              onClick={() => store.getState().focusTrack("accordion:open")}
            >
              Switch to Accordion
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

      // Initially Primitives
      expect(
        screen.getByTestId("primitive-position-wrapper")
      ).toBeInTheDocument()

      // Switch to Dialog
      fireEvent.click(screen.getByText("Switch to Dialog"))
      expect(
        screen.getByRole("button", { name: /Open modal dialog/i })
      ).toBeInTheDocument()

      // Switch to Button
      fireEvent.click(screen.getByText("Switch to Button"))
      expect(
        screen.getByRole("button", { name: /Deploy changes status button/i })
      ).toBeInTheDocument()

      // Switch to Toast
      fireEvent.click(screen.getByText("Switch to Toast"))
      expect(
        screen.getByRole("button", { name: /Send notification toast/i })
      ).toBeInTheDocument()

      // Switch to Tabs
      fireEvent.click(screen.getByText("Switch to Tabs"))
      expect(
        screen.getByRole("tab", { name: /Overview tab/i })
      ).toBeInTheDocument()

      // Switch to CTA
      fireEvent.click(screen.getByText("Switch to CTA"))
      expect(
        screen.getByRole("button", { name: /Get started CTA button/i })
      ).toBeInTheDocument()

      // Switch to Sidebar
      fireEvent.click(screen.getByText("Switch to Sidebar"))
      expect(
        screen.getByRole("button", { name: /Expand sidebar/i })
      ).toBeInTheDocument()

      // Switch to Toggles
      fireEvent.click(screen.getByText("Switch to Toggles"))
      expect(
        screen.getByRole("switch", { name: /feature switch/i })
      ).toBeInTheDocument()

      // Switch to Input
      fireEvent.click(screen.getByText("Switch to Input"))
      expect(screen.getByLabelText(/Workspace name/i)).toBeInTheDocument()

      // Switch to OTP
      fireEvent.click(screen.getByText("Switch to OTP"))
      expect(
        screen.getByRole("button", { name: /Verify code/i })
      ).toBeInTheDocument()

      // Switch to Carousel
      fireEvent.click(screen.getByText("Switch to Carousel"))
      expect(screen.getByText("Satisium Core")).toBeInTheDocument()

      // Switch to Accordion
      fireEvent.click(screen.getByText("Switch to Accordion"))
      expect(
        screen.getByRole("button", { name: "Why use springs over Bézier?" })
      ).toBeInTheDocument()
    })

    it("renders PrimitivesXRay without duplicate filter bar when focusedTrack is primitives:all", () => {
      function PrimitivesController() {
        const store = useEaseStoreApi()
        return (
          <div>
            <button
              onClick={() => {
                store.getState().focusTrack("primitives:all")
              }}
            >
              Switch to Primitives
            </button>
            <button
              onClick={() => {
                store.getState().focusChannel("position")
              }}
            >
              Isolate Position
            </button>
          </div>
        )
      }

      render(
        <TestWrapper>
          <PrimitivesController />
          <HabitatStage />
        </TestWrapper>
      )

      // Switch to primitives
      fireEvent.click(screen.getByText("Switch to Primitives"))

      // Primitives 4-panel nodes are rendered
      expect(
        screen.getByTestId("primitive-position-wrapper")
      ).toBeInTheDocument()
      expect(screen.getByTestId("primitive-scale-node")).toBeInTheDocument()
      expect(screen.getByTestId("primitive-opacity-node")).toBeInTheDocument()
      expect(screen.getByTestId("primitive-rotate-node")).toBeInTheDocument()

      // Internal filter pill buttons (e.g. "Filter position primitive") are NOT rendered (zero duplicate bars!)
      expect(screen.queryByLabelText("Filter position primitive")).toBeNull()

      // Isolate Position channel
      fireEvent.click(screen.getByText("Isolate Position"))
      expect(
        screen.getByTestId("primitive-position-wrapper")
      ).toBeInTheDocument()
      expect(screen.queryByTestId("primitive-scale-node")).toBeNull()
      expect(screen.queryByTestId("primitive-opacity-node")).toBeNull()
      expect(screen.queryByTestId("primitive-rotate-node")).toBeNull()
    })
  })
})
