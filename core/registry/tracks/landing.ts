/**
 * @file core/registry/tracks/landing.ts
 * @description Transition tracks for landing page motion (Masked Hero Reveal, FlipWords).
 */

import type { TransitionTrackPlugin } from "../../schema"
import { createChannel } from "./shared"

// ============================================================================
// 1. Hero Reveal Track (Entrance)
// ============================================================================
export const heroRevealTrack: TransitionTrackPlugin = {
  id: "hero:reveal",
  componentId: "hero",
  componentLabel: "Hero Reveal",
  category: "Landing",
  phase: "enter",
  phaseLabel: "Reveal",
  triggerLabel: "Replay Reveal",
  channels: [
    createChannel({
      id: "line1",
      label: "Headline Line 1",
      property: "translateY",
      from: 105,
      to: 0,
      unit: "%",
      durationMs: 720,
      delayMs: 0,
      curveId: "expo-out",
      roleTitle: "Masked Baseline Rise",
      guidance:
        "Slides the primary headline cleanly above its overflow clip mask.",
      recommendedRangeMs: [520, 900],
      recommendedPresetIds: [
        "expo-out",
        "cinematic-slow",
        "quint-out",
        "ios-sheet",
      ],
    }),
    createChannel({
      id: "line2",
      label: "Headline Line 2",
      property: "translateY",
      from: 105,
      to: 0,
      unit: "%",
      durationMs: 720,
      delayMs: 65,
      curveId: "expo-out",
      roleTitle: "Staggered Editorial Line",
      guidance:
        "65ms stagger creates effortless typographic rhythm across lines.",
      recommendedRangeMs: [520, 900],
      recommendedPresetIds: [
        "expo-out",
        "cinematic-slow",
        "quint-out",
        "ios-sheet",
      ],
    }),
    createChannel({
      id: "subtitle",
      label: "Subtitle Reveal",
      property: "opacity",
      from: 0,
      to: 1,
      unit: "",
      durationMs: 560,
      delayMs: 140,
      curveId: "ease-out",
      roleTitle: "Supporting Copy Fade",
      guidance: "Introduces supporting context softly as the headline settles.",
      recommendedRangeMs: [360, 720],
      recommendedPresetIds: ["ease-out", "quint-out", "linear"],
    }),
  ],
}

// ============================================================================
// 2. FlipWords Cycle Track (State)
// ============================================================================
export const flipWordsCycleTrack: TransitionTrackPlugin = {
  id: "flipwords:cycle",
  componentId: "flipwords",
  componentLabel: "FlipWords",
  category: "Landing",
  phase: "state",
  phaseLabel: "Word Flip",
  triggerLabel: "Next Word",
  channels: [
    createChannel({
      id: "wordOut",
      label: "Outgoing Word",
      property: "translateY",
      from: 0,
      to: -16,
      unit: "px",
      durationMs: 200,
      delayMs: 0,
      curveId: "quint-out",
      roleTitle: "Word Exit",
      guidance:
        "Clears the outgoing word cleanly upward ahead of incoming replacement.",
      recommendedRangeMs: [140, 280],
      recommendedPresetIds: ["quint-out", "ease-out", "expo-out"],
    }),
    createChannel({
      id: "wordIn",
      label: "Incoming Word",
      property: "translateY",
      from: 18,
      to: 0,
      unit: "px",
      durationMs: 420,
      delayMs: 40,
      curveId: "snappy-spring",
      roleTitle: "Word Arrival",
      guidance:
        "Brings the next editorial keyword smoothly up into baseline focus.",
      recommendedRangeMs: [280, 560],
      recommendedPresetIds: [
        "snappy-spring",
        "quint-out",
        "expo-out",
        "back-out",
      ],
    }),
  ],
}

export const landingTracks: TransitionTrackPlugin[] = [
  heroRevealTrack,
  flipWordsCycleTrack,
]
