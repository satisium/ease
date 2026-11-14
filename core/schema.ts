/**
 * @file core/schema.ts
 * @description Canonical data models and interfaces for Satisium Ease.
 *
 * Strictly 100% headless:
 * - ZERO React or JSX imports
 * - ZERO DOM/window/document references
 * - Single source of truth for curves, channels, tracks, telemetry, and Git-inspired states.
 */

// ============================================================================
// 1. Primitive Scalar & Union Types
// ============================================================================

/** The active mathematical physics engine. */
export type MotionEngine = "bezier" | "spring"

/**
 * Single-page in-place studio modes.
 * Workspace slabs cross-fade and reconfigure without URL route changes.
 */
export type StudioMode = "preview" | "customize" | "compare"

/** Viewport preview constraints for responsive component habitats. */
export type ViewportPreset = "desktop" | "tablet" | "mobile"

/** Phase lifecycle for interactive component transitions. */
export type TrackPhase = "enter" | "exit" | "state"

/**
 * Spring duration reconciliation modes.
 * - "fit": Perceptual-Fit Mode. Maps spring character (damping ratio ζ) to the channel's
 *          choreographed durationMs so component timings remain synchronized.
 * - "natural": Natural Physics Mode. Unlocks raw physical settling time (ts) dictated
 *              by mass, stiffness, and damping.
 */
export type SpringDurationMode = "fit" | "natural"

/** Supported animatable CSS transform & composite property channels. */
export type AnimatableProperty =
  "opacity" | "translateY" | "translateX" | "scale" | "rotate" | "blur"

/** Standard engineering units for animated channels. */
export type ChannelUnit = "px" | "%" | "deg" | ""

// ============================================================================
// 2. Mathematical Parameters
// ============================================================================

/** 2D coordinate point in normalized motion space. */
export interface Point2D {
  x: number
  y: number
}

/**
 * Parameters for a 2-handle cubic Bézier curve.
 * Handles:
 * - p0 is anchored at (0, 0)
 * - p1 is the first control handle (x clamped [0, 1], y can overshoot)
 * - p2 is the second control handle (x clamped [0, 1], y can overshoot)
 * - p3 is anchored at (1, 1)
 */
export interface BezierParams {
  p1: Point2D
  p2: Point2D
}

/**
 * Parameters for an analytical second-order spring differential system:
 * m * d²x/dt² + c * dx/dt + k * x = 0
 */
export interface SpringParams {
  /** Mass of the moving element (m > 0, standard default = 1). */
  mass: number
  /** Spring stiffness / tension constant (k > 0). */
  stiffness: number
  /** Damping / resistance coefficient (c > 0). */
  damping: number
  /** Initial launch velocity (v0). Populated on mid-flight interrupts or gestures. */
  velocity: number
}

// ============================================================================
// 3. EaseCurve (Atomic Motion Asset)
// ============================================================================

/**
 * Atomic kinetic curve specification.
 *
 * Invariant Guarantees:
 * 1. Both `bezier` and `spring` parameter structs are ALWAYS populated.
 *    Switching engines in the UI is instantaneous and never crashes.
 * 2. Curves DO NOT dictate component duration (`durationMs` is owned by `ChannelBinding`).
 * 3. Max-2-tier Git hierarchy: Root -> Variants[] (zero nested "Flavors").
 */
export interface EaseCurve {
  /** Unique stable identifier (e.g. "expo-out", "custom-modal-sheet-v1"). */
  id: string
  /** Human-readable display name (e.g. "Expo Out", "Modal Sheet"). */
  name: string
  /** Active evaluation engine. */
  engine: MotionEngine
  /** Parameter definition for cubic-bezier solver. */
  bezier: BezierParams
  /** Parameter definition for analytical ODE spring solver. */
  spring: SpringParams
  /** Suggested default duration for standalone preview or Primitives X-Ray. */
  suggestedDurationMs: number
  /** True if this is a user-created or user-forked custom curve. */
  isCustom?: boolean
  /** Lineage: ID of the parent preset or root curve from which this was forked. */
  parentId?: string
  /** Lineage: Name of the parent preset or root curve. */
  parentName?: string
  /** Categorical grouping (e.g. "Standard", "Emphasized", "Decel", "Bounce"). */
  category?: string
  /** Editorial description of the motion feeling. */
  description?: string
  /** Recommended UI use cases (e.g. ["Modals", "Navigation Drawers"]). */
  useCases?: string[]
  /** 2-tier Git variants under this root curve (never deeply nested). */
  variants?: EaseCurve[]
}

// ============================================================================
// 4. Channel Choreography & Transition Tracks
// ============================================================================

/**
 * Semantic context and guidance for a property channel.
 * Powers the Right Flank Motion Guide in Audition Mode.
 */
export interface ChannelSemanticContext {
  /** Descriptive role name (e.g. "Focal Surface Scale", "Backdrop Scrim"). */
  roleTitle: string
  /** Physics-backed guidance explaining why certain curve types belong here. */
  guidance: string
  /** Recommended duration window in milliseconds: [minMs, maxMs]. */
  recommendedRangeMs: [number, number]
  /** Curated preset IDs recommended for this channel. */
  recommendedPresetIds: string[]
}

/**
 * Binding of an individual property channel within a transition track.
 *
 * Enforces the Duration Integrity Law:
 * - `durationMs` is strictly owned by the channel choreography, NOT the curve.
 * - When testing springs in "natural" mode, `savedBezierDurationMs` preserves the
 *   original choreographed timing so switching back restores it perfectly.
 */
