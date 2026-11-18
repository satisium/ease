/**
 * @file core/codec/storage.ts
 * @description Schema-versioned persistence adapter and legacy 3-tier custom curve migration.
 *
 * Invariants:
 * - 100% pure TypeScript. Zero browser globals or direct storage accesses.
 * - Max 2-tier tree: Flattens any legacy 3-tier flavors directly into 2nd-tier variants on Root.
 * - Resilient: Corrupt JSON or invalid formats fall back safely to DEFAULT_CUSTOM_CURVES without throwing.
 */

import { DEFAULT_CUSTOM_CURVES } from "../presets/default-customs"
import {
  BezierParams,
  CompareItem,
  DraftCurveState,
  EaseCurve,
  MotionEngine,
  SpringParams,
  StudioMode,
  ViewportPreset,
} from "../schema"
import { cloneCurve, NavStackState } from "../state/curve-tree-reducers"
import { parseCurveString } from "../math/parser"
import {
  TrackChannelMap,
  createInitialTrackBindings,
} from "../state/track-reducers"
import { CompareGlobalTarget } from "../state/compare-reducers"
import { ExporterId, ExportFormatScope } from "../registry/exporters"
import { trackRegistry } from "../registry/tracks"

/** Active schema version for persisted local storage. */
export const EASE_STORAGE_VERSION = 3

/** Injected storage interface for environment independence (web storage, AsyncStorage, in-memory). */
export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Complete persisted application state bundle (Version 3 Contract). */
export interface PersistedEaseData {
  version: number

  // Creative Work
  customCurves: EaseCurve[]
  draftCurve?: DraftCurveState | null
  trackBindings?: TrackChannelMap
  compareQueue?: CompareItem[]
  globalCompareTarget?: CompareGlobalTarget

  // Workspace & Location
  mode?: StudioMode
  customizePreviewMode?: "component" | "primitives"
  focusedTrackId?: string
  focusedChannelId?: string | "all"
  stashedComponentTrackId?: string | null
  stashedComponentChannelId?: string | null
  navStack?: NavStackState
  activeLibraryTab?: MotionEngine
  viewport?: ViewportPreset

  // Stack Preferences
  preferredExporter: ExporterId
  exportScope?: ExportFormatScope | "channel" | "track"
  loopDelayMs: number

  // Legacy compatibility fields
  activeTrackId?: string
  activeChannelId?: string
}

/** Complete deserialized application state bundle (guaranteed fully populated). */
export interface DeserializedEaseData {
  version: number
  customCurves: EaseCurve[]
  draftCurve: DraftCurveState | null
  trackBindings: TrackChannelMap
  compareQueue: CompareItem[]
  globalCompareTarget: CompareGlobalTarget
  mode: StudioMode
  customizePreviewMode: "component" | "primitives"
  focusedTrackId: string
  focusedChannelId: string | "all"
  stashedComponentTrackId: string | null
  stashedComponentChannelId: string | null
  navStack: NavStackState
  activeLibraryTab: MotionEngine
  viewport: ViewportPreset
  preferredExporter: ExporterId
  exportScope: ExportFormatScope
  loopDelayMs: number
  activeTrackId: string
  activeChannelId: string
}

export type SerializeEaseDataInput = Partial<
  Omit<PersistedEaseData, "version">
> & {
  customCurves?: EaseCurve[]
}

interface RawLegacyItem {
  id?: unknown
  name?: unknown
  engine?: unknown
  values?: unknown
  bezier?: unknown
  spring?: unknown
  suggestedDurationMs?: unknown
  duration?: unknown
  parentId?: unknown
  parentName?: unknown
  category?: unknown
  description?: unknown
  useCases?: unknown
  variants?: unknown
  flavors?: unknown
}

function validateBezier(obj: unknown): BezierParams | null {
  if (!obj || typeof obj !== "object") return null
  const candidate = obj as Record<string, unknown>
  const p1 = candidate.p1 as Record<string, unknown> | undefined
  const p2 = candidate.p2 as Record<string, unknown> | undefined

  if (!p1 || !p2) return null
  const x1 = Number(p1.x)
  const y1 = Number(p1.y)
  const x2 = Number(p2.x)
  const y2 = Number(p2.y)

  if (
    !Number.isFinite(x1) ||
    !Number.isFinite(y1) ||
    !Number.isFinite(x2) ||
    !Number.isFinite(y2)
  ) {
    return null
  }

  return {
    p1: { x: Math.max(0, Math.min(1, x1)), y: y1 },
    p2: { x: Math.max(0, Math.min(1, x2)), y: y2 },
  }
}

