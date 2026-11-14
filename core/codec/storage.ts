/**
 * @file core/codec/storage.ts
 * @description Schema-versioned persistence adapter and legacy 3-tier custom curve migration.
 *
 * Invariants:
 * - 100% pure TypeScript. Zero browser globals or direct storage accesses.
 * - Max 2-tier tree: Flattens any legacy 3-tier flavors directly into 2nd-tier variants on Root.
 * - Resilient: Corrupt JSON or invalid formats fall back safely to DEFAULT_CUSTOM_CURVES without throwing.
 */

import { DEFAULT_CUSTOM_CURVES } from "../presets/default-customs"
import { BezierParams, EaseCurve, SpringParams } from "../schema"
import { cloneCurve } from "../state/curve-tree-reducers"
import { parseCurveString } from "../math/parser"

/** Active schema version for persisted local storage. */
export const EASE_STORAGE_VERSION = 2

/** Injected storage interface for environment independence (web storage, AsyncStorage, in-memory). */
export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Complete persisted application state bundle. */
export interface PersistedEaseData {
  version: number
  customCurves: EaseCurve[]
  activeTrackId: string
  activeChannelId: string
  preferredExporter: "css" | "tailwind" | "motion" | "gsap"
  loopDelayMs: number
}

interface RawLegacyItem {
  id?: unknown
  name?: unknown
  engine?: unknown
  values?: unknown
  bezier?: unknown
  spring?: unknown
  suggestedDurationMs?: unknown
  duration?: unknown
  parentId?: unknown
  parentName?: unknown
  category?: unknown
  description?: unknown
  useCases?: unknown
  variants?: unknown
  flavors?: unknown
}

function validateBezier(obj: unknown): BezierParams | null {
  if (!obj || typeof obj !== "object") return null
  const candidate = obj as Record<string, unknown>
  const p1 = candidate.p1 as Record<string, unknown> | undefined
  const p2 = candidate.p2 as Record<string, unknown> | undefined

  if (!p1 || !p2) return null
  const x1 = Number(p1.x)
  const y1 = Number(p1.y)
  const x2 = Number(p2.x)
  const y2 = Number(p2.y)

  if (
    !Number.isFinite(x1) ||
    !Number.isFinite(y1) ||
    !Number.isFinite(x2) ||
    !Number.isFinite(y2)
  ) {
    return null
  }

  return {
    p1: { x: Math.max(0, Math.min(1, x1)), y: y1 },
    p2: { x: Math.max(0, Math.min(1, x2)), y: y2 },
  }
}

function validateSpring(obj: unknown): SpringParams | null {
  if (!obj || typeof obj !== "object") return null
  const candidate = obj as Record<string, unknown>
  const mass = Number(candidate.mass)
  const stiffness = Number(candidate.stiffness)
  const damping = Number(candidate.damping)
  const velocity =
    candidate.velocity !== undefined ? Number(candidate.velocity) : 0

  if (
    !Number.isFinite(mass) ||
    !Number.isFinite(stiffness) ||
    !Number.isFinite(damping) ||
    !Number.isFinite(velocity) ||
    mass <= 0 ||
    stiffness <= 0 ||
    damping < 0
  ) {
    return null
  }

  return {
    mass,
    stiffness,
    damping,
    velocity,
  }
}