export interface ChannelBinding {
  /** Channel identifier (e.g. "backdrop", "translateY", "scale"). */
  id: string
  /** Display label for the Center Dock Channel Strip (e.g. "Translate Y"). */
  label: string
  /** Target CSS/DOM property being animated. */
  property: AnimatableProperty
  /** Starting numerical value at t = 0ms. */
  from: number
  /** Resting destination value at completion. */
  to: number
  /** Unit applied to the property value. */
  unit: ChannelUnit
  /** Choreographed duration in milliseconds. Owned by the component track. */
  durationMs: number
  /** Preserved duration when toggling into natural spring mode. */
  savedBezierDurationMs: number
  /** Choreographed stagger delay in milliseconds before this channel begins. */
  delayMs: number
  /** Reconciliation mode when `curve.engine === "spring"`. */
  springMode: SpringDurationMode
  /** The kinetic curve assigned to this channel. */
  curve: EaseCurve
  /** Motion advice and recommended ranges for this specific role. */
  semanticContext: ChannelSemanticContext
}

/**
 * Self-contained transition track plugin specification.
 * Registered via the open/closed track registry (`core/registry/tracks.ts`).
 */
export interface TransitionTrackPlugin {
  /** Unique track identifier (e.g. "dialog:open", "dropdown:close"). */
  id: string
  /** Component family grouping (e.g. "dialog", "drawer", "dropdown", "primitives"). */
  componentId: string
  /** Display label for the component (e.g. "Modal Dialog"). */
  componentLabel: string
  /** Phase lifecycle of this track. */
  phase: TrackPhase
  /** Phase display label (e.g. "Entrance", "Exit"). */
  phaseLabel: string
  /** Action trigger label (e.g. "Edit Profile", "Open Menu"). */
  triggerLabel: string
  /** All decoupled property channels choreographed by this track. */
  channels: ChannelBinding[]
}

// ============================================================================
// 5. Git-Inspired Working Tree & Draft State
// ============================================================================

/**
 * Non-destructive working tree draft state.
 * Mutating handles or physics sliders populates this state (`*`), protecting
 * saved library curves until committed or reverted.
 */
export interface DraftCurveState {
  /** ID of the curve currently being edited. */
  sourceCurveId: string
  /** Origin tier of the curve being edited. */
  sourceScope: "preset" | "custom-root" | "custom-variant"
  /** Unmutated baseline curve used for `Revert` and live Git diff telemetry. */
  parentCurve: EaseCurve
  /** Live mutated draft curve (marked with `*` in the UI). */
  workingCurve: EaseCurve
  /** True when workingCurve differs from parentCurve. */
  isDirty: boolean
}

// ============================================================================
// 6. Duel & Comparison Interfaces
// ============================================================================

/** A single contender curve staged in the Compare Queue. */
export interface CompareItem {
  /** Unique identifier for the queue entry. */
  id: string
  /** The curve being compared. */
  curve: EaseCurve
  /** Whether this tile is actively rendered in the max 2-row grid. */
  visible: boolean
  /** Optional per-tile override to test a different track on this contender. */
  overrideTrackId?: string
  /** Optional per-tile override to test a different channel on this contender. */
  overrideChannelId?: string
}

// ============================================================================
// 7. Telemetry & Frame Evaluation Interfaces
// ============================================================================

/** Real-time physical and kinetic diagnostic metrics for a curve. */
export interface CurveTelemetry {
  /** Damping ratio ζ (null for Béziers). */
  dampingRatio: number | null
  /** Undamped natural frequency ω_n in rad/s (null for Béziers). */
  naturalFrequency: number | null
  /** Settling time (ts) in milliseconds to settle within 0.5%–1% threshold. */
  settlingTimeMs: number
  /** Time-to-95% (t95) in milliseconds: exact arrival at 95% of destination. */
  timeTo95Ms: number
  /** Maximum instantaneous velocity during transition. */
  peakVelocity: number
  /** Peak overshoot percentage beyond 1.0 (e.g. 1.9 for 1.9%). */
  overshootPercent: number
  /** Motion classification descriptor. */
  classification:
    | "Underdamped"
    | "Critically Damped"
    | "Overdamped"
    | "Decelerating"
    | "Accelerating"
    | "S-Curve"
    | "Linear"
}

/** Real-time diff between an uncommitted draft and its saved baseline. */
export interface CurveDiffTelemetry {
  /** Difference in arrival time: draft t95 - parent t95 (e.g. -37ms = faster). */
  t95DeltaMs: number
  /** Difference in overshoot percentage (e.g. +1.9%). */
  overshootDeltaPercent: number
  /** Difference in peak velocity multiplier (e.g. +0.8x). */
  peakVelocityDelta: number
  /** Human-readable diff bullets for Customize Mode's Right Flank. */
  summaryBullets: string[]
}

/** Telemetry card data for a single contender tile in Compare Mode. */
export interface DuelTileTelemetry {
  tileId: string
  curve: EaseCurve
  durationMs: number
  telemetry: CurveTelemetry
  /** Arrival rank (1 = fastest t95 arrival). */
  rank: number
  /** True if this tile is the top-ranked arrival contender. */
  isWinner?: boolean
}

/** Benchmark summary comparing all visible tiles in a Duel. */
export interface DuelEvaluation {
  tiles: DuelTileTelemetry[]
  fastestTileId: string
  settleDeltaMs: number
}

/**
 * Output of a single frame evaluation from `evaluateTrackFrame()`.
 * Evaluated without React allocations for 120fps direct DOM ref application.
 */
export interface TrackFrameResult {
  /** Numerical value evaluated for each channel by channel ID. */
  values: Record<string, number>
  /** True when all channels in the track have settled at rest. */
  isComplete: boolean
  /** Exact wall-clock elapsed time evaluated in milliseconds. */
  elapsedMs: number
}
