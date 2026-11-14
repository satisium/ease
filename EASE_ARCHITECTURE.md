# Satisium Ease (`ease.satisium.com`)

## Master Headless Core & Plugin Architecture Specification

> **Document Type:** Technical Architecture Blueprint  
> **Companion Spec:** [`EASE_USER_FLOW.md`](file:///home/satishkumar/Desktop/The%20Satisium%20Umbrella/ease/EASE_USER_FLOW.md)  
> **Architectural Paradigm:** 100% Headless Core + Open/Closed Plugin Registries + Imperative 120fps Execution Plane  
> **Non-Negotiable Rule:** Zero React, zero JSX, and zero DOM stylesheets inside `core/`.

---

## 0. Architectural Principles & Strict Boundaries

---

1. **Product Scope Lock (`ease.satisium.com` Only):**  
   This architecture models **individual Bézier curves, analytical Springs, targeted component Transition Tracks, Git-inspired curve branching, side-by-side Curve Duels, and multi-framework code export**. Full-application Motion Design Systems (`motion.satisium.com`) are strictly out of scope.
2. **True Headless Core (`core/`):**  
   All physics solvers, frame evaluators, 120fps clocks, Git tree reducers, exporters, and state slices run in pure TypeScript (`zustand/vanilla`) with **zero `react` imports**. The entire engine runs deterministically in Node.js / Vitest without a browser.
3. **Open/Closed Plugin Registries (`core/registry/`):**  
   Adding a new UI Component/Track (e.g., `Accordion`), a new Curve Engine (e.g., `Steps`), or a new Code Exporter (e.g., `SwiftUI`) requires registering **one self-contained plugin definition**—touching zero store logic, zero evaluation pipelines, and zero existing UI docks.
4. **Zero-Re-Render 120fps Execution Plane:**  
   Animation playback (`elapsedMs`) **never** triggers React state updates (`useState` / Zustand subscribers) on every frame. The `TrackConductor` broadcasts frame values directly to DOM element refs and SVG playhead refs via imperative callbacks.
5. **In-Process Stage Execution (No External Iframes):**  
   All interactive preview widgets and habitats run in-process inside contained React trees bound via `useTransitionTrack()`, eliminating `postMessage` serialization lag, CORS/CSP failures, and `MutationObserver` feedback loops.

---

## 1. System Topology & Directory Blueprint

```text
ease/
├── core/                                    # 🧠 100% HEADLESS ENGINE (Pure TypeScript, 0 React imports)
│   ├── schema.ts                            # Canonical types: EaseCurve, ChannelBinding, TransitionTrack, Draft, Duel
│   ├── index.ts                             # Public Headless SDK barrel export
│   │
│   ├── registry/                            # 🔌 OPEN/CLOSED PLUGIN REGISTRIES
│   │   ├── plugin-registry.ts               # Generic typed register() / get() / list() factory
│   │   ├── solvers.ts                       # SolverPlugin registry ("bezier" | "spring")
│   │   ├── tracks.ts                        # TransitionTrackPlugin registry (Dialog, Drawer, Dropdown, Button, Toast, Tabs, Carousel, Primitives)
│   │   └── exporters.ts                     # ExporterPlugin registry (CSS, Tailwind, Motion, GSAP — Channel & Full-Track scopes)
│   │
│   ├── math/                                # 📐 DETERMINISTIC PHYSICS & DIAGNOSTICS
│   │   ├── bezier.ts                        # Newton-Raphson + Bisection solver, velocity dx/dt, overshoot scan, auto-zoom bounds
│   │   ├── spring.ts                        # Closed-form ODE (m,k,c,v0), Apple perceptual duration-fit, linear() quantizer, SVG path compiler
│   │   ├── telemetry.ts                     # ζ, ts, t95 arrival, peak velocity, overshoot %, Git diff vs parent, Duel delta ranker
│   │   ├── evaluator.ts                     # evaluateTrackFrame() — multi-channel, Smart Opacity, Solo (S), Reduced Motion (♿)
│   │   └── parser.ts                        # parseCurveString() — cubic-bezier(...), [x1,y1,x2,y2], spring(...)
│   │
│   ├── clock/                               # ⏱️ ZERO-RE-RENDER 120FPS CONDUCTOR
│   │   └── track-conductor.ts               # Scoped RAF clock: elapsedMs, live vs scrub, Loop Delay, shouldForceMount, v0 interrupt
│   │
│   ├── presets/                             # 📚 IMMUTABLE CURATED CATALOG
│   │   ├── bezier-presets.ts                # 31 canonical Bézier presets
│   │   ├── spring-presets.ts                # 25 canonical Spring presets
│   │   └── default-customs.ts               # Starter 2-tier Git curves (Modal Sheet +3, Drawer Physics +2)
│   │
│   ├── state/                               # 🌳 PURE FUNCTIONAL REDUCERS (Zero side effects)
│   │   ├── curve-tree-reducers.ts           # 2-tier Git tree, Draft (*), Revert, Commit, Fork, Clean Promote, Safe Delete
│   │   ├── track-reducers.ts                # Duration Integrity curve swap, duration edit, springMode toggle
│   │   └── compare-reducers.ts              # Queue staging, visibility toggles, global sync vs per-tile override
│   │
│   ├── codec/                               # 🔗 SERIALIZATION, MIGRATION & SEARCH
│   │   ├── url-hash.ts                      # Lossless URL #hash encode/decode (track + channel + curve + duration)
│   │   ├── storage.ts                       # Schema-versioned persistence (v2) & safe legacy 3-tier migration
│   │   └── search.ts                        # Unified ⌘K search index across presets, custom curves, variants, & tracks
│   │
│   └── store/                               # 🏪 FRAMEWORK-AGNOSTIC HEADLESS STORE
│       └── create-ease-store.ts             # Sliced Zustand vanilla store (~250 LOC) composing all domain slices
│
├── hooks/                                   # 🔌 THIN REACT ADAPTER LAYER (Only place bridging Core <-> React)
│   ├── use-ease-store.ts                    # React context + shallow selector binding for create-ease-store
│   ├── use-transition-track.ts              # Binds preview widgets to TrackConductor (DOM refs + shouldForceMount)
│   └── use-clock-ref.ts                     # Binds SVG playhead dot / scrubber thumb directly to 120fps RAF ticks
│
└── components/                              # 🎨 VISUAL SHELL (Dumb Presentational UI + In-Place Morphing Blocks)
    └── ...                                  # Reads state from hooks/, renders Tailwind/Motion layout transitions
```

---

## 2. 100% Narrative-to-Module Traceability Matrix

Every requirement in `EASE_USER_FLOW.md` maps directly to a dedicated owner in `core/`:

| Requirement / Law                                      | Module Owner                                       | Exact Guarantee                                                                                                                                               |
| :----------------------------------------------------- | :------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Duration Integrity Law**                             | `schema.ts` + `track-reducers.ts`                  | Presets carry zero forced component duration; `ChannelBinding` owns `durationMs` and `savedBezierDurationMs`.                                                 |
| **Perceptual Spring-Fit vs. Natural Physics**          | `math/spring.ts`                                   | `"fit"` mode solves $k=(2\pi/T)^2, c=2\zeta\sqrt{km}$ to preserve component timing; `"natural"` runs at $t_s$ while preserving `savedBezierDurationMs`.       |
| **Scoped Track Scrubbing & Unmount Safety**            | `clock/track-conductor.ts`                         | `focusedTrackId` + `shouldForceMount(trackId)` keeps closed/exiting elements mounted while scrubbing or soloing.                                              |
| **Free Interaction Auto-Capture + `Pin`**              | `clock/track-conductor.ts`                         | `triggerLive(trackId)` runs natural interaction AND focuses `focusedTrackId` automatically unless `isPinned === true`.                                        |
| **Multi-Channel, Smart `All`, & `Solo (S)`**           | `math/evaluator.ts`                                | `All` clamps `opacity` channels to `[0, 1]` non-overshooting fades; `Solo` freezes siblings at their visible open rest state (`to` on enter, `from` on exit). |
| **Mid-Flight `Interrupt (I)` ($v_0$ vs $v_0=0$)**      | `math/spring.ts` + `track-conductor.ts`            | Captures live `(xNow, vNow)`. Springs re-solve ODE with $v_0 = v_{\text{now}}$; Béziers reverse cleanly from $x_{\text{now}}$ at $v_0 = 0$.                   |
| **`Loop (L)` + `Loop Delay (400ms)` + `0.25x` + `♿`** | `track-conductor.ts` + `evaluator.ts`              | Explicit RAF phase state (`playing` $\to$ `resting(loopDelayMs)` $\to$ `playing`); `isReducedMotion` flattens spatial channels into opacity fades.            |
| **Customize Primitives X-Ray (`⊞`)**                   | `registry/tracks.ts`                               | Built-in `"primitives"` virtual track evaluates `[position, scale, opacity, rotate]` via the standard `evaluateTrackFrame()` pipeline.                        |
| **Telemetry, $t\_{95}$ & Git Diff vs. Parent**         | `math/telemetry.ts`                                | Computes $\zeta$, $t_s$, $t_{95}$, `peakVelocity`, `overshootPercent`, `computeCurveDiff()`, and `evaluateDuel()`.                                            |
| **2-Tier Git Tree + Working Draft (`*`)**              | `state/curve-tree-reducers.ts`                     | `Root -> Variants[]` (max 2 tiers), `draftCurve` (`Revert`, `Commit`, `+ Fork Variant`, `Fork Preset`), move-only `Promote`, cascade `Delete`.                |
| **Compare Grid, Sync/Override & Wall-Clock**           | `state/compare-reducers.ts` + `track-conductor.ts` | Active visibility toggles, `globalTarget`, `perTileOverride`, and unified wall-clock `elapsedMs` (`0 -> maxTileDurationMs`).                                  |
| **4 Exporters + Scope + URL Hash + `⌘K`**              | `registry/exporters.ts` + `codec/`                 | `CSS`, `Tailwind`, `Motion`, `GSAP` (with real `CustomEase` SVG path compiler), `"channel" \| "track"` scopes, `#hash` codec, fuzzy search.                   |

---

## 3. Canonical Data Models (`core/schema.ts`)

All conflicting legacy types (`EditorState`, string-encoded `CustomEase`, `EaseDossier`) are replaced by one strongly typed schema:

```typescript
export type MotionEngine = "bezier" | "spring"
export type StudioMode = "preview" | "customize" | "compare"
export type ViewportPreset = "desktop" | "tablet" | "mobile"
export type TrackPhase = "enter" | "exit" | "state"
export type SpringDurationMode = "fit" | "natural"

export interface BezierParams {
  p1: { x: number; y: number } // x clamped [0, 1]; y unconstrained for overshoot
  p2: { x: number; y: number }
}

export interface SpringParams {
  mass: number // > 0 (default 1)
  stiffness: number // k > 0
  damping: number // c > 0
  velocity: number // initial v0 (default 0; populated dynamically on interrupt)
}

/**
 * Atomic curve data. Notice: Does NOT force a duration onto components.
 * Both `bezier` and `spring` structs are always populated so switching engines never crashes.
 */
export interface EaseCurve {
  id: string
  name: string
  engine: MotionEngine
  bezier: BezierParams
  spring: SpringParams
  suggestedDurationMs: number // Used ONLY in standalone Primitives X-Ray or initial fallback
  isCustom?: boolean
  parentId?: string // Lineage ID of parent preset or root curve
  parentName?: string // Display name (e.g., "Expo Out" or "Modal Sheet")
  category?: string
  description?: string
  useCases?: string[]
  variants?: EaseCurve[] // Strictly 2 tiers max: Root -> Variants[] (NO nested Flavors)
}

export interface ChannelSemanticContext {
  roleTitle: string // e.g., "Focal Surface Scale"
  guidance: string // Physics-backed advice for Right Flank Motion Guide
  recommendedRangeMs: [number, number]
  recommendedPresetIds: string[]
}

export interface ChannelBinding {
  id: string // e.g., "backdrop" | "translateY" | "scale" | "opacity"
  label: string
  property:
    "opacity" | "translateY" | "translateX" | "scale" | "rotate" | "blur"
  from: number
  to: number
  unit: "px" | "%" | "deg" | ""
  durationMs: number // Owned strictly by the component channel!
  savedBezierDurationMs: number // Preserved when testing Springs in "natural" mode
  delayMs: number
  springMode: SpringDurationMode
  curve: EaseCurve
  semanticContext: ChannelSemanticContext
}

export interface TransitionTrackPlugin {
  id: string // e.g., "dialog:open" | "dialog:close" | "dropdown:open"
  componentId: string // e.g., "dialog" | "drawer" | "dropdown" | "button" | "toast" | "tabs" | "carousel" | "primitives"
  componentLabel: string // e.g., "Modal Dialog"
  phase: TrackPhase // "enter" | "exit" | "state"
  phaseLabel: string // e.g., "Entrance" | "Exit"
  triggerLabel: string // e.g., "Edit Profile"
  channels: ChannelBinding[]
}

export interface DraftCurveState {
  sourceCurveId: string
  sourceScope: "preset" | "custom-root" | "custom-variant"
  parentCurve: EaseCurve // Baseline used for Revert & Git Diff telemetry
  workingCurve: EaseCurve // Live mutated draft (*)
  isDirty: boolean
}

export interface CompareItem {
  id: string
  curve: EaseCurve
  visible: boolean // Right Flank toggle so 2–4 tiles stay visible cleanly
  overrideTrackId?: string // Optional per-tile override
  overrideChannelId?: string
}
```

---

## 4. Deterministic Physics & Math Engine (`core/math/`)

### 4.1 `bezier.ts` — Exact Cubic-Bézier Solver

- **`solveBezierAtTime(bezier, tNormalized): { value: number; velocity: number }`:**
  - Solves $X(u) = t$ via **Newton-Raphson (6 iterations)** with automatic **binary bisection fallback** when $|X'(u)| < 10^{-6}$ (ensuring 100% convergence even on vertical-tangent `Expo` curves).
  - Evaluates $p = Y(u)$ and instantaneous normalized velocity $v = \frac{Y'(u)}{X'(u)}$.
- **`computeBezierExtremes(bezier): { minY: number; maxY: number; overshootPercent: number }`:**
  - Solves $Y'(u) = 0$ quadratically to find exact overshoot/undershoot bounds for both telemetry badges and Customize Mode's **Dynamic Auto-Zoom SVG ViewBox**.

### 4.2 `spring.ts` — Closed-Form Analytical Differential Solver

Solves $m \frac{d^2x}{dt^2} + c \frac{dx}{dt} + k x = 0$ analytically at any millisecond $t$ starting from initial displacement $x_0$ (relative to target $1.0$) and **arbitrary initial velocity $v_0$**:

- **Three Physical Regimes:**
  - **Underdamped ($\zeta < 1$):** $x(t) = 1 - e^{-\zeta \omega_n t}\left(A\cos(\omega_d t) + B\sin(\omega_d t)\right)$ where $A = 1 - x_0$ and $B = \frac{\zeta \omega_n A - v_0}{\omega_d}$.
  - **Critically Damped ($\zeta = 1$):** $x(t) = 1 - e^{-\omega_n t}\left(A + (\omega_n A - v_0)t\right)$.
  - **Overdamped ($\zeta > 1$):** Hyperbolic decay using $\gamma_1, \gamma_2 = \omega_n(-\zeta \pm \sqrt{\zeta^2 - 1})$.
- **Apple Perceptual Duration-Fit (`fitSpringToDurationMs`):**
  - Given a spring's damping ratio $\zeta$ (derived from its preset's bounce character) and the channel's choreographed `durationMs` ($T = \text{durationMs} / 1000$):
    $$k = m \left(\frac{2\pi}{T}\right)^2, \qquad c = 2\zeta\sqrt{k \cdot m}$$
  - Allows auditioning any Spring preset inside a `280ms` channel **without** breaking multi-channel choreography!
