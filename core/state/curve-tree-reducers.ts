/**
 * @file core/state/curve-tree-reducers.ts
 * @description Pure functional state reducers for 2-tier Git-inspired curve hierarchy and Draft `*` lifecycle.
 *
 * Invariants:
 * - Pure functions: `(state, args) => nextState`. Zero React or DOM dependencies.
 * - Max 2-tier tree: Root -> Variants[] (zero recursive flavors).
 * - Immutability: Built-in presets are strictly read-only.
 * - Clean Move: Promoting a variant to root detaches it from old parent variants (zero ghost duplicates).
 * - Safe Deletion: Deleting an active root/variant deterministically selects safe fallback curve & navStack.
 */

import { DEFAULT_FALLBACK_CURVE } from "../presets/index"
import { DraftCurveState, EaseCurve } from "../schema"

/** Navigation stack state for library views. */
export type NavStackState = { level: 0 } | { level: 1; curveId: string }

/**
 * Deep clones an EaseCurve object, including control points, physics params, and variants.
 *
 * @param curve - Source curve to clone.
 * @returns Fully cloned EaseCurve.
 */
export function cloneCurve(curve: EaseCurve): EaseCurve {
  return {
    ...curve,
    bezier: {
      p1: { ...curve.bezier.p1 },
      p2: { ...curve.bezier.p2 },
    },
    spring: { ...curve.spring },
    useCases: curve.useCases ? [...curve.useCases] : undefined,
    variants: curve.variants
      ? curve.variants.map((v) => cloneCurve(v))
      : undefined,
  }
}

/**
 * Searches the 2-tier custom curves tree for a curve by ID.
 *
 * @param customCurves - The list of custom root curves.
 * @param id - The ID of the curve to locate.
 * @returns Found node, its scope tier, and its parent root if it's a variant, or null.
 */
export function findCurveInCustomTree(
  customCurves: readonly EaseCurve[],
  id: string
): {
  node: EaseCurve
  scope: "custom-root" | "custom-variant"
  parentRoot?: EaseCurve
} | null {
  for (const root of customCurves) {
    if (root.id === id) {
      return { node: root, scope: "custom-root" }
    }
    if (root.variants) {
      for (const variant of root.variants) {
        if (variant.id === id) {
          return { node: variant, scope: "custom-variant", parentRoot: root }
        }
      }
    }
  }
  return null
}

/**
 * Initiates a non-destructive draft from an existing curve.
 *
 * @param curve - Source curve to draft.
 * @param sourceScope - Scope tier of the source curve.
 * @returns Fresh DraftCurveState with `isDirty: false`.
 */
export function startDraft(
  curve: EaseCurve,
  sourceScope: DraftCurveState["sourceScope"]
): DraftCurveState {
  return {
    sourceCurveId: curve.id,
    sourceScope,
    parentCurve: cloneCurve(curve),
    workingCurve: cloneCurve(curve),
    isDirty: false,
  }
}

/**
 * Immutably updates the working curve math or name and marks the draft dirty (`*`).
 *
 * @param draft - Active draft state.
 * @param patch - Parameter or metadata patch.
 * @returns Updated DraftCurveState with `isDirty: true`.
 */
export function updateDraftMath(
  draft: DraftCurveState,
  patch: Partial<
    Pick<
      EaseCurve,
      "name" | "engine" | "bezier" | "spring" | "suggestedDurationMs"
    >
  >
): DraftCurveState {
  const nextWorking: EaseCurve = cloneCurve(draft.workingCurve)

  if (patch.name !== undefined) {
    nextWorking.name = patch.name
  }
  if (patch.engine !== undefined) {
    nextWorking.engine = patch.engine
  }
  if (patch.suggestedDurationMs !== undefined) {
    nextWorking.suggestedDurationMs = Math.max(1, patch.suggestedDurationMs)
  }
  if (patch.bezier !== undefined) {
    nextWorking.bezier = {
      p1: {
        x: patch.bezier.p1?.x ?? nextWorking.bezier.p1.x,
        y: patch.bezier.p1?.y ?? nextWorking.bezier.p1.y,
      },
      p2: {
        x: patch.bezier.p2?.x ?? nextWorking.bezier.p2.x,
        y: patch.bezier.p2?.y ?? nextWorking.bezier.p2.y,
      },
    }
  }
  if (patch.spring !== undefined) {
    nextWorking.spring = {
      mass: patch.spring.mass ?? nextWorking.spring.mass,
      stiffness: patch.spring.stiffness ?? nextWorking.spring.stiffness,
      damping: patch.spring.damping ?? nextWorking.spring.damping,
      velocity: patch.spring.velocity ?? nextWorking.spring.velocity,
    }
  }

  return {
    ...draft,
    workingCurve: nextWorking,
    isDirty: true,
  }
}

