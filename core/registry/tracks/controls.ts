/**
 * @file core/registry/tracks/controls.ts
 * @description Transition tracks for interactive controls (Tactile Button, Segmented Tabs).
 */

import { TransitionTrackPlugin } from "../../schema"
import { createChannel } from "./shared"

// ============================================================================
// 1. Morphing Button Track (Press State)
// ============================================================================
export const buttonPressTrack: TransitionTrackPlugin = {
  id: "button:press",
  componentId: "button",
  componentLabel: "Morphing Button",
  category: "Controls",
  phase: "state",
  phaseLabel: "Press State",
  triggerLabel: "Deploy Changes",
  channels: [
    createChannel({
      id: "scale",
      label: "Press Impulse",
      property: "scale",
      from: 1.0,
      to: 0.96,
      unit: "",
      durationMs: 140,
      delayMs: 0,
      curveId: "button",
      roleTitle: "Tactile Compression",
      guidance:
        "Crisp initial depression confirms tap before the status morph.",
      recommendedRangeMs: [80, 180],
      recommendedPresetIds: ["button", "snappy-spring", "stiff", "quint-out"],
    }),
    createChannel({
      id: "morph",
      label: "Status Morph",
      property: "translateY",
      from: 12,
      to: 0,
      unit: "px",
      durationMs: 640,
      delayMs: 40,
      curveId: "quint-out",
      roleTitle: "Optical Label & Checkmark Morph",
      guidance:
        "Smooth vertical optical roll and SVG stroke draw transition between Deploy, Deploying, and Deployed.",
      recommendedRangeMs: [400, 800],
      recommendedPresetIds: [
        "quint-out",
        "expo-out",
        "ios-sheet",
        "snappy-spring",
      ],
    }),
  ],
}

// ============================================================================
// 2. Dynamic Pill Tracks (Expand & Collapse States)
// ============================================================================
export const pillExpandTrack: TransitionTrackPlugin = {
  id: "pill:expand",
  componentId: "pill",
  componentLabel: "Dynamic Pill",
  category: "Controls",
  phase: "enter",
  phaseLabel: "Expand",
  triggerLabel: "Expand Island",
  channels: [
    createChannel({
      id: "expand",
      label: "Capsule Morph",
      property: "scale",
      from: 0,
      to: 1,
      unit: "",
      durationMs: 420,
      delayMs: 0,
      curveId: "snappy-spring",
      roleTitle: "Capsule Expansion",
      guidance:
        "Fluidly expands capsule dimensions from live badge to interactive control bar.",
      recommendedRangeMs: [320, 520],
      recommendedPresetIds: [
        "snappy-spring",
        "material-pop",
        "ios-sheet",
        "expo-out",
      ],
    }),
    createChannel({
      id: "contentOpacity",
      label: "Controls Reveal",
      property: "opacity",
      from: 0,
      to: 1,
      unit: "",
      durationMs: 220,
      delayMs: 70,
      curveId: "ease-out",
      roleTitle: "Optical Content Crossfade",
      guidance:
        "Crossfades expanded controls cleanly after capsule space opens.",
      recommendedRangeMs: [180, 320],
      recommendedPresetIds: ["ease-out", "quint-out", "linear"],
    }),
  ],
}

export const pillCollapseTrack: TransitionTrackPlugin = {
  id: "pill:collapse",
  componentId: "pill",
  componentLabel: "Dynamic Pill",
  category: "Controls",
  phase: "exit",
  phaseLabel: "Collapse",
  triggerLabel: "Collapse Pill",
  channels: [
    createChannel({
      id: "expand",
      label: "Capsule Contract",
      property: "scale",
      from: 1,
      to: 0,
      unit: "",
      durationMs: 320,
      delayMs: 0,
      curveId: "ios-sheet",
      roleTitle: "Capsule Contraction",
      guidance:
        "Smoothly settles the expanded bar back into its compact live status pill.",
      recommendedRangeMs: [260, 420],
      recommendedPresetIds: ["ios-sheet", "quint-out", "expo-out"],
    }),
    createChannel({
      id: "contentOpacity",
      label: "Controls Fade",
      property: "opacity",
      from: 1,
      to: 0,
      unit: "",
      durationMs: 140,
      delayMs: 0,
      curveId: "material-standard",
      roleTitle: "Content Dissolve",
      guidance: "Clears inner controls cleanly before the capsule shrinks.",
      recommendedRangeMs: [140, 240],
      recommendedPresetIds: ["material-standard", "ease-out", "quint-out"],
    }),
  ],
}