function parseSingleCurveNode(
  item: RawLegacyItem,
  parentId?: string,
  parentName?: string
): EaseCurve | null {
  if (!item || typeof item !== "object") {
    return null
  }

  const id =
    typeof item.id === "string" && item.id.trim()
      ? item.id.trim()
      : `custom-${Math.random().toString(36).slice(2, 9)}`

  const name =
    typeof item.name === "string" && item.name.trim()
      ? item.name.trim()
      : "Custom Curve"

  const defaultBezier: BezierParams = {
    p1: { x: 0.16, y: 1.0 },
    p2: { x: 0.3, y: 1.0 },
  }
  const defaultSpring: SpringParams = {
    mass: 1,
    stiffness: 400,
    damping: 32,
    velocity: 0,
  }

  let engine: "bezier" | "spring" = "bezier"
  let bezier: BezierParams = defaultBezier
  let spring: SpringParams = defaultSpring

  // 1. Try legacy values string e.g. "0.16, 1.00, 0.30, 1.00" or "m:1 s:340 d:28"
  if (typeof item.values === "string" && item.values.trim()) {
    const parsed = parseCurveString(item.values.trim())
    if (parsed) {
      engine = parsed.engine
      bezier = parsed.bezier ?? defaultBezier
      spring = parsed.spring ?? defaultSpring
    }
  } else if (item.engine === "bezier" || item.engine === "spring") {
    engine = item.engine
    bezier = validateBezier(item.bezier) ?? defaultBezier
    spring = validateSpring(item.spring) ?? defaultSpring
  } else if (item.bezier) {
    const parsedBezier = validateBezier(item.bezier)
    if (parsedBezier) {
      engine = "bezier"
      bezier = parsedBezier
      spring = validateSpring(item.spring) ?? defaultSpring
    }
  } else if (item.spring) {
    const parsedSpring = validateSpring(item.spring)
    if (parsedSpring) {
      engine = "spring"
      spring = parsedSpring
      bezier = validateBezier(item.bezier) ?? defaultBezier
    }
  } else {
    // Unparseable math; drop corrupt entry
    return null
  }

  const durationRaw = item.suggestedDurationMs ?? item.duration ?? 280
  const durationNum = Number(durationRaw)
  const suggestedDurationMs =
    Number.isFinite(durationNum) && durationNum >= 1
      ? Math.round(durationNum)
      : 280

  const resolvedParentId =
    parentId ?? (typeof item.parentId === "string" ? item.parentId : undefined)
  const resolvedParentName =
    parentName ??
    (typeof item.parentName === "string" ? item.parentName : undefined)

  return {
    id,
    name,
    engine,
    bezier,
    spring,
    suggestedDurationMs,
    isCustom: true,
    parentId: resolvedParentId,
    parentName: resolvedParentName,
    category: typeof item.category === "string" ? item.category : undefined,
    description:
      typeof item.description === "string" ? item.description : undefined,
    useCases: Array.isArray(item.useCases)
      ? item.useCases.filter((u): u is string => typeof u === "string")
      : undefined,
    variants: undefined,
  }
}

/**
 * Safely parses and migrates unknown or legacy custom curves into the canonical 2-tier tree.
 * Flattens any 3rd-tier flavors directly into 2nd-tier `variants[]` on the Root curve.
 * Drops corrupt entries safely without throwing.
 *
 * @param rawCurves - Unknown data structure from persistent storage or legacy export.
 * @returns Canonical 2-tier EaseCurve[] array.
 */
export function migrateLegacyCustomCurves(rawCurves: unknown): EaseCurve[] {
  if (!Array.isArray(rawCurves)) {
    return []
  }

  const result: EaseCurve[] = []

  for (const rootItem of rawCurves) {
    if (!rootItem || typeof rootItem !== "object") {
      continue
    }

    const rootNode = parseSingleCurveNode(rootItem as RawLegacyItem)
    if (!rootNode) {
      continue
    }

    const flattenedVariants: EaseCurve[] = []
    const rawVariants = (rootItem as RawLegacyItem).variants

    if (Array.isArray(rawVariants)) {
      for (const varItem of rawVariants) {
        if (!varItem || typeof varItem !== "object") {
          continue
        }

        const variantNode = parseSingleCurveNode(
          varItem as RawLegacyItem,
          rootNode.id,
          rootNode.name
        )
        if (variantNode) {
          variantNode.variants = undefined // ensure variants have zero children
          flattenedVariants.push(variantNode)
        }

        // Check for 3rd-tier nested flavors/variants and FLATTEN directly into Root
        const legacyCandidate = varItem as RawLegacyItem
        const nestedList = Array.isArray(legacyCandidate.flavors)
          ? legacyCandidate.flavors
          : Array.isArray(legacyCandidate.variants)
            ? legacyCandidate.variants
            : null

        if (Array.isArray(nestedList)) {
          for (const flavorItem of nestedList) {
            if (!flavorItem || typeof flavorItem !== "object") {
              continue
            }
            const flavorNode = parseSingleCurveNode(
              flavorItem as RawLegacyItem,
              rootNode.id,
              rootNode.name
            )
            if (flavorNode) {
              flavorNode.variants = undefined // Flattened directly into Root
              flattenedVariants.push(flavorNode)
            }
          }
        }
      }
    }

    rootNode.variants = flattenedVariants
    result.push(rootNode)
  }

  return result
}

