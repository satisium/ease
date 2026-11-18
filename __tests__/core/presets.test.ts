import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  ALL_CANONICAL_PRESETS,
  CANONICAL_BEZIER_PRESETS,
  CANONICAL_SPRING_PRESETS,
  DEFAULT_CUSTOM_CURVES,
  DEFAULT_FALLBACK_CURVE,
  POPULAR_PRESET_IDS,
  getCanonicalPresetById,
} from "../../core/presets/index"

describe("core/presets", () => {
  describe("Completeness & Migration Integrity", () => {
    it("includes required canonical additions: ease-out-quart, linear, and snappy-spring", () => {
      // Ease Out Quart
      const quart = getCanonicalPresetById("ease-out-quart")
      expect(quart).toBeDefined()
      expect(quart?.bezier).toEqual({
        p1: { x: 0.25, y: 1 },
        p2: { x: 0.5, y: 1 },
      })
      expect(quart?.suggestedDurationMs).toBe(280)

      // Linear
      const linear = getCanonicalPresetById("linear")
      expect(linear).toBeDefined()
      expect(linear?.bezier).toEqual({ p1: { x: 0, y: 0 }, p2: { x: 1, y: 1 } })

      // Expo Out calibrated to (0.16, 1, 0.3, 1)
      const expoOut = getCanonicalPresetById("expo-out")
      expect(expoOut).toBeDefined()
      expect(expoOut?.bezier).toEqual({
        p1: { x: 0.16, y: 1 },
        p2: { x: 0.3, y: 1 },
      })

      // Snappy Spring benchmark (m=1, k=860, c=46)
      const snappy = getCanonicalPresetById("snappy-spring")
      expect(snappy).toBeDefined()
      expect(snappy?.spring).toEqual({
        mass: 1,
        stiffness: 860,
        damping: 46,
        velocity: 0,
      })
      expect(snappy?.suggestedDurationMs).toBe(240)

      // Signature Studio Curves: iOS Sheet & Quint Out
      const iosSheet = getCanonicalPresetById("ios-sheet")
      expect(iosSheet).toBeDefined()
      expect(iosSheet?.name).toBe("iOS Sheet")
      expect(iosSheet?.bezier).toEqual({
        p1: { x: 0.32, y: 0.72 },
        p2: { x: 0, y: 1 },
      })
      expect(iosSheet?.category).toBe("Entrances & Decel")
      expect(iosSheet?.suggestedDurationMs).toBe(360)

      const quintOut = getCanonicalPresetById("quint-out")
      expect(quintOut).toBeDefined()
      expect(quintOut?.name).toBe("Quint Out")
      expect(quintOut?.bezier).toEqual({
        p1: { x: 0.22, y: 1 },
        p2: { x: 0.36, y: 1 },
      })
      expect(quintOut?.category).toBe("Entrances & Decel")
      expect(quintOut?.suggestedDurationMs).toBe(220)

      expect(POPULAR_PRESET_IDS).toContain("ios-sheet")
      expect(POPULAR_PRESET_IDS).toContain("quint-out")
    })

    it("has exact counts: 35 Béziers and 26 Springs (61 total)", () => {
      expect(CANONICAL_BEZIER_PRESETS).toHaveLength(35)
      expect(CANONICAL_SPRING_PRESETS).toHaveLength(26)
      expect(ALL_CANONICAL_PRESETS).toHaveLength(61)
    })
  })

  describe("Schema Invariants for Every Canonical Preset", () => {
    it("ensures unique IDs across the entire catalog", () => {
      const ids = ALL_CANONICAL_PRESETS.map((p) => p.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it("ensures every preset has valid mathematical bounds and duration", () => {
      for (const preset of ALL_CANONICAL_PRESETS) {
        // Bézier handle bounds
        expect(preset.bezier.p1.x).toBeGreaterThanOrEqual(0)
        expect(preset.bezier.p1.x).toBeLessThanOrEqual(1)
        expect(preset.bezier.p2.x).toBeGreaterThanOrEqual(0)
        expect(preset.bezier.p2.x).toBeLessThanOrEqual(1)
        expect(Number.isFinite(preset.bezier.p1.y)).toBe(true)
        expect(Number.isFinite(preset.bezier.p2.y)).toBe(true)

        // Spring physical parameters
        expect(preset.spring.mass).toBeGreaterThan(0)
        expect(preset.spring.stiffness).toBeGreaterThan(0)
        expect(preset.spring.damping).toBeGreaterThanOrEqual(0)
        expect(Number.isFinite(preset.spring.velocity)).toBe(true)

        // Duration & metadata
        expect(preset.suggestedDurationMs).toBeGreaterThan(0)
        expect(preset.name.length).toBeGreaterThan(0)
        expect(preset.category?.length).toBeGreaterThan(0)
        expect(preset.description?.length).toBeGreaterThan(0)
        expect(preset.useCases?.length).toBeGreaterThan(0)
      }
    })

    it("provides valid default fallback curve", () => {
      expect(DEFAULT_FALLBACK_CURVE).toBeDefined()
      expect(DEFAULT_FALLBACK_CURVE.id).toBe("expo-out")
    })
  })

  describe("2-Tier Starter Custom Curves (DEFAULT_CUSTOM_CURVES)", () => {
    it("strictly obeys the max 2-tier Git tree invariant (ZERO nested 3rd-tier flavors)", () => {
      expect(DEFAULT_CUSTOM_CURVES.length).toBeGreaterThanOrEqual(2)

      for (const root of DEFAULT_CUSTOM_CURVES) {
        expect(root.isCustom).toBe(true)
        expect(root.parentId).toBeDefined()
        expect(root.parentName).toBeDefined()

        // Root has variants array
        expect(Array.isArray(root.variants)).toBe(true)
        expect(root.variants?.length).toBeGreaterThan(0)

        // Invariant: no variant may have nested variants
        for (const variant of root.variants ?? []) {
          expect(variant.isCustom).toBe(true)
          expect(variant.parentId).toBe(root.id)
          expect(variant.parentName).toBe(root.name)
          expect(variant.variants?.length ?? 0).toBe(0)
        }
      }
    })

    it("contains modal-sheet (5 variants) and drawer-physics (2 variants)", () => {
      const modalSheet = DEFAULT_CUSTOM_CURVES.find(
        (c) => c.id === "modal-sheet"
      )
      expect(modalSheet).toBeDefined()
      expect(modalSheet?.variants).toHaveLength(5)
      expect(modalSheet?.variants?.map((v) => v.id)).toEqual([
        "modal-sheet-exit",
        "modal-sheet-exit-swift",
        "modal-sheet-expressive",
        "modal-sheet-expressive-high",
        "modal-sheet-subdued",
      ])

      const drawerPhysics = DEFAULT_CUSTOM_CURVES.find(
        (c) => c.id === "drawer-physics"
      )
      expect(drawerPhysics).toBeDefined()
      expect(drawerPhysics?.variants).toHaveLength(2)
      expect(drawerPhysics?.variants?.map((v) => v.id)).toEqual([
        "drawer-physics-cushion",
        "drawer-physics-energetic",
      ])
    })
  })

  describe("Architectural Purity", () => {
    it("has zero React, DOM, or browser global references in core/presets/", () => {
      const files = [
        "bezier-presets.ts",
        "spring-presets.ts",
        "default-customs.ts",
        "index.ts",
      ]

      for (const file of files) {
        const filePath = resolve(process.cwd(), "core/presets", file)
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
