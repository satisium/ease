/**
 * @file core/registry/tracks.ts
 * @description Transition track plugin registry with all 11 built-in component tracks.
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
} from "../schema"
import {
  DEFAULT_FALLBACK_CURVE,
  getCanonicalPresetById,
} from "../presets/index"
import { PluginRegistry } from "./plugin-registry"

/** Helper to build a ChannelBinding adhering to the Duration Integrity Law. */
function createChannel(params: {
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

// ============================================================================
// 1. Modal Dialog Tracks (Entrance & Exit)
// ============================================================================
trackRegistry.register({
  id: "dialog:open",
  componentId: "dialog",
  componentLabel: "Modal Dialog",
  phase: "enter",
  phaseLabel: "Entrance",
  triggerLabel: "Open Dialog",
  channels: [
    createChannel({
      id: "backdrop",
      label: "Backdrop",
      property: "opacity",
      from: 0,
      to: 0.45,
      unit: "",
      durationMs: 180,
      delayMs: 0,
      curveId: "material-decelerate",
      roleTitle: "Backdrop Scrim",
      guidance: "Gentle opacity ramp prevents visual startling.",
      recommendedRangeMs: [150, 240],
      recommendedPresetIds: ["material-decelerate", "ease-out", "gentle"],
    }),
    createChannel({
      id: "opacity",
      label: "Opacity",
      property: "opacity",
      from: 0,
      to: 1,
      unit: "",
      durationMs: 220,
      delayMs: 0,
      curveId: "ease-out",
      roleTitle: "Modal Surface Reveal",
      guidance:
        "Smooth opacity fade-in prevents visual popping of the dialog card.",
      recommendedRangeMs: [160, 260],
      recommendedPresetIds: ["ease-out", "linear", "gentle"],
    }),
    createChannel({
      id: "translateY",
      label: "Translate Y",
      property: "translateY",
      from: 36,
      to: 0,
      unit: "px",
      durationMs: 280,
      delayMs: 25,
      curveId: "ease-out-quart",
      roleTitle: "Surface Elevation",
      guidance: "Decelerating vertical translation grounds the dialog.",
      recommendedRangeMs: [240, 360],
      recommendedPresetIds: [
        "ease-out-quart",
        "expo-out",
        "material-emphasized",
        "snappy-spring",
      ],
    }),
    createChannel({
      id: "scale",
      label: "Scale",
      property: "scale",
      from: 0.92,
      to: 1.0,
      unit: "",
      durationMs: 280,
      delayMs: 25,
      curveId: "expo-out",
      roleTitle: "Focal Surface Scale",
      guidance: "Subtle scale expansion focuses cognitive attention.",
      recommendedRangeMs: [200, 320],
      recommendedPresetIds: [
        "expo-out",
        "ease-out-quart",
        "snappy-spring",
        "ios-fluid",
      ],
    }),
  ],
})

trackRegistry.register({
  id: "dialog:close",
  componentId: "dialog",
  componentLabel: "Modal Dialog",
  phase: "exit",
  phaseLabel: "Exit",
  triggerLabel: "Close Dialog",
  channels: [
    createChannel({
      id: "backdrop",
      label: "Backdrop",
      property: "opacity",
      from: 0.45,
      to: 0,
      unit: "",
      durationMs: 160,
      delayMs: 30,
      curveId: "expo-in",
      roleTitle: "Backdrop Dismissal",
      guidance: "Fast background clearing reveals underlying content.",
      recommendedRangeMs: [120, 200],
      recommendedPresetIds: ["expo-in", "material-accelerate", "power2-in"],
    }),
    createChannel({
      id: "opacity",
      label: "Opacity",
      property: "opacity",
      from: 1,
      to: 0,
      unit: "",
      durationMs: 160,
      delayMs: 0,
      curveId: "expo-in",
      roleTitle: "Modal Surface Dissolve",
      guidance: "Decisive opacity dissolve quickly clears the modal card.",
      recommendedRangeMs: [120, 200],
      recommendedPresetIds: ["expo-in", "material-accelerate", "power2-in"],
    }),
    createChannel({
      id: "translateY",
      label: "Translate Y",
      property: "translateY",
      from: 0,
      to: 28,
      unit: "px",
      durationMs: 180,
      delayMs: 0,
      curveId: "expo-in",
      roleTitle: "Surface Drop",
      guidance: "Accelerating downward departure conveys decisive dismissal.",
      recommendedRangeMs: [140, 220],
      recommendedPresetIds: ["expo-in", "material-accelerate", "power3-in"],
    }),
    createChannel({
      id: "scale",
      label: "Scale",
      property: "scale",
      from: 1.0,
      to: 0.94,
      unit: "",
      durationMs: 180,
      delayMs: 0,
      curveId: "expo-in",
      roleTitle: "Scale Recede",
      guidance: "Slight receding contraction prevents edge popping.",
      recommendedRangeMs: [140, 220],
      recommendedPresetIds: ["expo-in", "material-accelerate", "power2-in"],
    }),
  ],
})

// ============================================================================
// 2. Drawer Sheet Tracks (Entrance & Exit)
// ============================================================================
trackRegistry.register({
  id: "drawer:open",
  componentId: "drawer",
  componentLabel: "Drawer Sheet",
  phase: "enter",
  phaseLabel: "Entrance",
  triggerLabel: "Open Drawer",
  channels: [
    createChannel({
      id: "backdrop",
      label: "Backdrop",
      property: "opacity",
      from: 0,
      to: 0.4,
      unit: "",
      durationMs: 240,
      delayMs: 0,
      curveId: "ease-out",
      roleTitle: "Scrim Wash",
      guidance: "Smooth scrim wash darkens main workspace.",
      recommendedRangeMs: [200, 300],
      recommendedPresetIds: ["ease-out", "material-decelerate", "gentle"],
    }),
    createChannel({
      id: "translateX",
      label: "Translate X",
      property: "translateX",
      from: 100,
      to: 0,
      unit: "%",
      durationMs: 340,
      delayMs: 0,
      curveId: "ios-fluid",
      roleTitle: "Drawer Slide",
      guidance: "Horizontal slide along the primary edge.",
      recommendedRangeMs: [280, 420],
      recommendedPresetIds: [
        "ios-fluid",
        "drawer",
        "snappy-spring",
        "power3-out",
      ],
    }),
  ],
})

trackRegistry.register({
  id: "drawer:close",
  componentId: "drawer",
  componentLabel: "Drawer Sheet",
  phase: "exit",
  phaseLabel: "Exit",
  triggerLabel: "Close Drawer",
  channels: [
    createChannel({
      id: "backdrop",
      label: "Backdrop",
      property: "opacity",
      from: 0.4,
      to: 0,
      unit: "",
      durationMs: 200,
      delayMs: 20,
      curveId: "ease-in",
      roleTitle: "Scrim Clear",
      guidance: "Scrim fade clears the canvas as drawer exits.",
      recommendedRangeMs: [160, 240],
      recommendedPresetIds: ["ease-in", "material-accelerate", "expo-in"],
    }),
    createChannel({
      id: "translateX",
      label: "Translate X",
      property: "translateX",
      from: 0,
      to: 100,
      unit: "%",
      durationMs: 240,
      delayMs: 0,
      curveId: "power2-in",
      roleTitle: "Drawer Retract",
      guidance: "Clean edge retraction out of viewport bounds.",
      recommendedRangeMs: [200, 300],
      recommendedPresetIds: ["power2-in", "material-accelerate", "expo-in"],
    }),
  ],
})

// ============================================================================
// 3. Filter Dropdown Tracks (Entrance & Exit)
// ============================================================================
trackRegistry.register({
  id: "dropdown:open",
  componentId: "dropdown",
  componentLabel: "Filter Dropdown",
  phase: "enter",
  phaseLabel: "Entrance",
  triggerLabel: "Open Dropdown",
  channels: [
    createChannel({
      id: "opacity",
      label: "Opacity",
      property: "opacity",
      from: 0,
      to: 1,
      unit: "",
      durationMs: 150,
      delayMs: 0,
      curveId: "linear",
      roleTitle: "Flyout Reveal",
      guidance: "Quick opacity fade prevents popup lag.",
      recommendedRangeMs: [100, 180],
      recommendedPresetIds: ["linear", "ease-out", "ultra-fast"],
    }),
    createChannel({
      id: "translateY",
      label: "Translate Y",
      property: "translateY",
      from: -8,
      to: 0,
      unit: "px",
      durationMs: 200,
      delayMs: 0,
      curveId: "power2-out",
      roleTitle: "Flyout Drop",
      guidance: "Small anchor nudge indicates provenance.",
      recommendedRangeMs: [160, 240],
      recommendedPresetIds: ["power2-out", "ease-out-quart", "snappy-spring"],
    }),
    createChannel({
      id: "scale",
      label: "Scale",
      property: "scale",
      from: 0.95,
      to: 1.0,
      unit: "",
      durationMs: 200,
      delayMs: 0,
      curveId: "expo-out",
      roleTitle: "Anchor Pop",
      guidance: "Micro-scale expansion from trigger anchor.",
      recommendedRangeMs: [160, 240],
      recommendedPresetIds: ["expo-out", "snappy-spring", "button"],
    }),
  ],
})

trackRegistry.register({
  id: "dropdown:close",
  componentId: "dropdown",
  componentLabel: "Filter Dropdown",
  phase: "exit",
  phaseLabel: "Exit",
  triggerLabel: "Close Dropdown",
  channels: [
    createChannel({
      id: "opacity",
      label: "Opacity",
      property: "opacity",
      from: 1,
      to: 0,
      unit: "",
      durationMs: 140,
      delayMs: 0,
      curveId: "power2-in",
      roleTitle: "Flyout Dissolve",
      guidance: "Fast dissolve avoids lingering popover clutter.",
      recommendedRangeMs: [100, 160],
      recommendedPresetIds: ["power2-in", "expo-in", "ultra-fast"],
    }),
    createChannel({
      id: "translateY",
      label: "Translate Y",
      property: "translateY",
      from: 0,
      to: -6,
      unit: "px",
      durationMs: 140,
      delayMs: 0,
      curveId: "power2-in",
      roleTitle: "Anchor Retract",
      guidance: "Subtle return nudge toward trigger origin.",
      recommendedRangeMs: [100, 160],
      recommendedPresetIds: ["power2-in", "expo-in", "material-accelerate"],
    }),
    createChannel({
      id: "scale",
      label: "Scale",
      property: "scale",
      from: 1.0,
      to: 0.96,
      unit: "",
      durationMs: 140,
      delayMs: 0,
      curveId: "power2-in",
      roleTitle: "Scale Shrink",
      guidance: "Recedes into trigger element.",
      recommendedRangeMs: [100, 160],
      recommendedPresetIds: ["power2-in", "expo-in", "ultra-fast"],
    }),
  ],
})

// ============================================================================
// 4. Tactile Button Track (Press State)
// ============================================================================
trackRegistry.register({
  id: "button:press",
  componentId: "button",
  componentLabel: "Tactile Button",
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
})

// ============================================================================
// 5. Status Toast Track (Entrance)
// ============================================================================
trackRegistry.register({
  id: "toast:fire",
  componentId: "toast",
  componentLabel: "Status Toast",
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
})

// ============================================================================
// 6. Segmented Tabs Track (Switch State)
// ============================================================================
trackRegistry.register({
  id: "tabs:switch",
  componentId: "tabs",
  componentLabel: "Segmented Tabs",
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
})

// ============================================================================
// 7. Inertial Carousel Track (Slide State)
// ============================================================================
trackRegistry.register({
  id: "carousel:slide",
  componentId: "carousel",
  componentLabel: "Inertial Carousel",
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
})

// ============================================================================
// 8. Primitives X-Ray Track (State)
// ============================================================================
trackRegistry.register({
  id: "primitives:all",
  componentId: "primitives",
  componentLabel: "Primitives X-Ray",
  phase: "state",
  phaseLabel: "Full Range Inspection",
  triggerLabel: "Run Test Suite",
  channels: [
    createChannel({
      id: "position",
      label: "Translate X",
      property: "translateX",
      from: 0,
      to: 100,
      unit: "%",
      durationMs: 300,
      delayMs: 0,
      curveId: "ease-out-quart",
      roleTitle: "Linear Path X-Ray",
      guidance:
        "Translational reference track for inspecting arrival kinetics.",
      recommendedRangeMs: [200, 400],
      recommendedPresetIds: [
        "ease-out-quart",
        "snappy-spring",
        "expo-out",
        "linear",
      ],
    }),
    createChannel({
      id: "scale",
      label: "Scale",
      property: "scale",
      from: 0.5,
      to: 1.0,
      unit: "",
      durationMs: 300,
      delayMs: 0,
      curveId: "expo-out",
      roleTitle: "Scale X-Ray",
      guidance: "Scalar reference for verifying non-linear expansion.",
      recommendedRangeMs: [200, 400],
      recommendedPresetIds: ["expo-out", "snappy-spring", "ease-out-quart"],
    }),
    createChannel({
      id: "opacity",
      label: "Opacity",
      property: "opacity",
      from: 0,
      to: 1.0,
      unit: "",
      durationMs: 300,
      delayMs: 0,
      curveId: "linear",
      roleTitle: "Opacity X-Ray",
      guidance: "Alpha channel reference for verifying clamp protection.",
      recommendedRangeMs: [150, 350],
      recommendedPresetIds: ["linear", "ease-out", "material-decelerate"],
    }),
    createChannel({
      id: "rotate",
      label: "Rotate",
      property: "rotate",
      from: 0,
      to: 180,
      unit: "deg",
      durationMs: 300,
      delayMs: 0,
      curveId: "snappy-spring",
      roleTitle: "Angular X-Ray",
      guidance: "Rotational reference for inspecting overshoot physics.",
      recommendedRangeMs: [250, 450],
      recommendedPresetIds: ["snappy-spring", "ios-fluid", "material-pop"],
    }),
  ],
})

// ============================================================================
// Helper Exports
// ============================================================================

/**
 * Retrieves a transition track plugin by its unique ID.
 *
 * @param id - Track ID (e.g. "dialog:open", "button:press").
 * @returns TransitionTrackPlugin or undefined if not found.
 */
export function getTrackPlugin(id: string): TransitionTrackPlugin | undefined {
  return trackRegistry.get(id)
}

/**
 * Returns all real UI component tracks (excluding the virtual "primitives" X-Ray track).
 * Used by Center Stage Audition Mode track selector.
 *
 * @returns Array of 10 real component transition tracks.
 */
export function listComponentTracks(): TransitionTrackPlugin[] {
  return trackRegistry
    .list()
    .filter((track) => track.componentId !== "primitives")
}

/**
 * Returns all phase tracks for a specific component family (e.g. "dialog", "drawer").
 *
 * @param componentId - The component family identifier.
 * @returns Array of matching tracks.
 */
export function getTracksForComponent(
  componentId: string
): TransitionTrackPlugin[] {
  return trackRegistry
    .list()
    .filter((track) => track.componentId === componentId)
}

/** Grouped UI component identity with all associated transition tracks. */
export interface ComponentTrackGroup {
  componentId: string
  componentLabel: string
  tracks: TransitionTrackPlugin[]
}

/**
 * Lists all distinct interactive UI components registered in the track registry,
 * grouped with their associated phase tracks in registration order (excluding "primitives").
 *
 * @returns Array of ComponentTrackGroup objects for UI component pickers.
 */
export function listComponents(): ComponentTrackGroup[] {
  const groups: ComponentTrackGroup[] = []
  const groupMap = new Map<string, ComponentTrackGroup>()

  for (const track of trackRegistry.list()) {
    if (track.componentId === "primitives") continue

    let existing = groupMap.get(track.componentId)
    if (!existing) {
      existing = {
        componentId: track.componentId,
        componentLabel: track.componentLabel,
        tracks: [],
      }
      groupMap.set(track.componentId, existing)
      groups.push(existing)
    }
    existing.tracks.push(track)
  }

  return groups
}

/**
 * Resolves the deterministic inverse paired track ID for an interactive phase transition
 * (e.g. "dialog:open" <-> "dialog:close", "drawer:open" <-> "drawer:close", "dropdown:open" <-> "dropdown:close").
 *
 * Returns null if the track has no registered opposite or is a single-phase trigger (e.g. "button:press", "toast:fire").
 *
 * @param trackId - Active track identifier (e.g. "dialog:open").
 * @returns The inverse paired track ID or null if none exists.
 */
export function getPairedTrackId(trackId: string): string | null {
  const [component, phase] = trackId.split(":")
  if (!component || !phase) return null

  const opposites: Record<string, string> = {
    open: "close",
    close: "open",
    enter: "exit",
    exit: "enter",
    press: "release",
    release: "press",
  }

  const opposite = opposites[phase]
  if (!opposite) return null

  const candidate = `${component}:${opposite}`
  return trackRegistry.has(candidate) ? candidate : null
}