- **CSS `linear()` Quantizer (`compileSpringToLinearCss`):**
  - Samples the analytical ODE at 120 points, locks exact local extrema ($v(t) = 0$) so bounce peaks never flatten, and runs **Ramer–Douglas–Peucker** ($\epsilon = 0.002$) to produce minimal 10–14 point CSS `linear(...)` strings.
- **GSAP `CustomEase` SVG Path Compiler (`compileSpringToSvgPath`):**
  - Converts the simplified spring trajectory into a valid normalized SVG cubic/line path (`M0,0 C... 1,1`) for `CustomEase.create(...)`.

### 4.3 `telemetry.ts` — Diagnostics, `t95`, Git Diff & Duel Ranker

- **`computeCurveTelemetry(curve, durationMs):` Returns:**
  - `dampingRatio` ($\zeta$), `settlingTimeMs` ($t_s$ at $\epsilon = 0.005$ envelope), `timeTo95Ms` ($t_{95}$ — exact millisecond when $|1 - p(t)| \le 0.05$ on initial arrival), `peakVelocity`, `overshootPercent`, and `classification` (`"Underdamped"`, `"Critically Damped"`, `"Overdamped"`, `"Decelerating"`, `"S-Curve"`).
- **`computeCurveDiff(workingCurve, parentCurve, durationMs):`**
  - Computes exact deltas for Customize Mode's Right Flank: `t95DeltaMs`, `overshootDeltaPercent`, `p1PullDelta`, `stiffnessDelta`, and human-readable telemetry bullets.