function validateSpring(obj: unknown): SpringParams | null {
  if (!obj || typeof obj !== "object") return null
  const candidate = obj as Record<string, unknown>
  const mass = Number(candidate.mass)
  const stiffness = Number(candidate.stiffness)
  const damping = Number(candidate.damping)
  const velocity =
    candidate.velocity !== undefined ? Number(candidate.velocity) : 0

  if (
    !Number.isFinite(mass) ||
    !Number.isFinite(stiffness) ||
    !Number.isFinite(damping) ||
    !Number.isFinite(velocity) ||
    mass <= 0 ||
    stiffness <= 0 ||
    damping < 0
  ) {
    return null
  }

  return {
    mass,
    stiffness,
    damping,
    velocity,
  }
}

function parseSingleCurveNode(
  item: RawLegacyItem,
  parentId?: string,
  parentName?: string
): EaseCurve | null {
  if (!item || typeof item !== "object") {
    return null
  }

  const id =
    typeof item.id === "string" && item.id.trim()
      ? item.id.trim()
      : `custom-${Math.random().toString(36).slice(2, 9)}`

  const name =
    typeof item.name === "string" && item.name.trim()
      ? item.name.trim()
      : "Custom Curve"

  const defaultBezier: BezierParams = {
    p1: { x: 0.16, y: 1.0 },
    p2: { x: 0.3, y: 1.0 },
  }
  const defaultSpring: SpringParams = {
    mass: 1,
    stiffness: 400,
    damping: 32,
    velocity: 0,
  }

  let engine: "bezier" | "spring" = "bezier"
  let bezier: BezierParams = defaultBezier
  let spring: SpringParams = defaultSpring

  // 1. Try legacy values string e.g. "0.16, 1.00, 0.30, 1.00" or "m:1 s:340 d:28"
  if (typeof item.values === "string" && item.values.trim()) {
    const parsed = parseCurveString(item.values.trim())
    if (parsed) {
      engine = parsed.engine
      bezier = parsed.bezier ?? defaultBezier
      spring = parsed.spring ?? defaultSpring
    }
  } else if (item.engine === "bezier" || item.engine === "spring") {
    engine = item.engine
    bezier = validateBezier(item.bezier) ?? defaultBezier
    spring = validateSpring(item.spring) ?? defaultSpring
  } else if (item.bezier) {
    const parsedBezier = validateBezier(item.bezier)
    if (parsedBezier) {
      engine = "bezier"
      bezier = parsedBezier
      spring = validateSpring(item.spring) ?? defaultSpring
    }
  } else if (item.spring) {
    const parsedSpring = validateSpring(item.spring)
    if (parsedSpring) {
      engine = "spring"
      spring = parsedSpring
      bezier = validateBezier(item.bezier) ?? defaultBezier
    }
  } else {
    // Unparseable math; drop corrupt entry
    return null
  }

  const durationRaw = item.suggestedDurationMs ?? item.duration ?? 280
  const durationNum = Number(durationRaw)
  const suggestedDurationMs =
    Number.isFinite(durationNum) && durationNum >= 1
      ? Math.round(durationNum)
      : 280

  const resolvedParentId =
    parentId ?? (typeof item.parentId === "string" ? item.parentId : undefined)
  const resolvedParentName =
    parentName ??
    (typeof item.parentName === "string" ? item.parentName : undefined)

  return {
    id,
    name,
    engine,
    bezier,
    spring,
    suggestedDurationMs,
    isCustom: true,
    parentId: resolvedParentId,
    parentName: resolvedParentName,
    category: typeof item.category === "string" ? item.category : undefined,
    description:
      typeof item.description === "string" ? item.description : undefined,
    useCases: Array.isArray(item.useCases)
      ? item.useCases.filter((u): u is string => typeof u === "string")
      : undefined,
    variants: undefined,
  }
}

/**
 * Safely parses and migrates unknown or legacy custom curves into the canonical 2-tier tree.
 * Flattens any 3rd-tier flavors directly into 2nd-tier `variants[]` on the Root curve.
 * Drops corrupt entries safely without throwing.
 *
 * @param rawCurves - Unknown data structure from persistent storage or legacy export.
 * @returns Canonical 2-tier EaseCurve[] array.
 */
