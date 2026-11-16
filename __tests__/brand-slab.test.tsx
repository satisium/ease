import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { BrandSlab } from "@/components/studio/common/brand-slab"
import * as themeTransition from "@/lib/theme-transition"

const mockSetTheme = vi.fn()
let currentResolvedTheme = "dark"

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: currentResolvedTheme,
    resolvedTheme: currentResolvedTheme,
    setTheme: mockSetTheme,
  }),
}))

vi.mock("@/components/layout/command-menu", () => ({
  CommandMenuTrigger: (props: React.ComponentProps<"button">) => (
    <button {...props}>Search</button>
  ),
}))

vi.mock("@/hooks/use-mounted", () => ({
  useMounted: () => true,
}))

describe("BrandSlab", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentResolvedTheme = "dark"
  })

  it("renders brand elements and action triggers", () => {
    render(<BrandSlab />)
    expect(screen.getByText("Ease")).toBeDefined()
    expect(screen.getByText("v1.0")).toBeDefined()
    expect(screen.getByLabelText("GitHub Repository")).toBeDefined()
    expect(screen.getByLabelText("Documentation")).toBeDefined()
    expect(screen.getByLabelText("Toggle Color Theme")).toBeDefined()
  })

  it("triggers switchThemeWithTransition with fade variant when theme toggle button is clicked", () => {
    const switchSpy = vi.spyOn(themeTransition, "switchThemeWithTransition")

    render(<BrandSlab />)
    const toggleButton = screen.getByLabelText("Toggle Color Theme")
    fireEvent.click(toggleButton)

    expect(switchSpy).toHaveBeenCalledTimes(1)
    expect(switchSpy).toHaveBeenCalledWith(
      mockSetTheme,
      "light",
      expect.anything(),
      "fade"
    )
  })

  it("switches to dark when currently in light theme", () => {
    currentResolvedTheme = "light"
    const switchSpy = vi.spyOn(themeTransition, "switchThemeWithTransition")

    render(<BrandSlab />)
    const toggleButton = screen.getByLabelText("Toggle Color Theme")
    fireEvent.click(toggleButton)

    expect(switchSpy).toHaveBeenCalledTimes(1)
    expect(switchSpy).toHaveBeenCalledWith(
      mockSetTheme,
      "dark",
      expect.anything(),
      "fade"
    )
  })
})
