import { describe, it, expect } from "vitest"
import {
  ARCHETYPE_MANIFESTS,
  ARCHETYPE_SCENARIOS,
  getArchetypeManifest,
  getAllArchetypeManifests,
} from "@/components/studio/domain/archetype-registry"

describe("Archetype Manifest Registry", () => {
  it("registers core v1 archetypes (modal, carousel, button)", () => {
    const manifests = getAllArchetypeManifests()
    const ids = manifests.map((m) => m.id)
    expect(ids).toContain("modal")
    expect(ids).toContain("carousel")
    expect(ids).toContain("button")
  })

  it("modal manifest exposes asymmetric enter and exit slots with valid component", () => {
    const modal = getArchetypeManifest("modal")
    expect(modal).toBeDefined()
    expect(modal?.name).toBe("Modal Dialog")
    expect(modal?.slots).toHaveLength(2)
    expect(modal?.slots[0].id).toBe("enter")
    expect(modal?.slots[0].defaultCurveId).toBe("modal-sheet")
    expect(modal?.slots[1].id).toBe("exit")
    expect(modal?.slots[1].defaultCurveId).toBe("expo-in")
    expect(typeof modal?.component).toBe("function")
  })

  it("carousel manifest exposes single symmetric slide slot with valid component", () => {
    const carousel = getArchetypeManifest("carousel")
    expect(carousel).toBeDefined()
    expect(carousel?.name).toBe("Media Carousel")
    expect(carousel?.slots).toHaveLength(1)
    expect(carousel?.slots[0].id).toBe("slide")
    expect(carousel?.slots[0].defaultCurveId).toBe("ios-fluid")
    expect(typeof carousel?.component).toBe("function")
  })

  it("button manifest exposes single tactile press slot with valid component", () => {
    const button = getArchetypeManifest("button")
    expect(button).toBeDefined()
    expect(button?.name).toBe("Tactile Button")
    expect(button?.slots).toHaveLength(1)
    expect(button?.slots[0].id).toBe("press")
    expect(button?.slots[0].defaultCurveId).toBe("button")
    expect(typeof button?.component).toBe("function")
  })

  it("ARCHETYPE_SCENARIOS derives cleanly from registered manifests", () => {
    expect(ARCHETYPE_SCENARIOS).toHaveLength(ARCHETYPE_MANIFESTS.length)
    expect(ARCHETYPE_SCENARIOS.map((s) => s.id)).toEqual([
      "modal",
      "carousel",
      "button",
    ])
  })
})