// ============================================================================
// 3. Segmented Control Track (Switch State)
// ============================================================================
export const tabsSwitchTrack: TransitionTrackPlugin = {
  id: "tabs:switch",
  componentId: "tabs",
  componentLabel: "Segmented Control",
  category: "Controls",
  phase: "state",
  phaseLabel: "Switch State",
  triggerLabel: "Switch Tab",
  channels: [
    createChannel({
      id: "indicator",
      label: "Pill Glide",
      property: "translateX",
      from: 0,
      to: 100,
      unit: "%",
      durationMs: 340,
      delayMs: 0,
      curveId: "snappy-spring",
      roleTitle: "Indicator Glide",
      guidance:
        "Spring-driven pill glide with subtle elastic settle across tab segments.",
      recommendedRangeMs: [240, 420],
      recommendedPresetIds: [
        "snappy-spring",
        "ios-sheet",
        "quint-out",
        "expo-out",
      ],
    }),
    createChannel({
      id: "squeeze",
      label: "Pill Squeeze",
      property: "scale",
      from: 1.0,
      to: 0.96,
      unit: "",
      durationMs: 340,
      delayMs: 0,
      curveId: "button",
      roleTitle: "Elastic Pill Squeeze",
      guidance:
        "Micro squash-and-stretch gives the sliding indicator physical momentum.",
      recommendedRangeMs: [200, 360],
      recommendedPresetIds: ["button", "snappy-spring", "stiff"],
    }),
  ],
}

// ============================================================================
// 4. Shimmer CTA Track (Action State)
// ============================================================================
export const ctaPressTrack: TransitionTrackPlugin = {
  id: "cta:press",
  componentId: "cta",
  componentLabel: "Shimmer CTA",
  category: "Controls",
  phase: "state",
  phaseLabel: "Action State",
  triggerLabel: "Get Started",
  channels: [
    createChannel({
      id: "scale",
      label: "Press Impulse",
      property: "scale",
      from: 1.0,
      to: 0.965,
      unit: "",
      durationMs: 140,
      delayMs: 0,
      curveId: "button",
      roleTitle: "Tactile Compression",
      guidance: "Brief physical compression confirms tap immediately.",
      recommendedRangeMs: [90, 180],
      recommendedPresetIds: ["button", "snappy-spring", "stiff", "quint-out"],
    }),
    createChannel({
      id: "arrow",
      label: "Arrow Swap",
      property: "translateX",
      from: 0,
      to: 14,
      unit: "px",
      durationMs: 340,
      delayMs: 0,
      curveId: "expo-out",
      roleTitle: "Directional Arrow Glide",
      guidance:
        "Exits the leading arrow forward while gliding a fresh trailing arrow into place.",
      recommendedRangeMs: [220, 420],
      recommendedPresetIds: [
        "expo-out",
        "quint-out",
        "snappy-spring",
        "ios-sheet",
      ],
    }),
    createChannel({
      id: "shimmer",
      label: "Specular Sweep",
      property: "translateX",
      from: -120,
      to: 220,
      unit: "%",
      durationMs: 520,
      delayMs: 0,
      curveId: "quint-out",
      roleTitle: "Surface Specular Sweep",
      guidance:
        "Sweeps a clean highlight across the CTA surface without layout overhead.",
      recommendedRangeMs: [360, 680],
      recommendedPresetIds: ["quint-out", "ease-in-out", "linear", "expo-out"],
    }),
  ],
}

// ============================================================================
// 5. Collapsible Sidebar Tracks (Expand & Collapse States)
// ============================================================================
export const sidebarExpandTrack: TransitionTrackPlugin = {
  id: "sidebar:expand",
  componentId: "sidebar",
  componentLabel: "Collapsible Sidebar",
  category: "Controls",
  phase: "enter",
  phaseLabel: "Expand",
  triggerLabel: "Expand Sidebar",
  channels: [
    createChannel({
      id: "railClip",
      label: "Sidebar Reveal",
      property: "translateX",
      from: 54,
      to: 156,
      unit: "px",
      durationMs: 380,
      delayMs: 0,
      curveId: "expo-out",
      roleTitle: "Concentric Rail Reveal",
      guidance:
        "Glides the workspace edge cleanly outward to uncover full navigation labels with zero reflow.",
      recommendedRangeMs: [260, 480],
      recommendedPresetIds: [
        "expo-out",
        "ios-sheet",
        "quint-out",
        "snappy-spring",
      ],
    }),
    createChannel({
      id: "labelFade",
      label: "Labels Reveal",
      property: "opacity",
      from: 0,
      to: 1,
      unit: "",
      durationMs: 240,
      delayMs: 60,
      curveId: "ease-out",
      roleTitle: "Navigation Label Fade",
      guidance:
        "Fades nav labels softly into view once the rail opens past the icon column.",
      recommendedRangeMs: [160, 300],
      recommendedPresetIds: ["ease-out", "quint-out", "linear"],
    }),
  ],
}

