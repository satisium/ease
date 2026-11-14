/**
 * @file core/codec/search.ts
 * @description Pure unified command search catalog for ⌘K palette and quick curve switching.
 *
 * Invariants:
 * - 100% pure TypeScript. Zero browser globals or React dependencies.
 * - Deterministic scoring: Exact matches > prefix matches > title substrings > metadata matches.
 * - Unified catalog across canonical presets, custom roots, variants, and component tracks.
 */

import { EaseCurve, TransitionTrackPlugin } from "../schema"

/** Classification category of search catalog item. */
export type SearchResultKind =
  "preset" | "custom-root" | "custom-variant" | "track"

/** An individual search catalog item returned to ⌘K palette consumers. */
export interface SearchResultItem {
  kind: SearchResultKind
  id: string
  title: string
  subtitle: string
  category?: string
  parentId?: string
  score: number
}

interface SearchCandidate extends SearchResultItem {
  extraText: string
}

/**
 * Searches and ranks items across presets, custom curves (roots and variants), and transition tracks.
 *
 * @param params - Search parameters: query, collections, and max limit.
 * @returns Ranked array of SearchResultItem.
 */
export function searchEaseCommandCatalog(params: {
  query: string
  presets: readonly EaseCurve[]
  customCurves: readonly EaseCurve[]
  tracks: readonly TransitionTrackPlugin[]
  limit?: number
}): SearchResultItem[] {
  const q = params.query.trim().toLowerCase()
  const maxLimit = params.limit ?? 20

  const candidates: SearchCandidate[] = []

  // 1. Index Presets
  for (const preset of params.presets) {
    const useCasesStr = (preset.useCases ?? []).join(" ")
    candidates.push({
      kind: "preset",
      id: preset.id,
      title: preset.name,
      subtitle: preset.category
        ? `${preset.category} · ${preset.suggestedDurationMs}ms`
        : `${preset.engine === "spring" ? "Spring" : "Bézier"} Preset · ${preset.suggestedDurationMs}ms`,
      category:
        preset.category ??
        (preset.engine === "spring" ? "Spring Presets" : "Bézier Presets"),
      score: 0,
      extraText: `${preset.description ?? ""} ${preset.category ?? ""} ${useCasesStr}`,
    })
  }

  // 2. Index Custom Curves (Roots & Variants)
  for (const root of params.customCurves) {
    const rootUseCases = (root.useCases ?? []).join(" ")
    const variantCount = root.variants?.length ?? 0
    const rootSubtitle = `Custom Curve${
      variantCount > 0
        ? ` · ${variantCount} variant${variantCount > 1 ? "s" : ""}`
        : ""
    }`

    candidates.push({
      kind: "custom-root",
      id: root.id,
      title: root.name,
      subtitle: rootSubtitle,
      category: root.category ?? "Custom Curves",
      score: 0,
      extraText: `${root.description ?? ""} ${root.category ?? ""} ${rootUseCases}`,
    })

    if (root.variants) {
      for (const variant of root.variants) {
        const varUseCases = (variant.useCases ?? []).join(" ")
        const parentName = variant.parentName ?? root.name
        candidates.push({
          kind: "custom-variant",
          id: variant.id,
          title: variant.name,
          subtitle: `Variant of ${parentName}`,
          category: variant.category ?? root.category ?? "Custom Variants",
          parentId: root.id,
          score: 0,
          extraText: `${variant.description ?? ""} ${parentName} ${varUseCases}`,
        })
      }
    }
  }

  // 3. Index Transition Tracks
  for (const track of params.tracks) {
    const channelGuidance = track.channels
      .map(
        (c) =>
          `${c.label} ${c.semanticContext.roleTitle} ${c.semanticContext.guidance}`
      )
      .join(" ")

    candidates.push({
      kind: "track",
      id: track.id,
      title: `${track.componentLabel} (${track.phaseLabel})`,
      subtitle: `${track.triggerLabel} · ${track.channels.length} channel${
        track.channels.length > 1 ? "s" : ""
      }`,
      category: "Transition Tracks",
      score: 0,
      extraText: `${track.componentId} ${track.componentLabel} ${track.phaseLabel} ${channelGuidance}`,
    })
  }

  // If query is empty, return top curated items across categories
  if (q.length === 0) {
    return candidates.slice(0, maxLimit).map((c) => ({
      kind: c.kind,
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      category: c.category,
      parentId: c.parentId,
      score: c.score,
    }))
  }

  // Score candidates deterministically
  const matched: SearchCandidate[] = []

  for (const candidate of candidates) {
    const title = candidate.title.toLowerCase()
    const id = candidate.id.toLowerCase()
    const extra = candidate.extraText.toLowerCase()

    let score = 0

    if (title === q) {
      score = 100
    } else if (title.startsWith(q)) {
      score = 80
    } else if (title.includes(q)) {
      score = 60
    } else if (id === q) {
      score = 55
    } else if (id.startsWith(q)) {
      score = 50
    } else if (id.includes(q)) {
      score = 45
    } else if (extra.includes(q)) {
      score = 35
    }

    if (score > 0) {
      matched.push({
        ...candidate,
        score,
      })
    }
  }

  // Sort by score descending, then alphabetical title
  matched.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    return a.title.localeCompare(b.title)
  })

  return matched.slice(0, maxLimit).map((c) => ({
    kind: c.kind,
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    category: c.category,
    parentId: c.parentId,
    score: c.score,
  }))
}
