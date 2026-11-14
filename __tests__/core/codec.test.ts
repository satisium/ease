import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  decodeEaseHash,
  encodeEaseHash,
  UrlHashPayload,
} from "../../core/codec/url-hash"
import {
  deserializeEaseStorage,
  EASE_STORAGE_VERSION,
  migrateLegacyCustomCurves,
  PersistedEaseData,
  serializeEaseStorage,
  StorageAdapter,
} from "../../core/codec/storage"
import { searchEaseCommandCatalog } from "../../core/codec/search"
import { ALL_CANONICAL_PRESETS } from "../../core/presets/index"
import { DEFAULT_CUSTOM_CURVES } from "../../core/presets/default-customs"
import { trackRegistry } from "../../core/registry/tracks"
import { EaseCurve } from "../../core/schema"

describe("core/codec", () => {
  // ==========================================================================
  // 1. URL Hash Codec
  // ==========================================================================
  describe("url-hash", () => {
    it("lossless round-trip for Bézier payload (0.25, 1, 0.5, 1 @ 280ms)", () => {
      const payload: UrlHashPayload = {
        trackId: "dialog:open",
        channelId: "scale",
        curveId: "custom-bezier-1",
        curveName: "Custom Scale",
        engine: "bezier",
        bezier: {
          p1: { x: 0.25, y: 1.0 },
          p2: { x: 0.5, y: 1.0 },
        },
        spring: { mass: 1, stiffness: 400, damping: 32, velocity: 0 },
        durationMs: 280,
        springMode: "fit",
      }

      const hash = encodeEaseHash(payload)
      expect(hash).toContain("t=dialog%3Aopen")
      expect(hash).toContain("e=bezier")
      expect(hash).toContain("x1=0.25")
      expect(hash).toContain("y1=1")
      expect(hash).toContain("x2=0.5")
      expect(hash).toContain("y2=1")
      expect(hash).toContain("d=280")
      expect(hash).toContain("sm=fit")

      const decoded = decodeEaseHash(hash)
      expect(decoded).not.toBeNull()
      expect(decoded?.trackId).toBe("dialog:open")
      expect(decoded?.channelId).toBe("scale")
      expect(decoded?.engine).toBe("bezier")
      expect(decoded?.bezier.p1.x).toBeCloseTo(0.25, 3)
      expect(decoded?.bezier.p1.y).toBeCloseTo(1.0, 3)
      expect(decoded?.bezier.p2.x).toBeCloseTo(0.5, 3)
      expect(decoded?.bezier.p2.y).toBeCloseTo(1.0, 3)
      expect(decoded?.durationMs).toBe(280)
      expect(decoded?.springMode).toBe("fit")
    })

    it("lossless round-trip for Spring payload (m=1, k=860, c=46, natural)", () => {
      const payload: UrlHashPayload = {
        trackId: "dialog:open",
        channelId: "scale",
        engine: "spring",
        bezier: {
          p1: { x: 0.16, y: 1.0 },
          p2: { x: 0.3, y: 1.0 },
        },
        spring: { mass: 1, stiffness: 860, damping: 46, velocity: 0 },
        durationMs: 230,
        springMode: "natural",
      }

      const hash = encodeEaseHash(payload)
      expect(hash).toBe(
        "#t=dialog%3Aopen&ch=scale&e=spring&d=230&sm=natural&m=1&k=860&c=46"
      )

      const decoded = decodeEaseHash(hash)
      expect(decoded).not.toBeNull()
      expect(decoded?.trackId).toBe("dialog:open")
      expect(decoded?.channelId).toBe("scale")
      expect(decoded?.engine).toBe("spring")
      expect(decoded?.spring.mass).toBe(1)
      expect(decoded?.spring.stiffness).toBe(860)
      expect(decoded?.spring.damping).toBe(46)
      expect(decoded?.durationMs).toBe(230)
      expect(decoded?.springMode).toBe("natural")
    })

    it("parses full URL input cleanly", () => {
      const url =
        "https://ease.satisium.com/app#t=drawer%3Aopen&ch=translateX&e=spring&m=1&k=500&c=35&d=320&sm=fit"
      const decoded = decodeEaseHash(url)

      expect(decoded).not.toBeNull()
      expect(decoded?.trackId).toBe("drawer:open")
      expect(decoded?.channelId).toBe("translateX")
      expect(decoded?.spring.stiffness).toBe(500)
    })

    it("returns null cleanly on corrupt, NaN, or out-of-bounds parameters (never throws)", () => {
      // Empty input
      expect(decodeEaseHash("")).toBeNull()
      expect(decodeEaseHash("#")).toBeNull()

      // Missing core parameters
      expect(decodeEaseHash("#foo=bar")).toBeNull()

      // Invalid engine
      expect(
        decodeEaseHash("#t=dialog:open&ch=scale&e=linear_invalid&d=200")
      ).toBeNull()

      // Negative stiffness on spring
      expect(
        decodeEaseHash(
          "#t=dialog:open&ch=scale&e=spring&m=1&k=-100&c=46&d=230&sm=natural"
        )
      ).toBeNull()

      // Zero or negative mass on spring
      expect(
        decodeEaseHash(
          "#t=dialog:open&ch=scale&e=spring&m=0&k=860&c=46&d=230&sm=natural"
        )
      ).toBeNull()

      // Out of bounds Bézier control handle x1 > 1
      expect(
        decodeEaseHash(
          "#t=dialog:open&ch=scale&e=bezier&x1=1.5&y1=1&x2=0.5&y2=1&d=280&sm=fit"
        )
      ).toBeNull()

      // Negative duration
      expect(
        decodeEaseHash(
          "#t=dialog:open&ch=scale&e=bezier&x1=0.2&y1=1&x2=0.5&y2=1&d=-20&sm=fit"
        )
      ).toBeNull()

      // NaN in values
      expect(
        decodeEaseHash(
          "#t=dialog:open&ch=scale&e=bezier&x1=NaN&y1=1&x2=0.5&y2=1&d=280&sm=fit"
        )
      ).toBeNull()
    })
  })

  // ==========================================================================
  // 2. Storage & 3-Tier Legacy Migration
  // ==========================================================================
  describe("storage", () => {
    it("migrates legacy v1 CustomEase with string values: '0.16, 1.00, 0.30, 1.00'", () => {
      const rawLegacy = [
        {
          id: "legacy-modal",
          name: "Legacy Modal",
          values: "0.16, 1.00, 0.30, 1.00",
          duration: 350,
          category: "Modal Dialogs",
        },
      ]

      const migrated = migrateLegacyCustomCurves(rawLegacy)
      expect(migrated).toHaveLength(1)
      expect(migrated[0]?.id).toBe("legacy-modal")
      expect(migrated[0]?.engine).toBe("bezier")
      expect(migrated[0]?.bezier.p1.x).toBeCloseTo(0.16, 2)
      expect(migrated[0]?.bezier.p1.y).toBeCloseTo(1.0, 2)
      expect(migrated[0]?.bezier.p2.x).toBeCloseTo(0.3, 2)
      expect(migrated[0]?.bezier.p2.y).toBeCloseTo(1.0, 2)
      expect(migrated[0]?.suggestedDurationMs).toBe(350)
      expect(migrated[0]?.isCustom).toBe(true)
    })

    it("flattens 3-tier nested Root -> Variant -> Flavor into canonical 2-tier tree", () => {
      const raw3Tier = [
        {
          id: "root-sheet",
          name: "Root Sheet",
          values: "0.16, 1.00, 0.30, 1.00",
          variants: [
            {
              id: "var-exit",
              name: "Exit",
              values: "0.40, 0.00, 1.00, 1.00",
              flavors: [
                {
                  id: "flavor-swift-exit",
                  name: "Swift Exit",
                  values: "0.70, 0.00, 1.00, 1.00",
                },
                {
                  id: "flavor-soft-exit",
                  name: "Soft Exit",
                  values: "0.20, 0.00, 1.00, 1.00",
                },
              ],
            },
          ],
        },
      ]

      const migrated = migrateLegacyCustomCurves(raw3Tier)
      expect(migrated).toHaveLength(1)
      const root = migrated[0]!

      // 3rd-tier flavors MUST be flattened directly into root.variants[]
      // Total variants on root: 1 original variant + 2 flattened flavors = 3 variants
      expect(root.variants).toHaveLength(3)

      const variantIds = root.variants?.map((v) => v.id)
      expect(variantIds).toContain("var-exit")
      expect(variantIds).toContain("flavor-swift-exit")
      expect(variantIds).toContain("flavor-soft-exit")

      // 100% 2-tier invariant check: NO variant may have nested variants/flavors!
      for (const variant of root.variants ?? []) {
        expect(variant.variants).toBeUndefined()
        expect(variant.parentId).toBe("root-sheet")
        expect(variant.parentName).toBe("Root Sheet")
      }
    })

    it("serializes and deserializes versioned storage round-trip with StorageAdapter", () => {
      const memoryStore: Record<string, string> = {}
      const adapter: StorageAdapter = {
        getItem: (key) => memoryStore[key] ?? null,
        setItem: (key, val) => {
          memoryStore[key] = val
        },
      }

      const testData: Omit<PersistedEaseData, "version"> = {
        customCurves: [...DEFAULT_CUSTOM_CURVES],
        activeTrackId: "drawer:open",
        activeChannelId: "translateX",
        preferredExporter: "tailwind",
        loopDelayMs: 500,
      }

      const serialized = serializeEaseStorage(testData)
      adapter.setItem("ease:settings", serialized)

      const retrieved = deserializeEaseStorage(adapter.getItem("ease:settings"))
      expect(retrieved.version).toBe(EASE_STORAGE_VERSION)
      expect(retrieved.activeTrackId).toBe("drawer:open")
      expect(retrieved.activeChannelId).toBe("translateX")
      expect(retrieved.preferredExporter).toBe("tailwind")
      expect(retrieved.loopDelayMs).toBe(500)
      expect(retrieved.customCurves.length).toBeGreaterThan(0)
    })

    it("falls back cleanly on null or corrupt JSON without throwing", () => {
      const fallbackNull = deserializeEaseStorage(null)
      expect(fallbackNull.version).toBe(EASE_STORAGE_VERSION)
      expect(fallbackNull.activeTrackId).toBe("dialog:open")
      expect(fallbackNull.customCurves.length).toBeGreaterThan(0)

      const fallbackCorrupt = deserializeEaseStorage("{{{broken JSON")
      expect(fallbackCorrupt.version).toBe(EASE_STORAGE_VERSION)
      expect(fallbackCorrupt.activeTrackId).toBe("dialog:open")
      expect(fallbackCorrupt.customCurves.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // 3. Command Palette Search
  // ==========================================================================
  describe("search", () => {
    const tracks = trackRegistry.list()
    const customCurves: EaseCurve[] = [
      {
        id: "custom-modal",
        name: "Custom Modal Sheet",
        engine: "bezier",
        bezier: { p1: { x: 0.16, y: 1 }, p2: { x: 0.3, y: 1 } },
        spring: { mass: 1, stiffness: 400, damping: 32, velocity: 0 },
        suggestedDurationMs: 320,
        isCustom: true,
        category: "Modal Dialogs",
        variants: [
          {
            id: "custom-modal-exit",
            name: "Modal Fast Exit",
            engine: "bezier",
            bezier: { p1: { x: 0.4, y: 0 }, p2: { x: 1, y: 1 } },
            spring: { mass: 1, stiffness: 400, damping: 32, velocity: 0 },
            suggestedDurationMs: 180,
            isCustom: true,
            parentId: "custom-modal",
            parentName: "Custom Modal Sheet",
          },
        ],
      },
    ]

    it("returns top curated items on empty query", () => {
      const results = searchEaseCommandCatalog({
        query: "",
        presets: ALL_CANONICAL_PRESETS,
        customCurves,
        tracks,
        limit: 15,
      })

      expect(results.length).toBeGreaterThan(0)
      expect(results.length).toBeLessThanOrEqual(15)
    })

    it("finds presets by name, useCase, and ranks exact/prefix matches first", () => {
      const results = searchEaseCommandCatalog({
        query: "expo-out",
        presets: ALL_CANONICAL_PRESETS,
        customCurves,
        tracks,
      })

      expect(results.length).toBeGreaterThan(0)
      expect(results[0]?.id).toBe("expo-out")
      expect(results[0]?.score).toBeGreaterThanOrEqual(50)
    })

    it("finds custom variants with parent subtitle ('Variant of ...')", () => {
      const results = searchEaseCommandCatalog({
        query: "Fast Exit",
        presets: ALL_CANONICAL_PRESETS,
        customCurves,
        tracks,
      })

      expect(results.length).toBeGreaterThan(0)
      const variantMatch = results.find((r) => r.id === "custom-modal-exit")
      expect(variantMatch).toBeDefined()
      expect(variantMatch?.kind).toBe("custom-variant")
      expect(variantMatch?.subtitle).toBe("Variant of Custom Modal Sheet")
    })

    it("finds component tracks by name (e.g. 'Drawer')", () => {
      const results = searchEaseCommandCatalog({
        query: "Drawer",
        presets: ALL_CANONICAL_PRESETS,
        customCurves,
        tracks,
      })

      expect(results.length).toBeGreaterThan(0)
      const trackMatch = results.find((r) => r.kind === "track")
      expect(trackMatch).toBeDefined()
      expect(trackMatch?.title).toContain("Drawer")
    })
  })

  // ==========================================================================
  // 4. Framework Independence & Purity
  // ==========================================================================
  describe("Purity & Framework Independence", () => {
    it("has zero react, window, document, or localStorage calls in core/codec/*.ts", () => {
      const files = ["url-hash.ts", "storage.ts", "search.ts"]

      for (const file of files) {
        const rawContent = readFileSync(
          resolve(__dirname, "../../core/codec", file),
          "utf-8"
        )
        // Strip comments to verify executable code
        const codeOnly = rawContent
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/.*/g, "")

        expect(codeOnly).not.toMatch(/from\s+["']react["']/)
        expect(codeOnly).not.toMatch(/from\s+["']react-dom["']/)
        expect(codeOnly).not.toMatch(/\bwindow\b/)
        expect(codeOnly).not.toMatch(/\bdocument\b/)
        expect(codeOnly).not.toMatch(/\blocalStorage\b/)
        expect(codeOnly).not.toMatch(/\bsessionStorage\b/)
      }
    })
  })
})