export const sidebarCollapseTrack: TransitionTrackPlugin = {
  id: "sidebar:collapse",
  componentId: "sidebar",
  componentLabel: "Collapsible Sidebar",
  category: "Controls",
  phase: "exit",
  phaseLabel: "Collapse",
  triggerLabel: "Collapse Sidebar",
  channels: [
    createChannel({
      id: "railClip",
      label: "Sidebar Collapse",
      property: "translateX",
      from: 156,
      to: 54,
      unit: "px",
      durationMs: 340,
      delayMs: 0,
      curveId: "expo-out",
      roleTitle: "Concentric Rail Collapse",
      guidance: "Retracts cleanly back to a compact 54px icon rail.",
      recommendedRangeMs: [240, 420],
      recommendedPresetIds: ["expo-out", "ios-sheet", "quint-out"],
    }),
    createChannel({
      id: "labelFade",
      label: "Labels Conceal",
      property: "opacity",
      from: 1,
      to: 0,
      unit: "",
      durationMs: 160,
      delayMs: 0,
      curveId: "material-standard",
      roleTitle: "Navigation Label Dissolve",
      guidance:
        "Clears text labels crisply ahead of the sliding workspace edge.",
      recommendedRangeMs: [120, 220],
      recommendedPresetIds: ["material-standard", "ease-out", "quint-out"],
    }),
  ],
}

// ============================================================================
// 6. Tactile Toggles Track (State)
// ============================================================================
export const togglesPressTrack: TransitionTrackPlugin = {
  id: "toggles:press",
  componentId: "toggles",
  componentLabel: "Tactile Toggles",
  category: "Controls",
  phase: "state",
  phaseLabel: "Toggle State",
  triggerLabel: "Toggle Controls",
  channels: [
    createChannel({
      id: "thumb",
      label: "Switch Thumb",
      property: "translateX",
      from: 0,
      to: 16,
      unit: "px",
      durationMs: 260,
      delayMs: 0,
      curveId: "snappy-spring",
      roleTitle: "Switch Snap",
      guidance:
        "Crisp spring travel carries the switch thumb cleanly across its track.",
      recommendedRangeMs: [160, 340],
      recommendedPresetIds: [
        "snappy-spring",
        "button",
        "ios-sheet",
        "quint-out",
      ],
    }),
    createChannel({
      id: "check",
      label: "Check Draw",
      property: "scale",
      from: 0,
      to: 1,
      unit: "",
      durationMs: 240,
      delayMs: 0,
      curveId: "expo-out",
      roleTitle: "Stroke Check Draw",
      guidance:
        "Draws the SVG checkmark path cleanly following a subtle tap impulse.",
      recommendedRangeMs: [160, 320],
      recommendedPresetIds: ["expo-out", "quint-out", "snappy-spring"],
    }),
    createChannel({
      id: "burst",
      label: "Like Burst",
      property: "scale",
      from: 0,
      to: 1,
      unit: "",
      durationMs: 320,
      delayMs: 0,
      curveId: "back-out",
      roleTitle: "Expressive Heart Pop",
      guidance:
        "Overshoots cleanly via Back Out to give favorites joyful weight.",
      recommendedRangeMs: [220, 420],
      recommendedPresetIds: ["back-out", "snappy-spring", "material-pop"],
    }),
  ],
}

