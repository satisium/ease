/**
 * @file core/registry/tracks/index.ts
 * @description Transition track registry root: registers and exports all domain tracks.
 *
 * Guaranteed Invariants:
 * - ZERO React or DOM dependencies.
 * - Deterministic, non-mutating list queries.
 * - Preserves canonical registration order for UI pickers and tests.
 */

import type { TrackCategory, TransitionTrackPlugin } from "../../schema"
import { createChannel, trackRegistry } from "./shared"
import {
  dialogOpenTrack,
  dialogCloseTrack,
  drawerOpenTrack,
  drawerCloseTrack,
  sheetOpenTrack,
  sheetCloseTrack,
  dropdownOpenTrack,
  dropdownCloseTrack,
  spotlightOpenTrack,
  spotlightCloseTrack,
  hovercardOpenTrack,
  hovercardCloseTrack,
} from "./overlays"
import {
  buttonPressTrack,
  pillExpandTrack,
  pillCollapseTrack,
  tabsSwitchTrack,
  ctaPressTrack,
  sidebarExpandTrack,
  sidebarCollapseTrack,
  togglesPressTrack,
  inputFocusTrack,
  inputBlurTrack,
  otpVerifyTrack,
} from "./controls"
import {
  toastFireTrack,
  carouselSlideTrack,
  accordionOpenTrack,
  accordionCloseTrack,
  wizardStepTrack,
  progressRunTrack,
} from "./disclosure"
import { landingTracks } from "./landing"
import { primitivesAllTrack } from "./primitives"

// Register in exact canonical order
trackRegistry.registerMany([
  dialogOpenTrack,
  dialogCloseTrack,
  drawerOpenTrack,
  drawerCloseTrack,
  sheetOpenTrack,
  sheetCloseTrack,
  dropdownOpenTrack,
  dropdownCloseTrack,
  spotlightOpenTrack,
  spotlightCloseTrack,
  hovercardOpenTrack,
  hovercardCloseTrack,
  buttonPressTrack,
  pillExpandTrack,
  pillCollapseTrack,
  toastFireTrack,
  tabsSwitchTrack,
  ctaPressTrack,
  sidebarExpandTrack,
  sidebarCollapseTrack,
  togglesPressTrack,
  inputFocusTrack,
  inputBlurTrack,
  otpVerifyTrack,
  carouselSlideTrack,
  accordionOpenTrack,
  accordionCloseTrack,
  wizardStepTrack,
  progressRunTrack,
  ...landingTracks,
  primitivesAllTrack,
])

// Re-export shared primitives and registry
export { trackRegistry, createChannel }

// Re-export individual track definitions
export {
  dialogOpenTrack,
  dialogCloseTrack,
  drawerOpenTrack,
  drawerCloseTrack,
  sheetOpenTrack,
  sheetCloseTrack,
  dropdownOpenTrack,
  dropdownCloseTrack,
  spotlightOpenTrack,
  spotlightCloseTrack,
  hovercardOpenTrack,
  hovercardCloseTrack,
} from "./overlays"
export {
  buttonPressTrack,
  pillExpandTrack,
  pillCollapseTrack,
  tabsSwitchTrack,
  ctaPressTrack,
  sidebarExpandTrack,
  sidebarCollapseTrack,
  togglesPressTrack,
  inputFocusTrack,
  inputBlurTrack,
  otpVerifyTrack,
} from "./controls"
export {
  toastFireTrack,
  carouselSlideTrack,
  accordionOpenTrack,
  accordionCloseTrack,
  wizardStepTrack,
  progressRunTrack,
} from "./disclosure"
export { landingTracks, heroRevealTrack, flipWordsCycleTrack } from "./landing"
export { primitivesAllTrack } from "./primitives"

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
  category: TrackCategory
  tracks: TransitionTrackPlugin[]
}

export interface ListComponentsOptions {
  includePrimitives?: boolean
}

/**
 * Lists all distinct interactive UI components registered in the track registry,
 * grouped with their associated phase tracks in registration order (excluding "primitives" by default).
 *
 * @param options - Optional configuration (e.g. { includePrimitives: true }).
 * @returns Array of ComponentTrackGroup objects for UI component pickers.
 */
export function listComponents(
  options?: ListComponentsOptions
): ComponentTrackGroup[] {
  const groups: ComponentTrackGroup[] = []
  const groupMap = new Map<string, ComponentTrackGroup>()

  for (const track of trackRegistry.list()) {
    if (track.componentId === "primitives" && !options?.includePrimitives) {
      continue
    }

    let existing = groupMap.get(track.componentId)
    if (!existing) {
      existing = {
        componentId: track.componentId,
        componentLabel:
          track.componentId === "primitives"
            ? "Primitives"
            : track.componentLabel,
        category:
          track.category ??
          (track.componentId === "primitives" ? "Lab" : "Overlays"),
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
    expand: "collapse",
    collapse: "expand",
    focus: "blur",
    blur: "focus",
  }

  const opposite = opposites[phase]
  if (!opposite) return null

  const candidate = `${component}:${opposite}`
  return trackRegistry.has(candidate) ? candidate : null
}
