import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { getCanonicalPresetById } from "../../core/presets/index"
import { PluginRegistry } from "../../core/registry/plugin-registry"
import { solverRegistry } from "../../core/registry/solvers"
import {
  getTrackPlugin,
  getTracksForComponent,
  listComponentTracks,
  listComponents,
  trackRegistry,
} from "../../core/registry/tracks"

describe("core/registry", () => {
  describe("PluginRegistry Generic Engine", () => {
    it("supports dynamic registration, querying, listing, and unregistration", () => {
      interface MockPlugin {
        id: string
        version: number
      }

      const registry = new PluginRegistry<MockPlugin>()
      expect(registry.list()).toHaveLength(0)

      registry.register({ id: "alpha", version: 1 })
      expect(registry.has("alpha")).toBe(true)
      expect(registry.get("alpha")?.version).toBe(1)
      expect(registry.list()).toHaveLength(1)

      // Chaining and registerMany
      registry.registerMany([
        { id: "beta", version: 2 },
        { id: "gamma", version: 3 },
      ])
      expect(registry.list()).toHaveLength(3)

      // Unregister
      expect(registry.unregister("beta")).toBe(true)
      expect(registry.has("beta")).toBe(false)
      expect(registry.list()).toHaveLength(2)

      // Clear
      registry.clear()
      expect(registry.list()).toHaveLength(0)
    })
  })

  describe("solverRegistry", () => {
    it("resolves both canonical 'bezier' and 'spring' solvers", () => {
      expect(solverRegistry.has("bezier")).toBe(true)
      expect(solverRegistry.has("spring")).toBe(true)

      const bezierSolver = solverRegistry.get("bezier")
      const springSolver = solverRegistry.get("spring")

      expect(bezierSolver?.label).toBe("Cubic Bézier")
      expect(springSolver?.label).toBe("Analytical ODE Spring")
    })

    it("evaluates curves and computes extremes through registered solvers", () => {
      const quart = getCanonicalPresetById("ease-out-quart")!
      const snappy = getCanonicalPresetById("snappy-spring")!

      const bezierSolver = solverRegistry.get("bezier")!
      const springSolver = solverRegistry.get("spring")!

      // Evaluate Bézier at 140ms / 280ms (halfway)
      const bRes = bezierSolver.evaluate(quart, 140, 280)
      expect(bRes.value).toBeGreaterThan(0.5) // Decelerating curve arrives faster than linear
      expect(bRes.velocity).toBeGreaterThan(0)

      // Bézier Extremes
      const bExtremes = bezierSolver.getExtremes(quart)
      expect(bExtremes.overshootPercent).toBe(0)

      // Evaluate Spring
      const sRes = springSolver.evaluate(snappy, 100, 240)
      expect(sRes.value).toBeGreaterThan(0.5)
      expect(Number.isFinite(sRes.velocity)).toBe(true)

      // Spring Extremes
      const sExtremes = springSolver.getExtremes(snappy, 240)
      expect(sExtremes.overshootPercent).toBeGreaterThan(1.0)
    })
  })

  describe("trackRegistry - All 17 Built-in Transition Tracks", () => {
    const EXPECTED_TRACK_IDS = [
      "dialog:open",
      "dialog:close",
      "drawer:open",
      "drawer:close",
      "sheet:open",
      "sheet:close",
      "dropdown:open",
      "dropdown:close",
      "spotlight:open",
      "spotlight:close",
      "hovercard:open",
      "hovercard:close",
      "button:press",
      "toast:fire",
      "tabs:switch",
      "carousel:slide",
      "primitives:all",
    ] as const

    it("contains exactly the 17 canonical tracks", () => {
      expect(trackRegistry.list()).toHaveLength(17)
      for (const id of EXPECTED_TRACK_IDS) {
        expect(trackRegistry.has(id)).toBe(true)
      }
    })

    it("exports working query helpers (getTrackPlugin, listComponentTracks, getTracksForComponent)", () => {
      // getTrackPlugin
      const dialogOpen = getTrackPlugin("dialog:open")
      expect(dialogOpen).toBeDefined()
      expect(dialogOpen?.componentId).toBe("dialog")
      expect(dialogOpen?.phase).toBe("enter")

      // listComponentTracks excludes 'primitives'
      const componentTracks = listComponentTracks()
      expect(componentTracks).toHaveLength(16)
      expect(componentTracks.every((t) => t.componentId !== "primitives")).toBe(
        true
      )

      // getTracksForComponent
      const dialogTracks = getTracksForComponent("dialog")
      expect(dialogTracks).toHaveLength(2)
      expect(dialogTracks.map((t) => t.id)).toEqual([
        "dialog:open",
        "dialog:close",
      ])

      const spotlightTracks = getTracksForComponent("spotlight")
      expect(spotlightTracks).toHaveLength(2)
      expect(spotlightTracks.map((t) => t.id)).toEqual([
        "spotlight:open",
        "spotlight:close",
      ])

      const sheetTracks = getTracksForComponent("sheet")
      expect(sheetTracks).toHaveLength(2)
      expect(sheetTracks.map((t) => t.id)).toEqual([
        "sheet:open",
        "sheet:close",
      ])

      const drawerTracks = getTracksForComponent("drawer")
      expect(drawerTracks).toHaveLength(2)
      expect(drawerTracks.map((t) => t.id)).toEqual([
        "drawer:open",
        "drawer:close",
      ])

      const hovercardTracks = getTracksForComponent("hovercard")
      expect(hovercardTracks).toHaveLength(2)
      expect(hovercardTracks.map((t) => t.id)).toEqual([
        "hovercard:open",
        "hovercard:close",
      ])
    })

    it("assigns canonical TrackCategory to all tracks and groups listComponents by category", () => {
      // Overlays
      expect(getTrackPlugin("dialog:open")?.category).toBe("Overlays")
      expect(getTrackPlugin("dialog:close")?.category).toBe("Overlays")
      expect(getTrackPlugin("drawer:open")?.category).toBe("Overlays")
      expect(getTrackPlugin("drawer:close")?.category).toBe("Overlays")
      expect(getTrackPlugin("sheet:open")?.category).toBe("Overlays")
      expect(getTrackPlugin("sheet:close")?.category).toBe("Overlays")
      expect(getTrackPlugin("dropdown:open")?.category).toBe("Overlays")
      expect(getTrackPlugin("dropdown:close")?.category).toBe("Overlays")
      expect(getTrackPlugin("spotlight:open")?.category).toBe("Overlays")
      expect(getTrackPlugin("spotlight:close")?.category).toBe("Overlays")
      expect(getTrackPlugin("hovercard:open")?.category).toBe("Overlays")
      expect(getTrackPlugin("hovercard:close")?.category).toBe("Overlays")

      // Controls
      expect(getTrackPlugin("button:press")?.category).toBe("Controls")
      expect(getTrackPlugin("tabs:switch")?.category).toBe("Controls")

      // Disclosure
      expect(getTrackPlugin("toast:fire")?.category).toBe("Disclosure")
      expect(getTrackPlugin("carousel:slide")?.category).toBe("Disclosure")

      // Lab
      expect(getTrackPlugin("primitives:all")?.category).toBe("Lab")

      // listComponents categorization
      const components = listComponents({ includePrimitives: true })
      expect(components.find((c) => c.componentId === "dialog")?.category).toBe(
        "Overlays"
      )
      expect(components.find((c) => c.componentId === "sheet")?.category).toBe(
        "Overlays"
      )
      expect(
        components.find((c) => c.componentId === "spotlight")?.category
      ).toBe("Overlays")
      expect(components.find((c) => c.componentId === "button")?.category).toBe(
        "Controls"
      )
      expect(components.find((c) => c.componentId === "toast")?.category).toBe(
        "Disclosure"
      )
      expect(
        components.find((c) => c.componentId === "primitives")?.category
      ).toBe("Lab")
    })

    it("Strict Integrity Sweep: all channels obey Duration Integrity Law & verified preset IDs", () => {
      const allTracks = trackRegistry.list()

      for (const track of allTracks) {
        expect(track.channels.length).toBeGreaterThan(0)

        for (const channel of track.channels) {
          // Duration Integrity Law
          expect(channel.durationMs).toBeGreaterThan(0)
          expect(channel.savedBezierDurationMs).toBe(channel.durationMs)
          expect(channel.springMode).toBe("fit")

          // Valid curve assigned
          expect(channel.curve).toBeDefined()
          expect(channel.curve.id).toBeDefined()

          // Semantic context validation
          expect(channel.semanticContext.roleTitle.length).toBeGreaterThan(0)
          expect(channel.semanticContext.guidance.length).toBeGreaterThan(0)
          expect(channel.semanticContext.recommendedRangeMs[0]).toBeLessThan(
            channel.semanticContext.recommendedRangeMs[1]
          )
          expect(
            channel.semanticContext.recommendedPresetIds.length
          ).toBeGreaterThan(0)

          // CRITICAL INTEGRITY CHECK:
          // Every recommended preset ID MUST resolve to a real canonical preset
          for (const presetId of channel.semanticContext.recommendedPresetIds) {
            const resolved = getCanonicalPresetById(presetId)
            expect(
              resolved,
              `Channel '${channel.id}' in track '${track.id}' references nonexistent preset '${presetId}'`
            ).toBeDefined()
          }
        }
      }
    })
  })

  describe("Architectural Purity", () => {
    it("has zero React, DOM, or browser global references in core/registry/", () => {
      const files = ["plugin-registry.ts", "solvers.ts", "tracks.ts"]

      for (const file of files) {
        const filePath = resolve(process.cwd(), "core/registry", file)
        const rawContent = readFileSync(filePath, "utf-8")
        const codeOnly = rawContent
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/.*/g, "")

        expect(codeOnly).not.toMatch(/\bwindow\b/)
        expect(codeOnly).not.toMatch(/\bdocument\b/)
        expect(codeOnly).not.toMatch(/\bHTMLElement\b/)
        expect(codeOnly).not.toMatch(/from\s+["']react["']/)
        expect(codeOnly).not.toMatch(/from\s+["']react-dom["']/)
      }
    })
  })
})