- **`evaluateDuel(items, globalTrackId, globalChannelId):`**
  - Evaluates all visible Duel tiles against their exact duration/$t_s$, ranking fastest $t_{95}$ arrival and calculating exact settle deltas.

### 4.4 `evaluator.ts` — Pure Frame Evaluator (`evaluateTrackFrame`)

Given `{ track, channelCurves, elapsedMs, soloChannelId, isReducedMotion, interruptionSnapshots }`, outputs `Record<channelId, number>` in microseconds with zero allocations:

1. **Wall-Clock Local Progress:** `localElapsed = elapsedMs - channel.delayMs`. Evaluates against `channel.durationMs` (or spring $t_s$ if `springMode === "natural"`).
2. **Smart `All` Opacity Protection:** If a channel's `property === "opacity"` and an `All`-targeted curve overshoots $[0, 1]$, clamps progress strictly to $[0, 1]$ (or smoothly maps to linear/decel) to eliminate backdrop flicker.
3. **`Solo (S)` Isolation (Enter & Exit Safe):** When `soloChannelId` is set, only `soloChannelId` animates. Every sibling channel freezes at its **visible open resting state** (`channel.to` on `"enter"`, `channel.from` on `"exit"`), ensuring isolating `Card Scale` on `Exit` still renders the card visibly scaling `1.0 → 0.94`.
4. **Reduced Motion (`♿`) Override:** Spatial properties (`translateX`, `translateY`, `scale`, `rotate`) freeze at their resting target (`to` on enter, `from` on exit) while `opacity` cross-fades cleanly with a clamped `140ms` linear fade.

