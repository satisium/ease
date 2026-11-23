import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BrandSlab } from "@/components/studio/common/brand-slab"

describe("BrandSlab", () => {
  it("renders pure brand lockup elements and architectural index tab", () => {
    render(<BrandSlab />)
    expect(screen.getByText("Ease")).toBeDefined()
    expect(screen.getByText("v1.0")).toBeDefined()
    expect(screen.getByText("A tool by")).toBeDefined()
    expect(screen.getByText("Satisium")).toBeDefined()
  })
})
