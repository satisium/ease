/**
 * @file core/presets/index.ts
 * @description Canonical presets barrel and lookup helpers.
 *
 * Invariants:
 * - Zero React/DOM imports.
 * - Single source of truth for all built-in Bézier, Spring, and Starter Custom curves.
 */

import { EaseCurve } from "../schema"
import { CANONICAL_BEZIER_PRESETS } from "./bezier-presets"
import { DEFAULT_CUSTOM_CURVES } from "./default-customs"
import { CANONICAL_SPRING_PRESETS } from "./spring-presets"

export {
  CANONICAL_BEZIER_PRESETS,
  CANONICAL_SPRING_PRESETS,
  DEFAULT_CUSTOM_CURVES,
}

/** Complete catalog of all canonical built-in presets (Bézier + Spring). */
export const ALL_CANONICAL_PRESETS: readonly EaseCurve[] = [
  ...CANONICAL_BEZIER_PRESETS,
  ...CANONICAL_SPRING_PRESETS,
]

/**
 * Fast lookup map index for all canonical presets by unique ID.
 */
const PRESETS_BY_ID = new Map<string, EaseCurve>(
  ALL_CANONICAL_PRESETS.map((p) => [p.id, p])
)

/**
 * Retrieves a canonical preset by ID.
 *
 * @param id - The unique preset identifier (e.g. "ease-out-quart", "snappy-spring").
 * @returns The EaseCurve definition or undefined if not found.
 */
export function getCanonicalPresetById(id: string): EaseCurve | undefined {
  return PRESETS_BY_ID.get(id)
}

/**
 * Universal default fallback curve for new channels or uninitialized states.
 * Uses "expo-out" if present, otherwise defaults to the first Bézier preset.
 */
export const DEFAULT_FALLBACK_CURVE: EaseCurve =
  getCanonicalPresetById("expo-out") ?? CANONICAL_BEZIER_PRESETS[0]