---

## 5. The 120fps Scoped `TrackConductor` (`core/clock/track-conductor.ts`)

`TrackConductor` is a pure TypeScript class holding mutable playback state **outside** React:

```
                    ┌───────────┐
       triggerLive  │           │  seek(ms)
     ┌─────────────►│  PLAYING  │◄────────────┐
     │              │           │             │
     │              └─────┬─────┘             ▼
┌────┴─────┐              │          ┌─────────────┐
│   IDLE   │◄─────────────┤          │  SCRUBBING  │
└──────────┘  done (no L) │          └─────────────┘
     ▲                    │ done (Loop = ON)
     │                    ▼
     │              ┌───────────┐
     └──────────────│  RESTING  │  (Waits loopDelayMs = 400ms, then restarts)
       stop/pause   └───────────┘
```

### Key Responsibilities

1. **Scoped Focus (`focusedTrackId` & `isPinned`):**
   - `triggerLive(trackId)` animates **only** `trackId` at `1x` speed and auto-captures `focusedTrackId = trackId` (unless `isPinned === true`).
   - `playScoped()` / `seekScoped(elapsedMs)` drives **only** `focusedTrackId` (keeping all other widgets in a complex preview stage completely static).
2. **Mount/Unmount Scrubbing Protection:**
   - `shouldForceMount(trackId): boolean` returns `true` whenever `focusedTrackId === trackId` AND (`mode === "scrub"` OR `isSoloMode` OR `isPlaying`). Components read this to keep closed/exiting DOM nodes mounted during scrubbing.
