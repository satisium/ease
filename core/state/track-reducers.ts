/**
 * @file core/state/track-reducers.ts
 * @description Pure functional state reducers for transition tracks and property channels.
 *
 * Invariants:
 * - Pure functions: `(state, args) => nextState`. Zero React or DOM dependencies.
 * - Duration Integrity Law: Swapping curves replaces ONLY channel.curve; NEVER overwrites
 *   channel.durationMs or channel.savedBezierDurationMs.
 * - Mode Switching: setChannelSpringMode restores durationMs = savedBezierDurationMs cleanly.
 */

import {
  ChannelBinding,
  EaseCurve,
  SpringDurationMode,
  TransitionTrackPlugin,
} from "../schema"
import { cloneCurve } from "./curve-tree-reducers"

/** Map of choreographed channels keyed by track ID (e.g. "dialog:open"). */
export type TrackChannelMap = Record<string, ChannelBinding[]>

/**
 * Deep clones an individual ChannelBinding object and its semantic context.
 *
 * @param channel - Channel binding to clone.
 * @returns Fully cloned ChannelBinding.
 */
function cloneChannel(channel: ChannelBinding): ChannelBinding {
  return {
    ...channel,
    curve: cloneCurve(channel.curve),
    semanticContext: {
      ...channel.semanticContext,
      recommendedRangeMs: [...channel.semanticContext.recommendedRangeMs],
      recommendedPresetIds: [...channel.semanticContext.recommendedPresetIds],
    },
  }
}

/**
 * Creates initial track channel bindings map from registered track plugins.
 *
 * @param tracks - List of registered transition track plugins.
 * @returns Initial TrackChannelMap record.
 */
export function createInitialTrackBindings(
  tracks: readonly TransitionTrackPlugin[]
): TrackChannelMap {
  const result: TrackChannelMap = {}
  for (const track of tracks) {
    result[track.id] = track.channels.map(cloneChannel)
  }
  return result
}

/**
 * Assigns a curve to one or all channels in a track while strictly preserving Duration Integrity.
 * Duration Integrity Law: Replaces ONLY channel.curve; NEVER overwrites channel.durationMs
 * or channel.savedBezierDurationMs!
 *
 * @param bindings - Current track channels map.
 * @param trackId - Target track ID.
 * @param channelIdOrAll - Specific channel ID or "all" to update every channel in the track.
 * @param curve - New curve to apply.
 * @returns Updated TrackChannelMap.
 */
export function applyCurveToChannel(
  bindings: TrackChannelMap,
  trackId: string,
  channelIdOrAll: string,
  curve: EaseCurve
): TrackChannelMap {
  const currentChannels = bindings[trackId]
  if (!currentChannels) {
    return { ...bindings }
  }

  const updatedChannels = currentChannels.map((channel) => {
    if (channelIdOrAll === "all" || channel.id === channelIdOrAll) {
      return {
        ...cloneChannel(channel),
        curve: cloneCurve(curve),
      }
    }
    return cloneChannel(channel)
  })

  return {
    ...bindings,
    [trackId]: updatedChannels,
  }
}

/**
 * Updates both durationMs and savedBezierDurationMs cleanly (clamped >= 1).
 *
 * @param bindings - Current track channels map.
 * @param trackId - Target track ID.
 * @param channelId - Target channel ID.
 * @param durationMs - New duration in milliseconds.
 * @returns Updated TrackChannelMap.
 */
export function setChannelDurationMs(
  bindings: TrackChannelMap,
  trackId: string,
  channelId: string,
  durationMs: number
): TrackChannelMap {
  const currentChannels = bindings[trackId]
  if (!currentChannels) {
    return { ...bindings }
  }

  const safeDuration = Math.max(1, Math.round(durationMs))
  const updatedChannels = currentChannels.map((channel) => {
    if (channel.id === channelId) {
      return {
        ...cloneChannel(channel),
        durationMs: safeDuration,
        savedBezierDurationMs: safeDuration,
      }
    }
    return cloneChannel(channel)
  })

  return {
    ...bindings,
    [trackId]: updatedChannels,
  }
}

/**
 * Updates delayMs cleanly (clamped >= 0).
 *
 * @param bindings - Current track channels map.
 * @param trackId - Target track ID.
 * @param channelId - Target channel ID.
 * @param delayMs - Stagger delay in milliseconds.
 * @returns Updated TrackChannelMap.
 */
export function setChannelDelayMs(
  bindings: TrackChannelMap,
  trackId: string,
  channelId: string,
  delayMs: number
): TrackChannelMap {
  const currentChannels = bindings[trackId]
  if (!currentChannels) {
    return { ...bindings }
  }

  const safeDelay = Math.max(0, Math.round(delayMs))
  const updatedChannels = currentChannels.map((channel) => {
    if (channel.id === channelId) {
      return {
        ...cloneChannel(channel),
        delayMs: safeDelay,
      }
    }
    return cloneChannel(channel)
  })

  return {
    ...bindings,
    [trackId]: updatedChannels,
  }
}

/**
 * Updates spring reconciliation mode and restores durationMs = savedBezierDurationMs cleanly.
 *
 * @param bindings - Current track channels map.
 * @param trackId - Target track ID.
 * @param channelId - Target channel ID.
 * @param springMode - New SpringDurationMode ("fit" or "natural").
 * @returns Updated TrackChannelMap.
 */
export function setChannelSpringMode(
  bindings: TrackChannelMap,
  trackId: string,
  channelId: string,
  springMode: SpringDurationMode
): TrackChannelMap {
  const currentChannels = bindings[trackId]
  if (!currentChannels) {
    return { ...bindings }
  }

  const updatedChannels = currentChannels.map((channel) => {
    if (channel.id === channelId) {
      return {
        ...cloneChannel(channel),
        springMode,
        durationMs: channel.savedBezierDurationMs ?? channel.durationMs,
      }
    }
    return cloneChannel(channel)
  })

  return {
    ...bindings,
    [trackId]: updatedChannels,
  }
}

/**
 * Resets a track's channels back to baseline plugin definition.
 *
 * @param bindings - Current track channels map.
 * @param trackId - Target track ID.
 * @param baselineTrack - Original transition track plugin definition.
 * @returns Updated TrackChannelMap.
 */
export function resetTrackChannels(
  bindings: TrackChannelMap,
  trackId: string,
  baselineTrack: TransitionTrackPlugin
): TrackChannelMap {
  return {
    ...bindings,
    [trackId]: baselineTrack.channels.map(cloneChannel),
  }
}