/**
 * Serializes application state into versioned JSON storage string.
 *
 * @param data - Storage data payload.
 * @returns Serialized JSON string.
 */
export function serializeEaseStorage(
  data: Omit<PersistedEaseData, "version">
): string {
  const payload: PersistedEaseData = {
    version: EASE_STORAGE_VERSION,
    customCurves: data.customCurves.map(cloneCurve),
    activeTrackId: data.activeTrackId,
    activeChannelId: data.activeChannelId,
    preferredExporter: data.preferredExporter,
    loopDelayMs: Math.max(0, Math.round(data.loopDelayMs)),
  }
  return JSON.stringify(payload)
}

/**
 * Deserializes versioned JSON storage into PersistedEaseData.
 * Falls back safely to DEFAULT_CUSTOM_CURVES on null, invalid, or corrupt JSON.
 *
 * @param rawJson - Raw JSON string from StorageAdapter.
 * @returns Deserialized PersistedEaseData.
 */
export function deserializeEaseStorage(
  rawJson: string | null
): PersistedEaseData {
  const fallback: PersistedEaseData = {
    version: EASE_STORAGE_VERSION,
    customCurves: DEFAULT_CUSTOM_CURVES.map(cloneCurve),
    activeTrackId: "dialog:open",
    activeChannelId: "scale",
    preferredExporter: "css",
    loopDelayMs: 400,
  }

  if (!rawJson || typeof rawJson !== "string") {
    return fallback
  }

  try {
    const parsed = JSON.parse(rawJson)
    if (!parsed || typeof parsed !== "object") {
      return fallback
    }

    let customCurves = fallback.customCurves
    if ("customCurves" in parsed) {
      const migrated = migrateLegacyCustomCurves(parsed.customCurves)
      if (migrated.length > 0) {
        customCurves = migrated
      }
    }

    const activeTrackId =
      typeof parsed.activeTrackId === "string" && parsed.activeTrackId.trim()
        ? parsed.activeTrackId.trim()
        : fallback.activeTrackId

    const activeChannelId =
      typeof parsed.activeChannelId === "string" &&
      parsed.activeChannelId.trim()
        ? parsed.activeChannelId.trim()
        : fallback.activeChannelId

    const validExporters: Array<PersistedEaseData["preferredExporter"]> = [
      "css",
      "tailwind",
      "motion",
      "gsap",
    ]
    const preferredExporter = validExporters.includes(parsed.preferredExporter)
      ? (parsed.preferredExporter as PersistedEaseData["preferredExporter"])
      : fallback.preferredExporter

    const loopDelayMs =
      typeof parsed.loopDelayMs === "number" &&
      Number.isFinite(parsed.loopDelayMs)
        ? Math.max(0, Math.round(parsed.loopDelayMs))
        : fallback.loopDelayMs

    return {
      version: EASE_STORAGE_VERSION,
      customCurves,
      activeTrackId,
      activeChannelId,
      preferredExporter,
      loopDelayMs,
    }
  } catch {
    return fallback
  }
}