3. **True Mid-Flight `interrupt()`:**
   - Captures current position $x_{\text{now}}$ and instantaneous velocity $v_{\text{now}}$ for every active channel.
   - Flips playback direction (`enter <-> exit`).
   - **For Springs:** Re-solves ODE with $(x_0 = x_{\text{now}}, v_0 = v_{\text{now}})$—carrying forward momentum smoothly into deceleration and reversal.
   - **For Béziers:** Re-solves from $x_{\text{now}}$ toward the reversed target with $v_0 = 0$ (honest CSS transition interruption behavior).
4. **Wall-Clock Compare Synchronization:**
   - In Compare Mode, emits raw `elapsedMs` from `0` to `max(visibleTileDurations)`. Individual tiles clamp at their own settle timestamp and rest calmly while slower tiles finish.

---

## 6. Open/Closed Plugin Registries (`core/registry/`)

### 6.1 Generic Registry (`plugin-registry.ts`)

```typescript
export class PluginRegistry<T extends { id: string }> {
  private map = new Map<string, T>()
  register(plugin: T): void {
    this.map.set(plugin.id, plugin)
  }
  get(id: string): T | undefined {
    return this.map.get(id)
  }
  list(): T[] {
    return Array.from(this.map.values())
  }
}
```

### 6.2 `TransitionTrackPlugin` Registry (`tracks.ts`)