export function migrateLegacyCustomCurves(rawCurves: unknown): EaseCurve[] {
  if (!Array.isArray(rawCurves)) {
    return []
  }

  const result: EaseCurve[] = []

  for (const rootItem of rawCurves) {
    if (!rootItem || typeof rootItem !== "object") {
      continue
    }

    const rootNode = parseSingleCurveNode(rootItem as RawLegacyItem)
    if (!rootNode) {
      continue
    }

    const flattenedVariants: EaseCurve[] = []
    const rawVariants = (rootItem as RawLegacyItem).variants

    if (Array.isArray(rawVariants)) {
      for (const varItem of rawVariants) {
        if (!varItem || typeof varItem !== "object") {
          continue
        }

        const variantNode = parseSingleCurveNode(
          varItem as RawLegacyItem,
          rootNode.id,
          rootNode.name
        )
        if (variantNode) {
          variantNode.variants = undefined // ensure variants have zero children
          flattenedVariants.push(variantNode)
        }

        // Check for 3rd-tier nested flavors/variants and FLATTEN directly into Root
        const legacyCandidate = varItem as RawLegacyItem
        const nestedList = Array.isArray(legacyCandidate.flavors)
          ? legacyCandidate.flavors
          : Array.isArray(legacyCandidate.variants)
            ? legacyCandidate.variants
            : null

        if (Array.isArray(nestedList)) {
          for (const flavorItem of nestedList) {
            if (!flavorItem || typeof flavorItem !== "object") {
              continue
            }
            const flavorNode = parseSingleCurveNode(
              flavorItem as RawLegacyItem,
              rootNode.id,
              rootNode.name
            )
            if (flavorNode) {
              flavorNode.variants = undefined // Flattened directly into Root
              flattenedVariants.push(flavorNode)
            }
          }
        }
      }
    }

    rootNode.variants = flattenedVariants
    result.push(rootNode)
  }

  return result
}

/**
 * Merges saved track channel bindings on top of default bindings defensively.
 * For any track and channel that exists in defaults, safely overlays custom curve,
 * durationMs, delayMs, savedBezierDurationMs, and springMode while keeping semanticContext and definitions fresh.
 *
 * @param savedBindings - Unknown object from persisted storage.
 * @param defaults - Fresh default TrackChannelMap from trackRegistry.
 * @returns Fully reconciled TrackChannelMap.
 */
export function mergeTrackBindings(
  savedBindings: unknown,
  defaults: TrackChannelMap
): TrackChannelMap {
  if (!savedBindings || typeof savedBindings !== "object") {
    return defaults
  }

  const rawMap = savedBindings as Record<string, unknown>
  const result: TrackChannelMap = {}
  const LEGACY_DURATIONS = new Set([180, 200, 240, 280, 340])
  const UPGRADED_DURATIONS = new Set([360, 380, 420, 480])

  for (const [trackId, defaultChannels] of Object.entries(defaults)) {
    const rawChannels = rawMap[trackId]
    const canonical = trackRegistry.get(trackId)

    if (!Array.isArray(rawChannels)) {
      result[trackId] = defaultChannels.map((c) => ({
        ...c,
        curve: cloneCurve(c.curve),
      }))
      continue
    }

    const hasChannelMismatch =
      !canonical ||
      rawChannels.length !== canonical.channels.length ||
      rawChannels.some((sc: unknown, i: number) => {
        if (!sc || typeof sc !== "object") return true
        return (sc as { id?: unknown }).id !== canonical.channels[i]?.id
      })

    if (hasChannelMismatch) {
      result[trackId] = defaultChannels.map((c) => ({
        ...c,
        curve: cloneCurve(c.curve),
      }))
      continue
    }

    result[trackId] = defaultChannels.map((defaultCh) => {
      const savedCh = rawChannels.find(
        (sc: unknown) =>
          sc &&
          typeof sc === "object" &&
          (sc as { id?: unknown }).id === defaultCh.id
      ) as Record<string, unknown> | undefined

      if (!savedCh) {
        return {
          ...defaultCh,
          curve: cloneCurve(defaultCh.curve),
        }
      }

      // Check if stored channel is using legacy pre-F1 duration while canonical is upgraded
      const sbdNum = Number(savedCh.savedBezierDurationMs)
      const isLegacyStaleDuration =
        Number.isFinite(sbdNum) &&
        LEGACY_DURATIONS.has(Math.round(sbdNum)) &&
        UPGRADED_DURATIONS.has(defaultCh.savedBezierDurationMs)

      if (isLegacyStaleDuration) {
        return {
          ...defaultCh,
          curve: cloneCurve(defaultCh.curve),
        }
      }

      // Validate curve
      let curve = defaultCh.curve
      if (savedCh.curve && typeof savedCh.curve === "object") {
        const validated = parseSingleCurveNode(savedCh.curve as RawLegacyItem)
        if (validated) {
          curve = validated
        }
      }

      // Validate durationMs
      const dNum = Number(savedCh.durationMs)
      const durationMs =
        Number.isFinite(dNum) && dNum >= 1
          ? Math.round(dNum)
          : defaultCh.durationMs

      // Validate savedBezierDurationMs
      const savedBezierDurationMs =
        Number.isFinite(sbdNum) && sbdNum >= 1
          ? Math.round(sbdNum)
          : defaultCh.savedBezierDurationMs

      // Validate delayMs
      const delNum = Number(savedCh.delayMs)
      const delayMs =
        Number.isFinite(delNum) && delNum >= 0
          ? Math.round(delNum)
          : defaultCh.delayMs

      // Validate springMode
      const springMode =
        savedCh.springMode === "natural" || savedCh.springMode === "fit"
          ? savedCh.springMode
          : defaultCh.springMode

      return {
        ...defaultCh,
        curve: cloneCurve(curve),
        durationMs,
        savedBezierDurationMs,
        delayMs,
        springMode,
      }
    })
  }

  return result
}