/**
 * Restores the working curve from the parent baseline and clears the dirty flag.
 *
 * @param draft - Active draft state.
 * @returns Clean DraftCurveState with `isDirty: false`.
 */
export function revertDraft(draft: DraftCurveState): DraftCurveState {
  return {
    ...draft,
    workingCurve: cloneCurve(draft.parentCurve),
    isDirty: false,
  }
}

/**
 * Writes the working curve in-place to the matching Root or Variant in customCurves.
 * No-ops safely if `draft.sourceScope === "preset"`.
 *
 * @param customCurves - Current custom curves tree.
 * @param draft - Active draft state.
 * @returns Updated custom curves array, the committed curve, and refreshed draft state.
 */
export function commitDraft(
  customCurves: readonly EaseCurve[],
  draft: DraftCurveState
): {
  customCurves: EaseCurve[]
  committedCurve: EaseCurve
  nextDraft: DraftCurveState
} {
  // Presets are read-only; no-op safely
  if (draft.sourceScope === "preset") {
    return {
      customCurves: customCurves.map(cloneCurve),
      committedCurve: cloneCurve(draft.workingCurve),
      nextDraft: draft,
    }
  }

  const updatedCurves: EaseCurve[] = []
  let committed = cloneCurve(draft.workingCurve)

  for (const root of customCurves) {
    if (root.id === draft.sourceCurveId) {
      // Root level match: update root, preserving variants[]
      const updatedRoot: EaseCurve = {
        ...cloneCurve(draft.workingCurve),
        id: root.id,
        isCustom: true,
        variants: root.variants ? root.variants.map(cloneCurve) : [],
      }
      committed = updatedRoot
      updatedCurves.push(updatedRoot)
    } else {
      let variantUpdated = false
      const updatedVariants: EaseCurve[] = []

      if (root.variants) {
        for (const variant of root.variants) {
          if (variant.id === draft.sourceCurveId) {
            const updatedVariant: EaseCurve = {
              ...cloneCurve(draft.workingCurve),
              id: variant.id,
              isCustom: true,
              parentId: root.id,
              parentName: root.name,
              variants: undefined, // Variants cannot have variants
            }
            committed = updatedVariant
            updatedVariants.push(updatedVariant)
            variantUpdated = true
          } else {
            updatedVariants.push(cloneCurve(variant))
          }
        }
      }

      if (variantUpdated) {
        updatedCurves.push({
          ...cloneCurve(root),
          variants: updatedVariants,
        })
      } else {
        updatedCurves.push(cloneCurve(root))
      }
    }
  }

  const nextDraft: DraftCurveState = {
    ...draft,
    parentCurve: cloneCurve(committed),
    workingCurve: cloneCurve(committed),
    isDirty: false,
  }

  return {
    customCurves: updatedCurves,
    committedCurve: committed,
    nextDraft,
  }
}

/**
 * Forks a preset or curve into a new Level 0 Root custom curve and prepends it to customCurves.
 *
 * @param customCurves - Current custom curves list.
 * @param sourceCurve - Source curve to fork.
 * @param customName - Optional custom display name.
 * @param id - Optional deterministic ID for testing.
 * @returns Updated custom curves array with new root prepended, and the created curve.
 */
