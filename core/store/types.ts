/**
 * @file core/store/types.ts
 * @description Type definitions and context contracts for Satisium Ease store slices.
 */

import type { StoreApi } from "zustand/vanilla"
import type {
  ChannelBinding,
  CompareItem,
  DraftCurveState,
  EaseCurve,
  MotionEngine,
  SpringDurationMode,
  StudioMode,
  TrackFrameResult,
  TransitionTrackPlugin,
  ViewportPreset,
} from "../schema"
import type { ExporterId, ExportFormatScope } from "../registry/exporters"
import type {
  PlaybackSpeed,
  PlaybackState,
  TrackConductor,
} from "../clock/track-conductor"
import type { NavStackState } from "../state/curve-tree-reducers"
import type { TrackChannelMap } from "../state/track-reducers"
import type { CompareGlobalTarget } from "../state/compare-reducers"
import type { StorageAdapter } from "../codec/storage"

export type { StorageAdapter }
export type DraftScope = DraftCurveState["sourceScope"]

export const DEFAULT_STORAGE_KEY = "satisium-ease-v3"

export interface CreateEaseStoreOptions {
  conductor?: TrackConductor
  storage?: StorageAdapter
  storageKey?: string
  initialHash?: string
}

export interface EaseStoreState {
  // 1. Workspace Slice
  mode: StudioMode
  customizePreviewMode: "component" | "primitives"
  stashedComponentTrackId: string | null
  stashedComponentChannelId: string | null
  viewport: ViewportPreset
  navStack: NavStackState
  isExportOpen: boolean
  exportScope: ExportFormatScope
  preferredExporter: ExporterId
  isReducedMotion: boolean
  searchQuery: string

  // Low-frequency conductor mirror (Zero 120fps re-render guarantee)
  playbackState: PlaybackState
  isPlaying: boolean
  isLooping: boolean
  loopDelayMs: number
  speed: PlaybackSpeed
  totalDurationMs: number

  setMode: (mode: StudioMode) => void
  enterCustomize: () => void
  exitCustomize: () => void
  enterCompare: () => void
  exitCompare: () => void
  setCustomizePreviewMode: (mode: "component" | "primitives") => void
  setViewport: (viewport: ViewportPreset) => void
  setNavStack: (navStack: NavStackState) => void
  drillIntoCurve: (curveId: string) => void
  backToPresets: () => void
  setExportOpen: (open: boolean) => void
  setExportScope: (scope: ExportFormatScope | "channel" | "track") => void
  setPreferredExporter: (exporter: ExporterId) => void
  setReducedMotion: (reduced: boolean) => void
  setSearchQuery: (query: string) => void

  playScoped: () => void
  pauseScoped: () => void
  togglePlayback: () => void
  seekScoped: (elapsedMs: number) => void
  setLooping: (loop: boolean) => void
  setLoopDelayMs: (ms: number) => void
  setSpeed: (speed: PlaybackSpeed) => void

  // 2. Track & Channel Slice
  focusedTrackId: string
  focusedChannelId: string | "all"
  isPinned: boolean
  isSolo: boolean
  trackBindings: TrackChannelMap

  getFocusedTrack: () => TransitionTrackPlugin
  getFocusedChannel: () => ChannelBinding | null
  getActiveCurve: () => EaseCurve

  focusTrack: (trackId: string) => void
  focusChannel: (channelIdOrAll: string | "all") => void
  setPinned: (pinned: boolean) => void
  toggleSolo: () => void
  setSolo: (solo: boolean) => void
  selectCurveForFocused: (curveId: string) => void
  setFocusedDurationMs: (ms: number) => void
  setFocusedDelayMs: (ms: number) => void
  setFocusedSpringMode: (mode: SpringDurationMode) => void
  resetTrack: (trackId?: string) => void
  resetFocusedTrack: () => void
  triggerLive: (trackId: string) => void
  interruptActive: () => void

  // 3. Library & 2-Tier Git Tree Slice
  customCurves: EaseCurve[]
  activeLibraryTab: MotionEngine
  draftCurve: DraftCurveState | null

  setActiveLibraryTab: (engine: MotionEngine) => void
  updateDraft: (
    patch: Partial<
      Pick<
        EaseCurve,
        "name" | "engine" | "bezier" | "spring" | "suggestedDurationMs"
      >
    >
  ) => void
  revertActiveDraft: () => void
  commitActiveDraft: () => {
    committedCurve: EaseCurve
    nextDraft: DraftCurveState
  }
  forkActiveDraftToRoot: (name?: string) => EaseCurve | null
  forkActiveDraftAsVariant: (rootId: string, name?: string) => EaseCurve | null
  forkPresetToCustom: (
    presetId: string,
    customName?: string
  ) => EaseCurve | null
  addVariantToRoot: (
    rootId: string,
    sourceCurve?: EaseCurve,
    variantName?: string
  ) => EaseCurve | null
  promoteVariant: (
    rootId: string,
    variantId: string,
    newName?: string
  ) => EaseCurve | null
  renameCurve: (id: string, newName: string) => void
  deleteCurve: (id: string) => void
  importCurveString: (raw: string) => EaseCurve | null

  // 4. Compare Slice
  compareQueue: CompareItem[]
  globalCompareTarget: CompareGlobalTarget

  stageActiveCurveToCompare: () => void
  stageVariantsToCompare: (rootId: string) => void
  removeCompareItem: (itemId: string) => void
  toggleCompareItemVisibility: (itemId: string) => void
  reorderCompareItems: (fromIndex: number, toIndex: number) => void
  setGlobalCompareTarget: (target: Partial<CompareGlobalTarget>) => void
  setCompareTileOverride: (
    itemId: string,
    override: { trackId?: string; channelId?: string } | null
  ) => void
  applyCompareWinner: (itemId: string) => void
  evaluateCompareItemFrame: (
    itemId: string,
    elapsedMs?: number
  ) => TrackFrameResult | null

  // 5. Export, Persistence & URL Hash
  hydrateFromStorage: (rawJson?: string | null) => void
  getActiveExportCode: (
    exporterId?: ExporterId,
    scope?: ExportFormatScope | "channel" | "track",
    curveOverride?: EaseCurve
  ) => string
  getShareUrlHash: () => string
  applyUrlHash: (hashOrUrl: string) => boolean
  persist: () => void
}

export type EaseStore = StoreApi<EaseStoreState> & {
  conductor: TrackConductor
}

export interface SliceContext {
  set: StoreApi<EaseStoreState>["setState"]
  get: StoreApi<EaseStoreState>["getState"]
  conductor: TrackConductor
  computeDuration: () => number
  syncDuration: () => void
  storage?: StorageAdapter
  storageKey: string
}