/**
 * Serializes application state into versioned JSON storage string.
 *
 * @param data - Storage data payload.
 * @returns Serialized JSON string.
 */
export function serializeEaseStorage(data: SerializeEaseDataInput): string {
  const customCurves = (data.customCurves ?? DEFAULT_CUSTOM_CURVES).map(
    cloneCurve
  )

  const defaultBindings = createInitialTrackBindings(trackRegistry.list())
  const trackBindings = data.trackBindings
    ? Object.fromEntries(
        Object.entries(data.trackBindings).map(([trackId, channels]) => [
          trackId,
          channels.map((ch) => ({
            ...ch,
            curve: cloneCurve(ch.curve),
          })),
        ])
      )
    : defaultBindings

  const compareQueue = (data.compareQueue ?? []).map((item) => ({
    id: item.id,
    curve: cloneCurve(item.curve),
    overrideTrackId: item.overrideTrackId,
    overrideChannelId: item.overrideChannelId,
    visible: item.visible,
  }))

  const globalCompareTarget = {
    trackId: data.globalCompareTarget?.trackId ?? "dialog:open",
    channelId: data.globalCompareTarget?.channelId ?? "all",
  }

  const focusedTrackId =
    data.focusedTrackId ?? data.activeTrackId ?? "dialog:open"
  const focusedChannelId =
    data.focusedChannelId ?? data.activeChannelId ?? "all"

  const activeTrackId =
    data.activeTrackId ??
    (data.customizePreviewMode === "primitives" && data.stashedComponentTrackId
      ? data.stashedComponentTrackId
      : (data.focusedTrackId ?? "dialog:open"))

  const activeChannelId =
    data.activeChannelId ??
    (data.customizePreviewMode === "primitives" &&
    data.stashedComponentChannelId
      ? data.stashedComponentChannelId
      : (data.focusedChannelId ?? "all"))

  const payload: PersistedEaseData = {
    version: EASE_STORAGE_VERSION,
    // Creative Work
    customCurves,
    draftCurve: data.draftCurve
      ? {
          sourceCurveId: data.draftCurve.sourceCurveId,
          sourceScope: data.draftCurve.sourceScope,
          parentCurve: cloneCurve(
            data.draftCurve.parentCurve ??
              (data.draftCurve as unknown as { originalCurve: EaseCurve })
                .originalCurve
          ),
          workingCurve: cloneCurve(data.draftCurve.workingCurve),
          isDirty: Boolean(data.draftCurve.isDirty),
        }
      : null,
    trackBindings,
    compareQueue,
    globalCompareTarget,

    // Workspace & Location
    mode: data.mode ?? "preview",
    customizePreviewMode: data.customizePreviewMode ?? "component",
    focusedTrackId,
    focusedChannelId,
    stashedComponentTrackId: data.stashedComponentTrackId ?? null,
    stashedComponentChannelId: data.stashedComponentChannelId ?? null,
    navStack: data.navStack ?? { level: 0 },
    activeLibraryTab: data.activeLibraryTab ?? "bezier",
    viewport: data.viewport ?? "desktop",

    // Stack Preferences
    preferredExporter: data.preferredExporter ?? "tailwind",
    exportScope:
      data.exportScope === "snippet" || data.exportScope === "track"
        ? "snippet"
        : "ease",
    loopDelayMs: Math.max(0, Math.round(data.loopDelayMs ?? 400)),

    // Backward-compat aliases
    activeTrackId,
    activeChannelId,
  }

  return JSON.stringify(payload)
}

