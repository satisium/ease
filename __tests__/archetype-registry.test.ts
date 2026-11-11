import { describe, it, expect } from "vitest"
import {
  ARCHETYPE_MANIFESTS,
  ARCHETYPE_SCENARIOS,
  getArchetypeManifest,
  getAllArchetypeManifests,
} from "@/components/studio/domain/archetype-registry"

describe("Archetype Manifest Registry", () => {
  it("registers dialog archetype", () => {
    const manifests = getAllArchetypeManifests()
    const ids = manifests.map((m) => m.id)
    expect(ids).toContain("dialog")
    expect(ids).toHaveLength(1)
  })

  it("dialog manifest exposes asymmetric enter and exit slots with valid component", () => {
    const dialog = getArchetypeManifest("dialog")
    expect(dialog).toBeDefined()
    expect(dialog?.name).toBe("Dialog")
    expect(dialog?.slots).toHaveLength(2)
    expect(dialog?.slots[0].id).toBe("enter")
    expect(dialog?.slots[0].defaultCurveId).toBe("modal-sheet")
    expect(dialog?.slots[1].id).toBe("exit")
    expect(dialog?.slots[1].defaultCurveId).toBe("expo-in")
    expect(typeof dialog?.component).toBe("function")
  })

  it("ARCHETYPE_SCENARIOS derives cleanly from registered manifests", () => {
    expect(ARCHETYPE_SCENARIOS).toHaveLength(ARCHETYPE_MANIFESTS.length)
    expect(ARCHETYPE_SCENARIOS.map((s) => s.id)).toEqual(["dialog"])
  })
})