Pre-registers all built-in tracks (`dialog:open`, `dialog:close`, `drawer:open`, `drawer:close`, `dropdown:open`, `dropdown:close`, `button:press`, `toast:fire`, `tabs:switch`, `carousel:slide`, and the `primitives` 4-track Customize X-Ray). Each plugin contains its channels, default durations, and semantic `Motion Guide` metadata in **one place**.

### 6.3 `ExporterPlugin` Registry (`exporters.ts`)

Registers the **4 Framework Exporters** (`css`, `tailwind`, `motion`, `gsap`), each implementing:

```typescript
export interface ExporterPlugin {
  id: "css" | "tailwind" | "motion" | "gsap"
  label: string
  language: "css" | "html" | "tsx" | "ts"
  compileChannel: (channel: ChannelBinding) => string
  compileTrack: (track: TransitionTrackPlugin) => string
}
```

- **CSS & Tailwind:** Compile Béziers to `cubic-bezier(...)` and Springs to RDP-quantized `linear(...)` paired with exact settle `ms`.
- **Motion (`motion/react`):** Outputs `[x1, y1, x2, y2]` + `duration` or `{ type: "spring", mass, stiffness, damping }`.
- **GSAP:** Outputs `cubic-bezier` / standard ease or `CustomEase.create(...)` using real compiled SVG path data (`overwrite: "auto"`).

---

## 7. Pure State Reducers & Sliced Vanilla Store (`core/state/` & `core/store/`)

### 7.1 `curve-tree-reducers.ts` (2-Tier Git + Draft `*`)

All custom curve operations are pure functions `(state, args) => nextState`:

