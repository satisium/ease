import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { ChannelBinding } from "../../core/schema"
import { getCanonicalPresetById } from "../../core/presets/index"
import { getTrackPlugin } from "../../core/registry/tracks"
import {
  compileChannelExport,
  compileTrackExport,
  exporterRegistry,
  getExporterPlugin,
} from "../../core/registry/exporters"

describe("core/registry/exporters", () => {
  const quartCurve = getCanonicalPresetById("ease-out-quart")!
  const snappyCurve = getCanonicalPresetById("snappy-spring")!

  const bezierChannel: ChannelBinding = {
    id: "translateY",
    label: "Translate Y",
    property: "translateY",
    from: 36,
    to: 0,
    unit: "px",
    durationMs: 280,
    savedBezierDurationMs: 280,
    delayMs: 25,
    springMode: "fit",
    curve: quartCurve,
    semanticContext: {
      roleTitle: "Surface Elevation",
      guidance: "Decelerating vertical translation grounds the dialog.",
      recommendedRangeMs: [240, 360],
      recommendedPresetIds: ["ease-out-quart", "expo-out"],
    },
  }

  const springNaturalChannel: ChannelBinding = {
    id: "scale",
    label: "Scale Pop",
    property: "scale",
    from: 0.9,
    to: 1.0,
    unit: "",
    durationMs: 240,
    savedBezierDurationMs: 240,
    delayMs: 0,
    springMode: "natural",
    curve: snappyCurve,
    semanticContext: {
      roleTitle: "Tactile Scale Pop",
      guidance: "High-stiffness spring with rapid settle.",
      recommendedRangeMs: [200, 300],
      recommendedPresetIds: ["snappy-spring"],
    },
  }

  describe("Registry Engine & Metadata", () => {
    it("has all 4 canonical exporters registered", () => {
      expect(exporterRegistry.list()).toHaveLength(4)
      expect(exporterRegistry.has("css")).toBe(true)
      expect(exporterRegistry.has("tailwind")).toBe(true)
      expect(exporterRegistry.has("motion")).toBe(true)
      expect(exporterRegistry.has("gsap")).toBe(true)
    })

    it("retrieves individual plugins with correct languages", () => {
      expect(getExporterPlugin("css")?.language).toBe("css")
      expect(getExporterPlugin("tailwind")?.language).toBe("html")
      expect(getExporterPlugin("motion")?.language).toBe("tsx")
      expect(getExporterPlugin("gsap")?.language).toBe("ts")
    })
  })

  describe("CSS Exporter", () => {
    it("compiles Bézier channel with duration, cubic-bezier, and delay", () => {
      const code = compileChannelExport("css", bezierChannel)
      expect(code).toContain(
        "transition: transform 280ms cubic-bezier(0.25, 1, 0.5, 1);"
      )
      expect(code).toContain("transition-delay: 25ms;")
    })

    it("compiles Spring channel with native CSS linear(...) syntax", () => {
      const code = compileChannelExport("css", springNaturalChannel)
      expect(code).toContain("transition: transform")
      expect(code).toContain("linear(0,")
      expect(code).not.toContain("cubic-bezier")
    })
  })

  describe("Tailwind Exporter", () => {
    it("compiles Bézier channel into Tailwind arbitrary utility classes", () => {
      const code = compileChannelExport("tailwind", bezierChannel)
      expect(code).toBe(
        "transition-transform duration-[280ms] ease-[cubic-bezier(0.25,1,0.5,1)] delay-[25ms]"
      )
    })

    it("compiles Spring channel replacing raw spaces with underscores for valid syntax", () => {
      const code = compileChannelExport("tailwind", springNaturalChannel)
      expect(code).toContain("transition-transform")
      expect(code).toContain("duration-[")
      expect(code).toContain("ease-[linear(0,")
      // Crucial: no raw spaces inside the linear function brackets
      const start = code.indexOf("ease-[")
      const end = code.indexOf("]", start) + 1
      const easeSnippet = code.slice(start, end)
      expect(easeSnippet).not.toMatch(/\s/)
      expect(easeSnippet).toContain("_")
    })
  })

  describe("Motion (motion/react) Exporter", () => {
    it("compiles Bézier channel with duration and array ease", () => {
      const code = compileChannelExport("motion", bezierChannel)
      expect(code).toBe(
        "transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1], delay: 0.025 }}"
      )
    })

    it("compiles Spring channel with type: 'spring' and exact physical parameters", () => {
      const code = compileChannelExport("motion", springNaturalChannel)
      expect(code).toBe(
        'transition={{ type: "spring", mass: 1, stiffness: 860, damping: 46 }}'
      )
    })
  })

  describe("GSAP Exporter", () => {
    it("compiles Bézier channel with gsap.to and cubic-bezier string", () => {
      const code = compileChannelExport("gsap", bezierChannel)
      expect(code).toContain('gsap.to(".target", {')
      expect(code).toContain(
        'duration: 0.28, ease: "cubic-bezier(0.25,1,0.5,1)", delay: 0.025, overwrite: "auto"'
      )
    })

    it("compiles Spring channel using CustomEase SVG path and NEVER fakes power4.out", () => {
      const code = compileChannelExport("gsap", springNaturalChannel)
      expect(code).toContain("gsap.registerPlugin(CustomEase);")
      expect(code).toContain('CustomEase.create("springEase", "M0,0')
      expect(code).toContain('ease: "springEase"')
      expect(code).toContain('overwrite: "auto"')
      expect(code).not.toContain("power4.out")
    })
  })

  describe("Track Compilation Across All 4 Targets", () => {
    const dialogOpen = getTrackPlugin("dialog:open")!

    it("compiles multi-channel dialog:open track to CSS", () => {
      const code = compileTrackExport("css", dialogOpen)
      expect(code).toContain("/* --- Modal Dialog (Entrance) --- */")
      expect(code).toContain("/* Backdrop Scrim */")
      expect(code).toContain(".dialog-backdrop {")
      expect(code).toContain(".dialog-translateY {")
      expect(code).toContain(".dialog-scale {")
    })

    it("compiles multi-channel dialog:open track to Tailwind", () => {
      const code = compileTrackExport("tailwind", dialogOpen)
      expect(code).toContain("/* Backdrop Scrim */")
      expect(code).toContain(
        "transition-opacity duration-[180ms] ease-[cubic-bezier(0,0,0.2,1)]"
      )
      expect(code).toContain("/* Translate Y */")
      expect(code).toContain(
        "transition-transform duration-[280ms] ease-[cubic-bezier(0.25,1,0.5,1)] delay-[25ms]"
      )
    })

    it("compiles multi-channel dialog:open track to Motion object", () => {
      const code = compileTrackExport("motion", dialogOpen)
      expect(code).toContain("export const dialogOpenTransitions = {")
      expect(code).toContain("backdrop: {")
      expect(code).toContain("translateY: {")
      expect(code).toContain("scale: {")
      expect(code).toContain("} as const")
    })

    it("compiles multi-channel dialog:open track to GSAP", () => {
      const code = compileTrackExport("gsap", dialogOpen)
      expect(code).toContain('import gsap from "gsap";')
      expect(code).toContain('gsap.to(".dialog-backdrop",')
      expect(code).toContain('gsap.to(".dialog-translateY",')
      expect(code).toContain('gsap.to(".dialog-scale",')
    })
  })

  describe("Architectural Purity", () => {
    it("has zero React, DOM, or browser global references in exporters.ts", () => {
      const filePath = resolve(process.cwd(), "core/registry/exporters.ts")
      const rawContent = readFileSync(filePath, "utf-8")
      const codeOnly = rawContent
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*/g, "")

      expect(codeOnly).not.toMatch(/\bwindow\b/)
      expect(codeOnly).not.toMatch(/\bdocument\b/)
      expect(codeOnly).not.toMatch(/\bHTMLElement\b/)
      expect(codeOnly).not.toMatch(/from\s+["']react["']/)
      expect(codeOnly).not.toMatch(/from\s+["']react-dom["']/)
    })
  })
})
