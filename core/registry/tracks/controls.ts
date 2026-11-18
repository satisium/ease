/**
 * @file core/registry/tracks/controls.ts
 * @description Transition tracks for interactive controls (Tactile Button, Segmented Tabs).
 */

import { TransitionTrackPlugin } from "../../schema"
import { createChannel } from "./shared"

// ============================================================================
// 1. Tactile Button Track (Press State)
// ============================================================================
export const buttonPressTrack: TransitionTrackPlugin = {
  id: "button:press",
  componentId: "button",
  componentLabel: "Tactile Button",
  category: "Controls",
  phase: "state",
  phaseLabel: "Press State",
  triggerLabel: "Click Button",
  channels: [
    createChannel({
      id: "scale",
      label: "Scale",
      property: "scale",
      from: 1.0,
      to: 0.96,
      unit: "",
      durationMs: 120,
      delayMs: 0,
      curveId: "button",
      roleTitle: "Tactile Compression",
      guidance: "Haptic compression indicates confirmed user intent.",
      recommendedRangeMs: [80, 160],
      recommendedPresetIds: ["button", "snappy-spring", "stiff", "ultra-fast"],
    }),
    createChannel({
      id: "opacity",
      label: "Opacity",
      property: "opacity",
      from: 1.0,
      to: 0.92,
      unit: "",
      durationMs: 120,
      delayMs: 0,
      curveId: "linear",
      roleTitle: "Surface Shading",
      guidance: "Slight shading reinforces physical depression.",
      recommendedRangeMs: [80, 160],
      recommendedPresetIds: ["linear", "ease-out", "button"],
    }),
  ],
}

// ============================================================================
// 2. Segmented Tabs Track (Switch State)
// ============================================================================
export const tabsSwitchTrack: TransitionTrackPlugin = {
  id: "tabs:switch",
  componentId: "tabs",
  componentLabel: "Segmented Tabs",
  category: "Controls",
  phase: "state",
  phaseLabel: "Switch State",
  triggerLabel: "Switch Tab",
  channels: [
    createChannel({
      id: "translateX",
      label: "Indicator X",
      property: "translateX",
      from: 0,
      to: 100,
      unit: "%",
      durationMs: 260,
      delayMs: 0,
      curveId: "snappy-spring",
      roleTitle: "Indicator Glide",
      guidance: "Horizontal glide across adjacent tab segments.",
      recommendedRangeMs: [200, 320],
      recommendedPresetIds: [
        "snappy-spring",
        "ios-fluid",
        "material-standard",
        "power2-in-out",
      ],
    }),
    createChannel({
      id: "scale",
      label: "Pill Squeeze",
      property: "scale",
      from: 1.0,
      to: 0.97,
      unit: "",
      durationMs: 260,
      delayMs: 0,
      curveId: "button",
      roleTitle: "Pill Squeeze",
      guidance: "Momentary squeeze during high-speed translation.",
      recommendedRangeMs: [180, 280],
      recommendedPresetIds: ["button", "snappy-spring", "stiff"],
    }),
  ],
}