- **`startDraft(curve)`:** Clones a preset, root curve, or variant into `draftCurve` (`isDirty: false`).
- **`updateDraftMath(partial)`:** Updates `workingCurve` and sets `isDirty: true` without mutating `customCurves[]` or built-in presets.
- **`revertDraft()`:** Resets `workingCurve` to `parentCurve` and clears `isDirty`.
- **`commitDraft()`:** Writes `workingCurve` back into its matching Root or Variant node in `customCurves[]` (only enabled when `sourceScope !== "preset"`).
- **`forkAsVariant(name?)`:** Attaches `workingCurve` as a new Variant child under the active Root custom curve.
- **`forkPresetToRoot(name?)`:** Creates a brand-new Level 0 Root custom curve with `parentId` / `parentName` lineage.
- **`promoteVariantToRoot(rootId, variantId)`:** Cleanly detaches the variant from `root.variants[]` and promotes it to a Level 0 Root custom curve (**zero duplicate ghost copies**).
- **`deleteCurveNode(id)`:** Cascade-deletes children if Root, removes node, and returns a deterministic safe fallback `activeCurveId` + `navStack`.

### 7.2 Clean Sliced Vanilla Store (`create-ease-store.ts`)

A compact (~250 LOC) `zustand/vanilla` store composed of 4 clean slices:

1. **`workspaceSlice`:** `mode ("preview" | "customize" | "compare")`, `customizePreviewMode ("component" | "primitives")`, `viewport ("desktop" | "tablet" | "mobile")`, `navStack ({ level: 0 } | { level: 1; curveId: string })`, `isExportOpen`, `isReducedMotion`, `searchQuery`.
2. **`trackSlice`:** `focusedTrackId`, `focusedChannelId ("all" | string)`, `isPinned`, `isSolo`, `trackChannelStates` (persisting each channel's Duration Integrity `durationMs`, `curve`, and `springMode`).
3. **`librarySlice`:** `customCurves` (2-tier tree), `draftCurve`, `activeLibraryTab ("bezier" | "spring")`.
4. **`compareSlice`:** `compareQueue` (`CompareItem[]`), `globalCompareTarget ({ trackId, channelId })`.

---

## 8. Thin React Adapter Contract (`hooks/`)

Your React UI (`components/`) stays completely free of math, string building, and tree recursion by consuming **3 tiny hooks**:

1. **`useEaseStore(selector)`:** Standard `useStore(easeStore, selector)` wrapper for reactive UI controls.
2. **`useTransitionTrack(trackId, { isActiveState })`:**
   - Registers a widget's DOM refs (`bindRef(channelId)`) directly with `TrackConductor`.
   - Returns `{ shouldForceMount, triggerLive }` so any interactive widget cleanly supports free clicking, scoped scrubbing, `Solo (S)` on Exit, and mid-flight `Interrupt (I)`.
3. **`useClockRef(onTick)`:**
   - Subscribes an SVG Playhead dot or Timeline Scrubber slider directly to `TrackConductor`'s 120fps ticks without triggering React re-renders.

---

## 9. Verification & Quality Gates

Before any UI integration begins, `core/` must pass **100% automated verification in Vitest**:

- **Math Accuracy:** Newton-Raphson Bézier accuracy ($< 10^{-5}$ error), closed-form spring accuracy across all 3 damping regimes, and $t_{95}$ / $t_s$ verification.
- **Duration Integrity:** Swapping Bézier presets never mutates `channel.durationMs`; switching to Spring `"fit"` preserves channel timing; switching back restores `savedBezierDurationMs`.
- **Physics Edge Cases:** Mid-flight `interrupt()` preserves non-zero $v_0$ on Springs; `Solo (S)` on `Exit` keeps sibling channels at visible open state; `isReducedMotion` strips spatial displacement.
- **2-Tier Git Invariants:** Draft `*` never mutates presets; `Revert` restores exact baseline; `Promote` removes variant from parent without duplication; `Delete` cascades safely.
- **Codec & Exporters:** Lossless URL `#hash` round-trip (`decode(encode(state)) === state`), legacy 3-tier storage migration, and valid syntax output across all 4 Exporters (`CSS`, `Tailwind`, `Motion`, `GSAP`).
- **Zero React Purity Check:** Automated lint/import check confirming zero `react` or `react-dom` imports anywhere inside `core/`.