export function forkPresetToRoot(
  customCurves: readonly EaseCurve[],
  sourceCurve: EaseCurve,
  customName?: string,
  id?: string
): { customCurves: EaseCurve[]; created: EaseCurve } {
  const newId = id ?? `custom-${sourceCurve.id}-${Date.now().toString(36)}`
  const trimmedName = customName?.trim()
  const newName =
    trimmedName && trimmedName.length > 0
      ? trimmedName
      : `${sourceCurve.name} (Custom)`

  const created: EaseCurve = {
    ...cloneCurve(sourceCurve),
    id: newId,
    name: newName,
    isCustom: true,
    parentId: sourceCurve.id,
    parentName: sourceCurve.name,
    variants: [],
  }

  return {
    customCurves: [created, ...customCurves.map(cloneCurve)],
    created,
  }
}

/**
 * Forks a curve as a clean Variant child under an existing Root custom curve.
 *
 * @param customCurves - Current custom curves list.
 * @param rootCurveId - Target parent root ID.
 * @param sourceCurve - Curve whose math is being forked.
 * @param variantName - Optional custom variant name.
 * @param id - Optional deterministic ID for testing.
 * @returns Updated custom curves array and the created variant, or null if root not found.
 */
export function forkAsVariant(
  customCurves: readonly EaseCurve[],
  rootCurveId: string,
  sourceCurve: EaseCurve,
  variantName?: string,
  id?: string
): { customCurves: EaseCurve[]; created: EaseCurve | null } {
  let createdVariant: EaseCurve | null = null
  const updatedCurves: EaseCurve[] = []

  for (const root of customCurves) {
    if (root.id === rootCurveId) {
      const nextVariantIndex = (root.variants?.length ?? 0) + 1
      const newId =
        id ?? `${rootCurveId}-v${nextVariantIndex}-${Date.now().toString(36)}`
      const trimmedName = variantName?.trim()
      const newName =
        trimmedName && trimmedName.length > 0
          ? trimmedName
          : `${sourceCurve.name} (Variant ${nextVariantIndex})`

      const created: EaseCurve = {
        ...cloneCurve(sourceCurve),
        id: newId,
        name: newName,
        isCustom: true,
        parentId: root.id,
        parentName: root.name,
        variants: undefined, // Variants cannot have nested variants
      }

      createdVariant = created
      const updatedVariants = root.variants ? root.variants.map(cloneCurve) : []
      updatedVariants.push(created)

      updatedCurves.push({
        ...cloneCurve(root),
        variants: updatedVariants,
      })
    } else {
      updatedCurves.push(cloneCurve(root))
    }
  }

  return {
    customCurves: updatedCurves,
    created: createdVariant,
  }
}

/**
 * Promotes a variant to a Level 0 Root custom curve.
 * CLEAN MOVE: Detaches variantId from root.variants[] and prepends it to customCurves (zero ghost duplicate!).
 *
 * @param customCurves - Current custom curves list.
 * @param rootId - Parent root ID of the variant.
 * @param variantId - ID of the variant being promoted.
 * @param newName - Optional new name for the promoted root.
 * @param id - Optional new ID for the promoted root.
 * @returns Updated custom curves array with promoted curve prepended, and the promoted curve.
 */
export function promoteVariantToRoot(
  customCurves: readonly EaseCurve[],
  rootId: string,
  variantId: string,
  newName?: string,
  id?: string
): { customCurves: EaseCurve[]; promoted: EaseCurve | null } {
  let targetVariant: EaseCurve | null = null
  const updatedCurves: EaseCurve[] = []

  for (const root of customCurves) {
    if (root.id === rootId) {
      const filteredVariants: EaseCurve[] = []
      if (root.variants) {
        for (const v of root.variants) {
          if (v.id === variantId) {
            targetVariant = cloneCurve(v)
          } else {
            filteredVariants.push(cloneCurve(v))
          }
        }
      }

      updatedCurves.push({
        ...cloneCurve(root),
        variants: filteredVariants,
      })
    } else {
      updatedCurves.push(cloneCurve(root))
    }
  }

  if (!targetVariant) {
    return {
      customCurves: customCurves.map(cloneCurve),
      promoted: null,
    }
  }

  const trimmedName = newName?.trim()
  const promoted: EaseCurve = {
    ...targetVariant,
    id: id ?? targetVariant.id,
    name:
      trimmedName && trimmedName.length > 0 ? trimmedName : targetVariant.name,
    parentId: undefined,
    parentName: undefined,
    variants: [],
  }

  return {
    customCurves: [promoted, ...updatedCurves],
    promoted,
  }
}