// ============================================================================
// 8. Floating & Search Input Tracks (Focus & Blur States)
// ============================================================================
export const inputFocusTrack: TransitionTrackPlugin = {
  id: "input:focus",
  componentId: "input",
  componentLabel: "Floating & Search Input",
  category: "Controls",
  phase: "enter",
  phaseLabel: "Focus",
  triggerLabel: "Focus Input",
  channels: [
    createChannel({
      id: "labelY",
      label: "Label Lift",
      property: "translateY",
      from: 0,
      to: -11,
      unit: "px",
      durationMs: 260,
      delayMs: 0,
      curveId: "expo-out",
      roleTitle: "Floating Label Lift",
      guidance: "Floats the field label smoothly upward as focus enters.",
      recommendedRangeMs: [180, 340],
      recommendedPresetIds: [
        "expo-out",
        "quint-out",
        "ios-sheet",
        "snappy-spring",
      ],
    }),
    createChannel({
      id: "labelScale",
      label: "Label Scale",
      property: "scale",
      from: 1.0,
      to: 0.78,
      unit: "",
      durationMs: 260,
      delayMs: 0,
      curveId: "expo-out",
      roleTitle: "Label Compression",
      guidance: "Scales the label cleanly toward its resting header size.",
      recommendedRangeMs: [180, 340],
      recommendedPresetIds: ["expo-out", "quint-out", "ios-sheet"],
    }),
    createChannel({
      id: "searchClip",
      label: "Search Expand",
      property: "translateX",
      from: 204,
      to: 0,
      unit: "px",
      durationMs: 300,
      delayMs: 0,
      curveId: "expo-out",
      roleTitle: "Concentric Search Reveal",
      guidance:
        "Reveals a fixed-width search bar via GPU clip-path with zero text reflow.",
      recommendedRangeMs: [220, 400],
      recommendedPresetIds: ["expo-out", "ios-sheet", "snappy-spring"],
    }),
  ],
}

export const inputBlurTrack: TransitionTrackPlugin = {
  id: "input:blur",
  componentId: "input",
  componentLabel: "Floating & Search Input",
  category: "Controls",
  phase: "exit",
  phaseLabel: "Blur",
  triggerLabel: "Blur Input",
  channels: [
    createChannel({
      id: "labelY",
      label: "Label Return",
      property: "translateY",
      from: -11,
      to: 0,
      unit: "px",
      durationMs: 220,
      delayMs: 0,
      curveId: "quint-out",
      roleTitle: "Label Settle",
      guidance: "Returns empty label smoothly back to placeholder center.",
      recommendedRangeMs: [160, 280],
      recommendedPresetIds: ["quint-out", "expo-out", "ease-out"],
    }),
    createChannel({
      id: "labelScale",
      label: "Label Restore",
      property: "scale",
      from: 0.78,
      to: 1.0,
      unit: "",
      durationMs: 220,
      delayMs: 0,
      curveId: "quint-out",
      roleTitle: "Label Scale Restore",
      guidance: "Restores label to full body scale.",
      recommendedRangeMs: [160, 280],
      recommendedPresetIds: ["quint-out", "expo-out", "ease-out"],
    }),
    createChannel({
      id: "searchClip",
      label: "Search Collapse",
      property: "translateX",
      from: 0,
      to: 204,
      unit: "px",
      durationMs: 240,
      delayMs: 0,
      curveId: "quint-out",
      roleTitle: "Search Collapse",
      guidance: "Collapses search bar cleanly back to its icon trigger.",
      recommendedRangeMs: [180, 300],
      recommendedPresetIds: ["quint-out", "ios-sheet", "expo-out"],
    }),
  ],
}

// ============================================================================
// 8. OTP & Error Shake Track (State)
// ============================================================================
export const otpVerifyTrack: TransitionTrackPlugin = {
  id: "otp:verify",
  componentId: "otp",
  componentLabel: "OTP & Error Shake",
  category: "Controls",
  phase: "state",
  phaseLabel: "Verify State",
  triggerLabel: "Verify OTP",
  channels: [
    createChannel({
      id: "digitPop",
      label: "Digit Pop",
      property: "scale",
      from: 0.88,
      to: 1.0,
      unit: "",
      durationMs: 240,
      delayMs: 0,
      curveId: "back-out",
      roleTitle: "Cell Entry Pop",
      guidance: "Gives typed OTP digits crisp elastic feedback.",
      recommendedRangeMs: [160, 320],
      recommendedPresetIds: [
        "back-out",
        "snappy-spring",
        "material-pop",
        "expo-out",
      ],
    }),
    createChannel({
      id: "shake",
      label: "Error Shake",
      property: "translateX",
      from: 0,
      to: 10,
      unit: "px",
      durationMs: 380,
      delayMs: 0,
      curveId: "snappy-spring",
      roleTitle: "Damped Shake Decay",
      guidance:
        "Oscillates laterally and decays smoothly to indicate an invalid code.",
      recommendedRangeMs: [260, 500],
      recommendedPresetIds: [
        "snappy-spring",
        "material-pop",
        "quint-out",
        "linear",
      ],
    }),
  ],
}
