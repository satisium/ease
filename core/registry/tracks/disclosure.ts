/**
 * @file core/registry/tracks/disclosure.ts
 * @description Transition tracks for disclosure and alert components (Status Toast, Inertial Carousel).
 */

import { TransitionTrackPlugin } from "../../schema"
import { createChannel } from "./shared"

// ============================================================================
// 1. Status Toast Track (Entrance)
// ============================================================================
export const toastFireTrack: TransitionTrackPlugin = {
  id: "toast:fire",
  componentId: "toast",
  componentLabel: "Status Toast",
  category: "Disclosure",
  phase: "enter",
  phaseLabel: "Entrance",
  triggerLabel: "Trigger Notification",
  channels: [
    createChannel({
      id: "opacity",
      label: "Opacity",
      property: "opacity",
      from: 0,
      to: 1.0,
      unit: "",
      durationMs: 180,
      delayMs: 0,
      curveId: "ease-out",
      roleTitle: "Notification Fade",
      guidance: "Immediate fade announces status update.",
      recommendedRangeMs: [140, 220],
      recommendedPresetIds: ["ease-out", "linear", "toast"],
    }),
    createChannel({
      id: "translateY",
      label: "Translate Y",
      property: "translateY",
      from: 16,
      to: 0,
      unit: "px",
      durationMs: 260,
      delayMs: 0,
      curveId: "toast",
      roleTitle: "Notification Rise",
      guidance: "Snappy upward entrance floats above surface.",
      recommendedRangeMs: [200, 320],
      recommendedPresetIds: [
        "toast",
        "snappy-spring",
        "ease-out-quart",
        "ios-fluid",
      ],
    }),
    createChannel({
      id: "scale",
      label: "Scale",
      property: "scale",
      from: 0.94,
      to: 1.0,
      unit: "",
      durationMs: 260,
      delayMs: 0,
      curveId: "toast",
      roleTitle: "Banner Expand",
      guidance: "Gentle scale settlement gives tactile weight.",
      recommendedRangeMs: [200, 320],
      recommendedPresetIds: ["toast", "snappy-spring", "material-pop"],
    }),
  ],
}

// ============================================================================
// 2. Inertial Carousel Track (Slide State)
// ============================================================================
export const carouselSlideTrack: TransitionTrackPlugin = {
  id: "carousel:slide",
  componentId: "carousel",
  componentLabel: "Inertial Carousel",
  category: "Disclosure",
  phase: "state",
  phaseLabel: "Slide State",
  triggerLabel: "Next Slide",
  channels: [
    createChannel({
      id: "translateX",
      label: "Translate X",
      property: "translateX",
      from: 0,
      to: -100,
      unit: "%",
      durationMs: 400,
      delayMs: 0,
      curveId: "ios-fluid",
      roleTitle: "Slide Traversal",
      guidance: "Inertial translation mimicking touch pagination.",
      recommendedRangeMs: [320, 500],
      recommendedPresetIds: ["ios-fluid", "power3-out", "drawer", "gentle"],
    }),
    createChannel({
      id: "scale",
      label: "Depth Scale",
      property: "scale",
      from: 1.0,
      to: 0.95,
      unit: "",
      durationMs: 400,
      delayMs: 0,
      curveId: "gentle",
      roleTitle: "Depth Recede",
      guidance: "Subtle parallax depth shift during pagination.",
      recommendedRangeMs: [300, 480],
      recommendedPresetIds: ["gentle", "ios-fluid", "power2-out"],
    }),
  ],
}
