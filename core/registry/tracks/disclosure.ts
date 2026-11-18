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

// ============================================================================
// 3. Smooth FAQ Accordion Tracks (Expand / Collapse)
// ============================================================================
export const accordionOpenTrack: TransitionTrackPlugin = {
  id: "accordion:open",
  componentId: "accordion",
  componentLabel: "Smooth Accordion",
  category: "Disclosure",
  phase: "enter",
  phaseLabel: "Expand",
  triggerLabel: "Expand Item",
  channels: [
    createChannel({
      id: "reveal",
      label: "Disclosure Glide",
      property: "translateY",
      from: 0,
      to: 1,
      unit: "",
      durationMs: 360,
      delayMs: 0,
      curveId: "ios-sheet",
      roleTitle: "Zero-Reflow Accordion",
      guidance:
        "Expands container mask and shifts sibling rows via GPU transforms without layout reflow.",
      recommendedRangeMs: [260, 440],
      recommendedPresetIds: [
        "ios-sheet",
        "quint-out",
        "expo-out",
        "material-standard",
      ],
    }),
    createChannel({
      id: "contentOpacity",
      label: "Answer Fade",
      property: "opacity",
      from: 0,
      to: 1,
      unit: "",
      durationMs: 240,
      delayMs: 45,
      curveId: "ease-out",
      roleTitle: "Copy Reveal",
      guidance: "Softly reveals answer copy slightly after the row opens.",
      recommendedRangeMs: [160, 300],
      recommendedPresetIds: ["ease-out", "quint-out", "linear"],
    }),
  ],
}

export const accordionCloseTrack: TransitionTrackPlugin = {
  id: "accordion:close",
  componentId: "accordion",
  componentLabel: "Smooth Accordion",
  category: "Disclosure",
  phase: "exit",
  phaseLabel: "Collapse",
  triggerLabel: "Collapse Item",
  channels: [
    createChannel({
      id: "reveal",
      label: "Disclosure Close",
      property: "translateY",
      from: 1,
      to: 0,
      unit: "",
      durationMs: 280,
      delayMs: 0,
      curveId: "quint-out",
      roleTitle: "Accordion Collapse",
      guidance:
        "Settles sibling rows smoothly back up into collapsed alignment.",
      recommendedRangeMs: [200, 340],
      recommendedPresetIds: ["quint-out", "ios-sheet", "expo-out"],
    }),
    createChannel({
      id: "contentOpacity",
      label: "Answer Dissolve",
      property: "opacity",
      from: 1,
      to: 0,
      unit: "",
      durationMs: 160,
      delayMs: 0,
      curveId: "material-standard",
      roleTitle: "Early Copy Clear",
      guidance:
        "Fades text ahead of the closing clip mask so copy never clips mid-line.",
      recommendedRangeMs: [120, 220],
      recommendedPresetIds: ["material-standard", "ease-out", "quint-out"],
    }),
  ],
}
