/**
 * @file core/registry/tracks/disclosure.ts
 * @description Transition tracks for disclosure and alert components (Status Toast, Inertial Carousel).
 */

import { TransitionTrackPlugin } from "../../schema"
import { createChannel } from "./shared"

// ============================================================================
// 1. Toast Stack Track (Entrance)
// ============================================================================
export const toastFireTrack: TransitionTrackPlugin = {
  id: "toast:fire",
  componentId: "toast",
  componentLabel: "Toast Stack",
  category: "Disclosure",
  phase: "enter",
  phaseLabel: "Entrance",
  triggerLabel: "Send Toast",
  channels: [
    createChannel({
      id: "opacity",
      label: "Reveal",
      property: "opacity",
      from: 0,
      to: 1.0,
      unit: "",
      durationMs: 220,
      delayMs: 0,
      curveId: "ease-out",
      roleTitle: "Notification Fade",
      guidance:
        "Crisp fade introduces the incoming toast without harsh popping.",
      recommendedRangeMs: [140, 260],
      recommendedPresetIds: ["ease-out", "quint-out", "linear"],
    }),
    createChannel({
      id: "rise",
      label: "Stack Glide",
      property: "translateY",
      from: 24,
      to: 0,
      unit: "px",
      durationMs: 380,
      delayMs: 0,
      curveId: "quint-out",
      roleTitle: "Sonner Stack Compression",
      guidance:
        "Incoming toast rises softly while existing toasts compress upward in 1:1 lockstep.",
      recommendedRangeMs: [260, 480],
      recommendedPresetIds: [
        "quint-out",
        "ios-sheet",
        "toast",
        "snappy-spring",
      ],
    }),
    createChannel({
      id: "scale",
      label: "Stack Depth",
      property: "scale",
      from: 0.94,
      to: 1.0,
      unit: "",
      durationMs: 380,
      delayMs: 0,
      curveId: "quint-out",
      roleTitle: "Tactile Weight",
      guidance:
        "Subtle scale expansion gives the incoming notification physical presence.",
      recommendedRangeMs: [240, 440],
      recommendedPresetIds: ["quint-out", "toast", "snappy-spring", "expo-out"],
    }),
  ],
}

// ============================================================================
// 2. Wallet Card Deck Track (Cycle State)
// ============================================================================
export const carouselSlideTrack: TransitionTrackPlugin = {
  id: "carousel:slide",
  componentId: "carousel",
  componentLabel: "Wallet Card Deck",
  category: "Disclosure",
  phase: "state",
  phaseLabel: "Cycle",
  triggerLabel: "Next Card",
  channels: [
    createChannel({
      id: "slide",
      label: "Card Shuffle",
      property: "translateX",
      from: 0,
      to: -148,
      unit: "px",
      durationMs: 480,
      delayMs: 0,
      curveId: "ios-sheet",
      roleTitle: "Weighted Card Arc",
      guidance:
        "Sweeps the front card cleanly out and tucks it behind the deck while promoting the next pass.",
      recommendedRangeMs: [340, 560],
      recommendedPresetIds: [
        "ios-sheet",
        "drawer",
        "expo-out",
        "snappy-spring",
      ],
    }),
    createChannel({
      id: "depth",
      label: "Depth Scale",
      property: "scale",
      from: 0.94,
      to: 1.0,
      unit: "",
      durationMs: 480,
      delayMs: 0,
      curveId: "ios-sheet",
      roleTitle: "Deck Promotion",
      guidance:
        "Elevates the underlying card smoothly forward as the top card clears.",
      recommendedRangeMs: [340, 560],
      recommendedPresetIds: ["ios-sheet", "expo-out", "gentle"],
    }),
  ],
}