/**
 * Renames a curve node (Root or Variant). Trims newName; no-ops safely if empty.
 *
 * @param customCurves - Current custom curves list.
 * @param id - ID of the curve to rename.
 * @param newName - New name to assign.
 * @returns Updated custom curves array.
 */
export function renameCurveNode(
  customCurves: readonly EaseCurve[],
  id: string,
  newName: string
): EaseCurve[] {
  const trimmed = newName.trim()
  if (!trimmed) {
    return customCurves.map(cloneCurve)
  }

  return customCurves.map((root) => {
    if (root.id === id) {
      return {
        ...cloneCurve(root),
        name: trimmed,
      }
    }

    if (root.variants) {
      const updatedVariants = root.variants.map((variant) =>
        variant.id === id
          ? {
              ...cloneCurve(variant),
              name: trimmed,
            }
          : cloneCurve(variant)
      )
      return {
        ...cloneCurve(root),
        variants: updatedVariants,
      }
    }

    return cloneCurve(root)
  })
}

/**
 * Deletes a curve node (Root or Variant).
 * Cascade-deletes children if Root, removes Variant if Variant, and calculates
 * deterministic safe fallback selection & navStack.
 *
 * @param customCurves - Current custom curves list.
 * @param id - ID of the curve to delete.
 * @param activeCurveId - Currently active curve ID in the UI.
 * @param navStack - Current library navigation stack.
 * @returns Updated custom curves list, fallback curve ID, and next navStack.
 */
export function deleteCurveNode(
  customCurves: readonly EaseCurve[],
  id: string,
  activeCurveId: string,
  navStack: NavStackState
): {
  customCurves: EaseCurve[]
  fallbackCurveId: string
  nextNavStack: NavStackState
} {
  const found = findCurveInCustomTree(customCurves, id)
  if (!found) {
    return {
      customCurves: customCurves.map(cloneCurve),
      fallbackCurveId: activeCurveId,
      nextNavStack: navStack,
    }
  }

  // 1. Root deletion
  if (found.scope === "custom-root") {
    const updatedCurves = customCurves
      .filter((root) => root.id !== id)
      .map(cloneCurve)

    const isTargetActiveOrChild =
      activeCurveId === id ||
      (found.node.variants?.some((v) => v.id === activeCurveId) ?? false)

    if (isTargetActiveOrChild) {
      const fallbackCurveId = updatedCurves[0]?.id ?? DEFAULT_FALLBACK_CURVE.id
      return {
        customCurves: updatedCurves,
        fallbackCurveId,
        nextNavStack: { level: 0 },
      }
    }

    return {
      customCurves: updatedCurves,
      fallbackCurveId: activeCurveId,
      nextNavStack: navStack,
    }
  }

  // 2. Variant deletion
  const parentRoot = found.parentRoot!
  const updatedCurves = customCurves.map((root) => {
    if (root.id === parentRoot.id) {
      return {
        ...cloneCurve(root),
        variants: root.variants
          ? root.variants.filter((v) => v.id !== id).map(cloneCurve)
          : [],
      }
    }
    return cloneCurve(root)
  })

  if (activeCurveId === id) {
    return {
      customCurves: updatedCurves,
      fallbackCurveId: parentRoot.id,
      nextNavStack: { level: 1, curveId: parentRoot.id },
    }
  }

  return {
    customCurves: updatedCurves,
    fallbackCurveId: activeCurveId,
    nextNavStack: navStack,
  }
}

/**
 * Returns `[root, ...(root.variants ?? [])]` for 1-click Compare All Variants.
 *
 * @param customCurves - Current custom curves list.
 * @param rootId - Root curve ID.
 * @returns Array of Root and all its child variants.
 */
export function getVariantsForDuel(
  customCurves: readonly EaseCurve[],
  rootId: string
): EaseCurve[] {
  const root = customCurves.find((c) => c.id === rootId)
  if (!root) {
    return []
  }
  return [
    cloneCurve(root),
    ...(root.variants ? root.variants.map(cloneCurve) : []),
  ]
}
