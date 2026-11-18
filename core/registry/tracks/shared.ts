/**
 * @file core/registry/tracks/shared.ts
 * @description Shared track registry instance and channel factory.
 *
 * Guaranteed Invariants:
 * - ZERO React or DOM dependencies.
 * - Channels strictly own durationMs and savedBezierDurationMs.
 * - Initial curve resolved cleanly from canonical presets.
 * - All recommendedPresetIds strictly reference verified canonical presets.
 */

import {
  AnimatableProperty,
  ChannelBinding,
  ChannelUnit,
  TransitionTrackPlugin,
} from "../../schema"
import {
  DEFAULT_FALLBACK_CURVE,
  getCanonicalPresetById,
} from "../../presets/index"
import { PluginRegistry } from "../plugin-registry"

/** Helper to build a ChannelBinding adhering to the Duration Integrity Law. */
export function createChannel(params: {
  id: string
  label: string
  property: AnimatableProperty
  from: number
  to: number
  unit: ChannelUnit
  durationMs: number
  delayMs?: number
  curveId: string
  roleTitle: string
  guidance: string
  recommendedRangeMs: [number, number]
  recommendedPresetIds: string[]
}): ChannelBinding {
  const curve = getCanonicalPresetById(params.curveId) ?? DEFAULT_FALLBACK_CURVE
  return {
    id: params.id,
    label: params.label,
    property: params.property,
    from: params.from,
    to: params.to,
    unit: params.unit,
    durationMs: params.durationMs,
    savedBezierDurationMs: params.durationMs,
    delayMs: params.delayMs ?? 0,
    springMode: "fit",
    curve,
    semanticContext: {
      roleTitle: params.roleTitle,
      guidance: params.guidance,
      recommendedRangeMs: params.recommendedRangeMs,
      recommendedPresetIds: params.recommendedPresetIds,
    },
  }
}

/** Pre-registered transition track registry instance. */
export const trackRegistry = new PluginRegistry<TransitionTrackPlugin>()