/**
 * Deserializes versioned JSON storage into PersistedEaseData.
 * Falls back safely on null, invalid, or corrupt JSON without throwing.
 *
 * @param rawJson - Raw JSON string from StorageAdapter.
 * @param fallbackBindings - Optional initial track bindings to seed defaults.
 * @returns Deserialized PersistedEaseData.
 */
export function deserializeEaseStorage(
  rawJson: string | null,
  fallbackBindings?: TrackChannelMap
): DeserializedEaseData {
  const defaultBindings =
    fallbackBindings ?? createInitialTrackBindings(trackRegistry.list())

  const fallback: DeserializedEaseData = {
    version: EASE_STORAGE_VERSION,
    customCurves: DEFAULT_CUSTOM_CURVES.map(cloneCurve),
    draftCurve: null,
    trackBindings: defaultBindings,
    compareQueue: [],
    globalCompareTarget: { trackId: "dialog:open", channelId: "all" },
    mode: "preview",
    customizePreviewMode: "component",
    focusedTrackId: "dialog:open",
    focusedChannelId: "all",
    stashedComponentTrackId: null,
    stashedComponentChannelId: null,
    navStack: { level: 0 },
    activeLibraryTab: "bezier",
    viewport: "desktop",
    preferredExporter: "tailwind",
    exportScope: "ease",
    loopDelayMs: 400,
    activeTrackId: "dialog:open",
    activeChannelId: "all",
  }

  if (!rawJson || typeof rawJson !== "string") {
    return fallback
  }

  try {
    const parsed = JSON.parse(rawJson)
    if (!parsed || typeof parsed !== "object") {
      return fallback
    }

    // 1. Custom curves (handles v1, v2, v3 formats)
    let customCurves = fallback.customCurves
    if ("customCurves" in parsed) {
      const migrated = migrateLegacyCustomCurves(parsed.customCurves)
      if (migrated.length > 0) {
        customCurves = migrated
      }
    }

    // 2. Draft curve
    let draftCurve: DraftCurveState | null = null
    if (parsed.draftCurve && typeof parsed.draftCurve === "object") {
      const parent = parseSingleCurveNode(
        parsed.draftCurve.parentCurve ?? parsed.draftCurve.originalCurve
      )
      const work = parseSingleCurveNode(parsed.draftCurve.workingCurve)
      if (parent && work) {
        draftCurve = {
          sourceCurveId:
            typeof parsed.draftCurve.sourceCurveId === "string"
              ? parsed.draftCurve.sourceCurveId
              : parent.id,
          sourceScope:
            parsed.draftCurve.sourceScope === "custom-variant"
              ? "custom-variant"
              : parsed.draftCurve.sourceScope === "custom-root"
                ? "custom-root"
                : "preset",
          parentCurve: parent,
          workingCurve: work,
          isDirty: Boolean(parsed.draftCurve.isDirty),
        }
      }
    }

    // 3. Track bindings (merges defensively on top of fresh registry defaults)
    const trackBindings = mergeTrackBindings(
      parsed.trackBindings,
      defaultBindings
    )

    // 4. Compare queue
    const compareQueue: CompareItem[] = []
    if (Array.isArray(parsed.compareQueue)) {
      for (const item of parsed.compareQueue) {
        if (!item || typeof item !== "object") continue
        const curve = parseSingleCurveNode(item.curve)
        if (curve) {
          compareQueue.push({
            id:
              typeof item.id === "string" && item.id.trim()
                ? item.id.trim()
                : `tile-${Math.random().toString(36).slice(2, 7)}`,
            curve,
            overrideTrackId:
              typeof item.overrideTrackId === "string" &&
              item.overrideTrackId.trim()
                ? item.overrideTrackId.trim()
                : undefined,
            overrideChannelId:
              typeof item.overrideChannelId === "string" &&
              item.overrideChannelId.trim()
                ? item.overrideChannelId.trim()
                : undefined,
            visible: typeof item.visible === "boolean" ? item.visible : true,
          })
        }
      }
    }

    // 5. Global compare target
    const globalCompareTarget: CompareGlobalTarget = {
      trackId:
        parsed.globalCompareTarget &&
        typeof parsed.globalCompareTarget.trackId === "string" &&
        parsed.globalCompareTarget.trackId.trim()
          ? parsed.globalCompareTarget.trackId.trim()
          : "dialog:open",
      channelId:
        parsed.globalCompareTarget &&
        typeof parsed.globalCompareTarget.channelId === "string" &&
        parsed.globalCompareTarget.channelId.trim()
          ? parsed.globalCompareTarget.channelId.trim()
          : "all",
    }

    // 6. Mode: preserve "compare" ONLY if compareQueue.length > 0!
    let mode: StudioMode = "preview"
    if (parsed.mode === "compare" && compareQueue.length > 0) {
      mode = "compare"
    } else if (parsed.mode === "customize") {
      mode = "customize"
    }

    const customizePreviewMode: "component" | "primitives" =
      parsed.customizePreviewMode === "primitives" ? "primitives" : "component"

    // 7. Track & Channel IDs (supporting both focusedTrackId and legacy activeTrackId)
    const rawTrackId = parsed.focusedTrackId ?? parsed.activeTrackId
    const focusedTrackId =
      typeof rawTrackId === "string" && rawTrackId.trim()
        ? rawTrackId.trim()
        : fallback.focusedTrackId

    const rawChannelId = parsed.focusedChannelId ?? parsed.activeChannelId
    const focusedChannelId =
      typeof rawChannelId === "string" && rawChannelId.trim()
        ? rawChannelId.trim()
        : fallback.focusedChannelId

    const stashedComponentTrackId =
      typeof parsed.stashedComponentTrackId === "string" &&
      parsed.stashedComponentTrackId.trim()
        ? parsed.stashedComponentTrackId.trim()
        : null

    const stashedComponentChannelId =
      typeof parsed.stashedComponentChannelId === "string" &&
      parsed.stashedComponentChannelId.trim()
        ? parsed.stashedComponentChannelId.trim()
        : null

    const activeTrackId =
      customizePreviewMode === "primitives" && stashedComponentTrackId
        ? stashedComponentTrackId
        : typeof parsed.activeTrackId === "string" &&
            parsed.activeTrackId.trim()
          ? parsed.activeTrackId.trim()
          : focusedTrackId

    const activeChannelId =
      customizePreviewMode === "primitives" && stashedComponentChannelId
        ? stashedComponentChannelId
        : typeof parsed.activeChannelId === "string" &&
            parsed.activeChannelId.trim()
          ? parsed.activeChannelId.trim()
          : focusedChannelId

    // 8. NavStack
    let navStack: NavStackState = { level: 0 }
    if (
      parsed.navStack &&
      typeof parsed.navStack === "object" &&
      parsed.navStack.level === 1 &&
      typeof parsed.navStack.curveId === "string" &&
      parsed.navStack.curveId.trim()
    ) {
      navStack = { level: 1, curveId: parsed.navStack.curveId.trim() }
    }

    // 9. Active Library Tab
    const activeLibraryTab: MotionEngine =
      parsed.activeLibraryTab === "spring" ? "spring" : "bezier"

    // 10. Viewport
    const validViewports: ViewportPreset[] = ["desktop", "tablet", "mobile"]
    const viewport: ViewportPreset = validViewports.includes(parsed.viewport)
      ? parsed.viewport
      : "desktop"

    // 11. Exporter
    const validExporters: ExporterId[] = ["css", "tailwind", "motion", "gsap"]
    const preferredExporter: ExporterId = validExporters.includes(
      parsed.preferredExporter
    )
      ? (parsed.preferredExporter as ExporterId)
      : fallback.preferredExporter

    // 12. Export Scope
    const exportScope: ExportFormatScope =
      parsed.exportScope === "snippet" || parsed.exportScope === "track"
        ? "snippet"
        : "ease"

    // 13. Loop delay
    const loopDelayMs =
      typeof parsed.loopDelayMs === "number" &&
      Number.isFinite(parsed.loopDelayMs)
        ? Math.max(0, Math.round(parsed.loopDelayMs))
        : fallback.loopDelayMs

    return {
      version: EASE_STORAGE_VERSION,
      customCurves,
      draftCurve,
      trackBindings,
      compareQueue,
      globalCompareTarget,
      mode,
      customizePreviewMode,
      focusedTrackId,
      focusedChannelId,
      stashedComponentTrackId,
      stashedComponentChannelId,
      navStack,
      activeLibraryTab,
      viewport,
      preferredExporter,
      exportScope,
      loopDelayMs,
      activeTrackId,
      activeChannelId,
    }
  } catch {
    return fallback
  }
}
