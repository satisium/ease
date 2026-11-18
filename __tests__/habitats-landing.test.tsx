import * as React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EaseStoreProvider, useEaseStoreApi } from "@/hooks/use-ease-store"
import { StudioUiProvider } from "@/components/studio/studio-ui-context"
import { HeroRevealHabitat } from "@/components/studio/habitats/landing/hero-reveal-habitat"
import { FlipWordsHabitat } from "@/components/studio/habitats/landing/flip-words-habitat"
import { HabitatStage } from "@/components/studio/habitats/habitat-stage"

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <EaseStoreProvider>
      <StudioUiProvider>{children}</StudioUiProvider>
    </EaseStoreProvider>
  )
}

describe("Landing Flagship Habitats (Step F-4A)", () => {
  describe("HeroRevealHabitat", () => {
    it("renders calm readable arrival at rest, and scrubs hero:reveal", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <HeroRevealHabitat />
      }

      const { container } = render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      const line1 = screen.getByText("Precision motion")
      const line2 = screen.getByText("crafted for interfaces")
      const sub = screen.getByText(
        "Deterministic curves and analytical springs at 120fps."
      )

      expect(line1).toBeInTheDocument()
      expect(line2).toBeInTheDocument()
      expect(sub).toBeInTheDocument()

      // Calm readable rest on initial arrival
      expect(line1.style.transform).toBe("translate3d(0px, 0.00%, 0px)")
      expect(line2.style.transform).toBe("translate3d(0px, 0.00%, 0px)")
      expect(sub.style.opacity).toMatch(/1(\.000)?/)

      const replayBtn = screen.getByRole("button", {
        name: "Replay hero reveal",
      })
      expect(replayBtn).toBeInTheDocument()

      // Click Replay Reveal
      fireEvent.click(replayBtn)

      // Scrub hero:reveal to 0ms (fully masked)
      act(() => {
        storeApi!.getState().focusTrack("hero:reveal")
        storeApi!.getState().seekScoped(0)
      })

      expect(line1.style.transform).toBe("translate3d(0px, 105.00%, 0px)")
      expect(line2.style.transform).toBe("translate3d(0px, 105.00%, 0px)")
      expect(sub.style.opacity).toMatch(/^0(\.000)?$/)

      // Scrub hero:reveal to 860ms (100% settled)
      act(() => {
        storeApi!.getState().seekScoped(860)
      })

      expect(line1.style.transform).toBe("translate3d(0px, 0.00%, 0px)")
      expect(line2.style.transform).toBe("translate3d(0px, 0.00%, 0px)")
      expect(sub.style.opacity).toMatch(/^1(\.000)?$/)

      // Zero CSS transitions
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
          <HeroRevealHabitat compareItemId="comp-hero-1" />
        </TestWrapper>
      )

      expect(
        screen.getByRole("button", { name: "Replay hero reveal" })
      ).toBeInTheDocument()
    })
  })

  describe("FlipWordsHabitat", () => {
    it("renders initial word, advances on Next Word click, and scrubs flipwords:cycle", () => {
      let storeApi: ReturnType<typeof useEaseStoreApi> | undefined

      function Harness() {
        const api = useEaseStoreApi()
        React.useEffect(() => {
          storeApi = api
        }, [api])
        return <FlipWordsHabitat />
      }

      const { container } = render(
        <TestWrapper>
          <Harness />
        </TestWrapper>
      )

      expect(screen.getByText("Design motion that feels")).toBeInTheDocument()
      expect(screen.getByText("effortless")).toBeInTheDocument()

      const nextBtn = screen.getByRole("button", { name: "Cycle flip word" })
      expect(nextBtn).toBeInTheDocument()

      // Advance to next word ("tactile")
      fireEvent.click(nextBtn)
      expect(screen.getByText("tactile")).toBeInTheDocument()

      // Scrub flipwords:cycle to 0ms
      act(() => {
        storeApi!.getState().focusTrack("flipwords:cycle")
        storeApi!.getState().seekScoped(0)
      })

      // Scrub to 460ms (100% complete of cycle)
      act(() => {
        storeApi!.getState().seekScoped(460)
      })

      const inWord = screen.getByText("tactile")
      expect(inWord.style.transform).toContain("translate3d(0px,")
      expect(inWord.style.opacity).toMatch(/^1(\.000)?$/)

      // Zero CSS transitions
      const animatedElements = container.querySelectorAll(
        "[style*='transform'], [style*='opacity'], [style*='filter']"
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
          <FlipWordsHabitat compareItemId="comp-flip-1" />
        </TestWrapper>
      )

      expect(
        screen.getByRole("button", { name: "Cycle flip word" })
      ).toBeInTheDocument()
    })
  })

  describe("HabitatStage Integration", () => {
    it("switches cleanly to hero and flipwords habitats when focusedTrack changes", () => {
      function SwitchController() {
        const store = useEaseStoreApi()
        return (
          <div>
            <button onClick={() => store.getState().focusTrack("hero:reveal")}>
              Switch to Hero
            </button>
            <button
              onClick={() => store.getState().focusTrack("flipwords:cycle")}
            >
              Switch to FlipWords
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

      // Switch to Hero
      fireEvent.click(screen.getByText("Switch to Hero"))
      expect(screen.getByText("Precision motion")).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Replay hero reveal" })
      ).toBeInTheDocument()

      // Switch to FlipWords
      fireEvent.click(screen.getByText("Switch to FlipWords"))
      expect(screen.getByText("Design motion that feels")).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Cycle flip word" })
      ).toBeInTheDocument()
    })
  })
})
