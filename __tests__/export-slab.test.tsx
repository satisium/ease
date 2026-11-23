import * as React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { ExportSlab } from "@/components/studio/modes/audition/right-flank/export-slab"
import { EaseStoreProvider, useEaseStore } from "@/hooks/use-ease-store"
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

vi.mock("@/hooks/use-mounted", () => ({
  useMounted: () => true,
}))

function ExportProbe() {
  const isExportOpen = useEaseStore((s) => s.isExportOpen)
  return <div data-testid="export-state">{String(isExportOpen)}</div>
}

function ExportSlabTestRig() {
  return (
    <EaseStoreProvider>
      <ExportProbe />
      <ExportSlab />
    </EaseStoreProvider>
  )
}

describe("ExportSlab (System Utility Row)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentResolvedTheme = "dark"
  })

  it("renders export button and theme toggle with correct tokens and labels", () => {
    render(<ExportSlabTestRig />)
    const exportBtn = screen.getByRole("button", {
      name: /Export kinetic curve code/i,
    })
    expect(exportBtn).toBeDefined()
    expect(screen.getByText("Export")).toBeDefined()
    expect(screen.getByText("⌘E")).toBeDefined()

    const themeToggleBtn = screen.getByRole("button", {
      name: /Toggle Color Theme/i,
    })
    expect(themeToggleBtn).toBeDefined()
    expect(themeToggleBtn.className).toContain("rounded-[16px]")
    expect(themeToggleBtn.className).toContain("size-10")
  })

  it("triggers switchThemeWithTransition with fade variant when theme toggle button is clicked", () => {
    const switchSpy = vi.spyOn(themeTransition, "switchThemeWithTransition")

    render(<ExportSlabTestRig />)
    const toggleButton = screen.getByRole("button", {
      name: /Toggle Color Theme/i,
    })
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

    render(<ExportSlabTestRig />)
    const toggleButton = screen.getByRole("button", {
      name: /Toggle Color Theme/i,
    })
    fireEvent.click(toggleButton)

    expect(switchSpy).toHaveBeenCalledTimes(1)
    expect(switchSpy).toHaveBeenCalledWith(
      mockSetTheme,
      "dark",
      expect.anything(),
      "fade"
    )
  })

  it("triggers open export modal when export button is clicked", () => {
    render(<ExportSlabTestRig />)
    const exportBtn = screen.getByRole("button", {
      name: /Export kinetic curve code/i,
    })
    expect(screen.getByTestId("export-state").textContent).toBe("false")
    fireEvent.click(exportBtn)
    expect(screen.getByTestId("export-state").textContent).toBe("true")
  })
})
