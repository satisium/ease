/**
 * @file core/state/compare-reducers.ts
 * @description Pure functional state reducers for the Compare Mode contender queue.
 *
 * Invariants:
 * - Pure functions: `(state, args) => nextState`. Zero React or DOM dependencies.
 * - Deduplication: Prevents staging identical curves twice into the active comparison queue.
 * - Staggered Visibility: New contenders default to `visible: true` if < 4 contenders are
 *   currently visible, maintaining the ideal 2-4 tile grid while preserving extra contenders.
 */

import { CompareItem, EaseCurve } from "../schema"
import { cloneCurve } from "./curve-tree-reducers"

/** Global comparison target track & channel across contender tiles. */
export interface CompareGlobalTarget {
  trackId: string
  channelId: string | "all"
}

/**
 * Deep clones an individual CompareItem object.
 *
 * @param item - CompareItem to clone.
 * @returns Fully cloned CompareItem.
 */
function cloneCompareItem(item: CompareItem): CompareItem {
  return {
    ...item,
    curve: cloneCurve(item.curve),
  }
}

/**
 * Stages a curve into the comparison queue.
 * Avoids duplicating the exact same curve.id if already queued.
 * Appends cleanly with `visible: queue.filter(q => q.visible).length < 4`
 * so ideal 2–4 tiles stay visible while preserving queued extras!
 *
 * @param queue - Current comparison queue.
 * @param curve - Curve to stage.
 * @param itemId - Optional deterministic item ID for testing.
 * @returns Updated comparison queue.
 */
export function stageCurveToCompare(
  queue: readonly CompareItem[],
  curve: EaseCurve,
  itemId?: string
): CompareItem[] {
  // Deduplicate by curve ID
  if (queue.some((item) => item.curve.id === curve.id)) {
    return queue.map(cloneCompareItem)
  }

  const visibleCount = queue.filter((item) => item.visible).length
  const shouldBeVisible = visibleCount < 4

  const newItem: CompareItem = {
    id: itemId ?? `compare-${curve.id}-${Date.now().toString(36)}`,
    curve: cloneCurve(curve),
    visible: shouldBeVisible,
  }

  return [...queue.map(cloneCompareItem), newItem]
}

/**
 * Removes a contender from the comparison queue by item ID or curve ID.
 *
 * @param queue - Current comparison queue.
 * @param itemId - Item ID or curve ID to remove.
 * @returns Updated comparison queue.
 */
export function removeFromCompare(
  queue: readonly CompareItem[],
  itemId: string
): CompareItem[] {
  return queue
    .filter((item) => item.id !== itemId && item.curve.id !== itemId)
    .map(cloneCompareItem)
}

/**
 * Toggles the visibility of a contender tile.
 *
 * @param queue - Current comparison queue.
 * @param itemId - Item ID or curve ID to toggle.
 * @returns Updated comparison queue.
 */
export function toggleCompareVisibility(
  queue: readonly CompareItem[],
  itemId: string
): CompareItem[] {
  return queue.map((item) => {
    if (item.id === itemId || item.curve.id === itemId) {
      return {
        ...cloneCompareItem(item),
        visible: !item.visible,
      }
    }
    return cloneCompareItem(item)
  })
}

/**
 * Reorders a contender within the comparison queue.
 *
 * @param queue - Current comparison queue.
 * @param fromIndex - Source index.
 * @param toIndex - Destination index.
 * @returns Reordered comparison queue.
 */
export function reorderCompareQueue(
  queue: readonly CompareItem[],
  fromIndex: number,
  toIndex: number
): CompareItem[] {
  if (
    fromIndex < 0 ||
    fromIndex >= queue.length ||
    toIndex < 0 ||
    toIndex >= queue.length ||
    fromIndex === toIndex
  ) {
    return queue.map(cloneCompareItem)
  }

  const result = queue.map(cloneCompareItem)
  const [removed] = result.splice(fromIndex, 1)
  if (removed) {
    result.splice(toIndex, 0, removed)
  }
  return result
}

/**
 * Sets or clears per-tile track or channel overrides on a specific contender.
 * If override is null, clears both overrideTrackId and overrideChannelId.
 *
 * @param queue - Current comparison queue.
 * @param itemId - Target item ID or curve ID.
 * @param override - Override parameters or null to reset.
 * @returns Updated comparison queue.
 */
export function setTileOverride(
  queue: readonly CompareItem[],
  itemId: string,
  override: { trackId?: string; channelId?: string } | null
): CompareItem[] {
  return queue.map((item) => {
    if (item.id === itemId || item.curve.id === itemId) {
      return {
        ...cloneCompareItem(item),
        overrideTrackId: override?.trackId,
        overrideChannelId: override?.channelId,
      }
    }
    return cloneCompareItem(item)
  })
}

/**
 * Stages multiple curves (such as a root curve and all its variants) into the compare queue.
 *
 * @param queue - Current comparison queue.
 * @param curves - Array of curves to stage.
 * @returns Updated comparison queue with all eligible curves staged.
 */
export function stageVariantsForCompare(
  queue: readonly CompareItem[],
  curves: readonly EaseCurve[]
): CompareItem[] {
  let nextQueue = queue.map(cloneCompareItem)
  for (const curve of curves) {
    nextQueue = stageCurveToCompare(nextQueue, curve)
  }
  return nextQueue
}
