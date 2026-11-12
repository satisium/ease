/**
 * Animation Sniffer Engine
 *
 * Universal DOM inspection engine that automatically discovers animated elements,
 * CSS transitions, @keyframes stylesheets, Tailwind animate classes, and Web Animations (WAAPI).
 *
 * Decomposes multi-property transforms (translateY + scale) into discrete kinetic channels
 * and pairs them with contextual Kinetic Roles (Atmospheric Scrim, Focal Surface Lock, Tactile Press).
 *
 * Includes MutationObserver lifecycle tracking to dynamically detect conditionally
 * mounted or portaled dialogs, menus, and drawers.
 */

import * as React from "react"
import { KineticChannelDef } from "@/components/studio/domain/studio-types"

export interface SnifferOptions {
  phase?: "enter" | "exit"
  scenarioKey?: string
}

export type KineticRole =
  | "Atmospheric Scrim"
  | "Focal Surface Lock"
  | "Tactile Press"
  | "Edge Sheet Slide"
  | "Track Pagination"
  | "Spatial Glide"
  | "Atmospheric Fade"

export interface InferredRoleMeta {
  role: KineticRole
  label: string
  defaultCurveId: string
  unit: "px" | "" | "deg" | "%"
  kind: "scalar" | "dimension" | "angular"
  from: number
  to: number
}

export interface ParsedPropertyDelta {
  from: number
  to: number
  unit: "px" | "" | "deg" | "%"
  kind: "scalar" | "dimension" | "angular"
}

/**
 * Parses CSS length and dimension strings into numeric value and unit.
 * Supports px, rem, %, deg, and dimensionless scalars.
 */
export function parseLengthValue(raw: string | undefined): {
  value: number
  unit: "px" | "" | "deg" | "%"
} {
  if (!raw || typeof raw !== "string") return { value: 0, unit: "" }
  const trimmed = raw.trim()

  if (trimmed.endsWith("px")) {
    const v = parseFloat(trimmed)
    return { value: Number.isNaN(v) ? 0 : v, unit: "px" }
  }
  if (trimmed.endsWith("rem")) {
    const v = parseFloat(trimmed)
    return { value: Number.isNaN(v) ? 0 : v * 16, unit: "px" }
  }
  if (trimmed.endsWith("%")) {
    const v = parseFloat(trimmed)
    return { value: Number.isNaN(v) ? 0 : v, unit: "%" }
  }
  if (trimmed.endsWith("deg")) {
    const v = parseFloat(trimmed)
    return { value: Number.isNaN(v) ? 0 : v, unit: "deg" }
  }

  const v = parseFloat(trimmed)
  return { value: Number.isNaN(v) ? 0 : v, unit: "" }
}

/**
 * Decomposes composite CSS transform string into distinct components.
 */
export function decomposeTransformString(
  transformStr: string
): Record<string, { value: number; unit: "px" | "" | "deg" | "%" }> {
  const result: Record<
    string,
    { value: number; unit: "px" | "" | "deg" | "%" }
  > = {}
  if (!transformStr || transformStr === "none") return result

  // 1. translateY / translateX / translate3d
  const trans3dMatch = transformStr.match(
    /translate3d\(\s*([^,\s]+)\s*,\s*([^,\s]+)(?:\s*,\s*([^,\s]+))?\s*\)/
  )
  if (trans3dMatch) {
    const parsedX = parseLengthValue(trans3dMatch[1])
    const parsedY = parseLengthValue(trans3dMatch[2])
    if (parsedX.value !== 0) result.translateX = parsedX
    if (parsedY.value !== 0) result.translateY = parsedY
  }

  const transYMatch = transformStr.match(/translateY\(\s*([^)]+)\s*\)/)
  if (transYMatch) {
    result.translateY = parseLengthValue(transYMatch[1])
  }

  const transXMatch = transformStr.match(/translateX\(\s*([^)]+)\s*\)/)
  if (transXMatch) {
    result.translateX = parseLengthValue(transXMatch[1])
  }

  // 2. scale / scale3d / scaleX / scaleY
  const scale3dMatch = transformStr.match(
    /scale3d\(\s*([^,\s]+)\s*,\s*([^,\s]+)(?:\s*,\s*([^,\s]+))?\s*\)/
  )
  if (scale3dMatch) {
    result.scale = parseLengthValue(scale3dMatch[1])
  }

  const scaleMatch = transformStr.match(
    /scale\(\s*([^,\s)]+)(?:\s*,\s*([^)]+))?\s*\)/
  )
  if (scaleMatch) {
    result.scale = parseLengthValue(scaleMatch[1])
  }

  // 3. rotate / rotateZ
  const rotateMatch = transformStr.match(/rotate(?:Z)?\(\s*([^)]+)\s*\)/)
  if (rotateMatch) {
    result.rotate = parseLengthValue(rotateMatch[1])
  }

  return result
}

/**
 * Inspects document stylesheets for @keyframes rules matching the animation name.
 * Extracts initial ("from" / "0%") and target ("to" / "100%") keyframe deltas.
 */
export function parseKeyframesFromStylesheets(
  doc: Document,
  animName: string
): Record<string, ParsedPropertyDelta> {
  const deltas: Record<string, ParsedPropertyDelta> = {}
  if (!doc?.styleSheets || !animName || animName === "none") return deltas

  try {
    for (const sheet of Array.from(doc.styleSheets)) {
      let rules: CSSRuleList | null = null
      try {
        rules = sheet.cssRules
      } catch {
        // Cross-origin stylesheet access restriction - safely ignore
        continue
      }
      if (!rules) continue

      for (const rule of Array.from(rules)) {
        // Check for CSSKeyframesRule (type === 7 or instanceof)
        if (
          ("name" in rule && (rule as CSSKeyframesRule).name === animName) ||
          rule.type === 7
        ) {
          const kfRule = rule as CSSKeyframesRule
          if (kfRule.name !== animName) continue

          let fromStyle: CSSStyleDeclaration | null = null
          let toStyle: CSSStyleDeclaration | null = null

          for (const subRule of Array.from(kfRule.cssRules)) {
            const kfSub = subRule as CSSKeyframeRule
            if (kfSub.keyText === "from" || kfSub.keyText === "0%") {
              fromStyle = kfSub.style
            }
            if (kfSub.keyText === "to" || kfSub.keyText === "100%") {
              toStyle = kfSub.style
            }
          }

          // Extract Opacity delta
          const fromOpacity = fromStyle?.opacity
            ? parseFloat(fromStyle.opacity)
            : undefined
          const toOpacity = toStyle?.opacity
            ? parseFloat(toStyle.opacity)
            : undefined
          if (fromOpacity !== undefined || toOpacity !== undefined) {
            deltas.opacity = {
              from: fromOpacity ?? 0,
              to: toOpacity ?? 1,
              unit: "",
              kind: "scalar",
            }
          }

          // Extract Transform deltas
          const fromTrans = fromStyle?.transform
            ? decomposeTransformString(fromStyle.transform)
            : {}
          const toTrans = toStyle?.transform
            ? decomposeTransformString(toStyle.transform)
            : {}

          const allKeys = new Set([
            ...Object.keys(fromTrans),
            ...Object.keys(toTrans),
          ])
          for (const k of allKeys) {
            const f = fromTrans[k]
            const t = toTrans[k]
            const unit =
              f?.unit ||
              t?.unit ||
              (k.includes("rotate") ? "deg" : k.includes("scale") ? "" : "px")
            const kind = k.includes("rotate")
              ? "angular"
              : k.includes("scale")
                ? "scalar"
                : "dimension"

            deltas[k] = {
              from: f ? f.value : k.includes("scale") ? 1 : 0,
              to: t ? t.value : k.includes("scale") ? 1 : 0,
              unit,
              kind,
            }
          }

          return deltas
        }
      }
    }
  } catch {
    // Stylesheet parsing fallback
  }

  return deltas
}

/**
 * Infers kinetic role, label, and default curve based on element context and animated property.
 */
export function inferKineticRole(
  el: HTMLElement,
  property: string,
  phase: "enter" | "exit" = "enter"
): InferredRoleMeta {
  const isExit = phase === "exit"
  const easeTarget = el.getAttribute("data-ease-target")?.toLowerCase() || ""
  const ariaRole = el.getAttribute("role")?.toLowerCase() || ""
  const tagName = el.tagName.toLowerCase()
  const classList = el.className.toLowerCase()

  // 1. Atmospheric Scrim (Backdrops, Overlays, Blurs)
  const isBackdrop =
    easeTarget === "backdrop" ||
    classList.includes("backdrop") ||
    classList.includes("scrim") ||
    (classList.includes("fixed") &&
      classList.includes("inset-0") &&
      (classList.includes("bg-black") || classList.includes("backdrop-blur")))

  if (isBackdrop) {
    return {
      role: "Atmospheric Scrim",
      label: "Backdrop",
      defaultCurveId: isExit ? "expo-in" : "material-decelerate",
      unit: "",
      kind: "scalar",
      from: isExit ? 1 : 0,
      to: isExit ? 0 : 1,
    }
  }

  // 2. Focal Surface Lock (Dialogs, Modals, Popovers, Cards)
  const isSurface =
    easeTarget === "card" ||
    easeTarget === "surface" ||
    ariaRole === "dialog" ||
    ariaRole === "alertdialog" ||
    classList.includes("dialog") ||
    classList.includes("modal")

  if (isSurface) {
    if (property === "translateY") {
      return {
        role: "Focal Surface Lock",
        label: "Translate Y",
        defaultCurveId: isExit ? "expo-in" : "modal-sheet",
        unit: "px",
        kind: "dimension",
        from: isExit ? 0 : 16,
        to: isExit ? 12 : 0,
      }
    }
    if (property === "translateX") {
      return {
        role: "Focal Surface Lock",
        label: "Translate X",
        defaultCurveId: isExit ? "expo-in" : "modal-sheet",
        unit: "px",
        kind: "dimension",
        from: isExit ? 0 : -20,
        to: isExit ? -16 : 0,
      }
    }
    if (property === "scale") {
      return {
        role: "Focal Surface Lock",
        label: "Scale",
        defaultCurveId: isExit ? "expo-in" : "gentle",
        unit: "",
        kind: "scalar",
        from: isExit ? 1 : 0.95,
        to: isExit ? 0.95 : 1,
      }
    }
    if (property === "opacity") {
      return {
        role: "Atmospheric Fade",
        label: "Card Opacity",
        defaultCurveId: isExit ? "expo-in" : "material-decelerate",
        unit: "",
        kind: "scalar",
        from: isExit ? 1 : 0,
        to: isExit ? 0 : 1,
      }
    }
  }

  // 3. Tactile Press (Buttons, Toggles, Micro-actions)
  const isInteractive =
    tagName === "button" ||
    ariaRole === "button" ||
    classList.includes("button") ||
    classList.includes("btn")

  if (isInteractive && property === "scale") {
    return {
      role: "Tactile Press",
      label: "Tactile Press",
      defaultCurveId: "quick-spring",
      unit: "",
      kind: "scalar",
      from: 1.0,
      to: 0.95,
    }
  }

  // 4. Edge Sheet Slide (Drawers, Bottom Sheets)
  const isSheet =
    easeTarget === "sheet" ||
    easeTarget === "drawer" ||
    classList.includes("sheet") ||
    classList.includes("drawer")

  if (isSheet && (property === "translateY" || property === "translateX")) {
    return {
      role: "Edge Sheet Slide",
      label: property === "translateY" ? "Sheet Y" : "Sheet X",
      defaultCurveId: isExit ? "expo-in" : "drawer-physics",
      unit: "px",
      kind: "dimension",
      from: isExit ? 0 : 100,
      to: isExit ? 100 : 0,
    }
  }

  // 5. Track Pagination (Carousels, Sliders, TabPanels)
  const isTrack =
    easeTarget === "slide" ||
    ariaRole === "tabpanel" ||
    classList.includes("carousel") ||
    classList.includes("slider")

  if (isTrack && property === "translateX") {
    return {
      role: "Track Pagination",
      label: "Track Pagination",
      defaultCurveId: "material-standard",
      unit: "px",
      kind: "dimension",
      from: isExit ? 0 : 300,
      to: isExit ? -300 : 0,
    }
  }

  // Default Fallbacks by Property Type
  if (
    property === "translateY" ||
    property === "translateX" ||
    property === "translate"
  ) {
    return {
      role: "Spatial Glide",
      label: property === "translateY" ? "Translate Y" : "Translate X",
      defaultCurveId: isExit ? "expo-in" : "material-standard",
      unit: "px",
      kind: "dimension",
      from: isExit ? 0 : 20,
      to: isExit ? 20 : 0,
    }
  }

  if (property === "scale") {
    return {
      role: "Spatial Glide",
      label: "Scale",
      defaultCurveId: isExit ? "expo-in" : "gentle",
      unit: "",
      kind: "scalar",
      from: isExit ? 1 : 0.9,
      to: isExit ? 0.9 : 1,
    }
  }

  if (property === "rotate" || property === "rotateZ") {
    return {
      role: "Spatial Glide",
      label: "Rotation",
      defaultCurveId: "material-standard",
      unit: "deg",
      kind: "angular",
      from: isExit ? 0 : -5,
      to: isExit ? 5 : 0,
    }
  }

  return {
    role: "Atmospheric Fade",
    label: property.charAt(0).toUpperCase() + property.slice(1),
    defaultCurveId: isExit ? "expo-in" : "material-decelerate",
    unit: "",
    kind: "scalar",
    from: isExit ? 1 : 0,
    to: isExit ? 0 : 1,
  }
}

/**
 * Builds a clean, unique CSS selector for a given HTMLElement.
 */
export function buildStableSelector(el: HTMLElement): string {
  const easeTarget = el.getAttribute("data-ease-target")
  if (easeTarget) {
    return `[data-ease-target="${easeTarget}"]`
  }

  const id = el.getAttribute("id")
  if (id) {
    return `#${id}`
  }

  const role = el.getAttribute("role")
  if (role) {
    return `[role="${role}"]`
  }

  if (el.tagName.toLowerCase() === "button") {
    return "button"
  }

  return el.tagName.toLowerCase()
}

/**
 * Sniffs Tailwind `tailwindcss-animate` utility classes on an element.
 * E.g. `fade-in-*`, `zoom-in-*`, `slide-in-from-*`.
 */
export function parseTailwindAnimateChannels(
  el: HTMLElement,
  phase: "enter" | "exit" = "enter"
): KineticChannelDef[] {
  const channels: KineticChannelDef[] = []
  const className = el.className || ""
  if (typeof className !== "string") return channels

  const targetSelector = buildStableSelector(el)
  const isExit = phase === "exit"

  // 1. Fade / Opacity (fade-in-*, fade-out-*)
  if (className.includes("fade-in-") || className.includes("fade-out-")) {
    const meta = inferKineticRole(el, "opacity", phase)
    channels.push({
      id: "opacity",
      label: meta.label,
      targetSelector,
      property: "opacity",
      kind: meta.kind,
      unit: meta.unit,
      from: meta.from,
      to: meta.to,
      role: meta.role,
      defaultCurveId: meta.defaultCurveId,
    })
  }

  // 2. Zoom / Scale (zoom-in-*, zoom-out-*)
  if (className.includes("zoom-in-") || className.includes("zoom-out-")) {
    const meta = inferKineticRole(el, "scale", phase)
    channels.push({
      id: "scale",
      label: meta.label,
      targetSelector,
      property: "scale",
      kind: meta.kind,
      unit: meta.unit,
      from: meta.from,
      to: meta.to,
      role: meta.role,
      defaultCurveId: meta.defaultCurveId,
    })
  }

  // 3. Slide / Translation (slide-in-from-top/bottom/left/right)
  if (
    className.includes("slide-in-from-bottom") ||
    className.includes("slide-in-from-top") ||
    className.includes("slide-out-to-top") ||
    className.includes("slide-out-to-bottom")
  ) {
    const meta = inferKineticRole(el, "translateY", phase)
    channels.push({
      id: "translateY",
      label: meta.label,
      targetSelector,
      property: "translateY",
      kind: meta.kind,
      unit: meta.unit,
      from: meta.from,
      to: meta.to,
      role: meta.role,
      defaultCurveId: meta.defaultCurveId,
    })
  }

  if (
    className.includes("slide-in-from-left") ||
    className.includes("slide-in-from-right") ||
    className.includes("slide-out-to-left") ||
    className.includes("slide-out-to-right")
  ) {
    const meta = inferKineticRole(el, "translateX", phase)
    channels.push({
      id: "translateX",
      label: meta.label,
      targetSelector,
      property: "translateX",
      kind: meta.kind,
      unit: meta.unit,
      from: isExit ? 0 : 20,
      to: isExit ? -20 : 0,
      role: meta.role,
      defaultCurveId: meta.defaultCurveId,
    })
  }

  return channels
}

/**
 * Sniffs an individual HTMLElement to extract all detectable animated kinetic channels.
 */
export function sniffElement(
  el: HTMLElement,
  phase: "enter" | "exit" = "enter"
): KineticChannelDef[] {
  const channels: KineticChannelDef[] = []
  const easeTarget = el.getAttribute("data-ease-target")
  const targetSelector = buildStableSelector(el)

  // 1. Priority: Explicit Ease Targets (Curated and high-precision markup)
  if (easeTarget === "backdrop") {
    const meta = inferKineticRole(el, "opacity", phase)
    channels.push({
      id: "backdrop",
      label: meta.label,
      targetSelector,
      property: "opacity",
      kind: meta.kind,
      unit: meta.unit,
      from: meta.from,
      to: meta.to,
      role: meta.role,
      defaultCurveId: meta.defaultCurveId,
      durationMs: 300,
    })
    return channels
  }

  if (easeTarget === "card" || el.getAttribute("role") === "dialog") {
    // Multi-Channel Decomposition: Dialog surface animates both translateY and scale
    const metaTranslate = inferKineticRole(el, "translateY", phase)
    channels.push({
      id: "translateY",
      label: metaTranslate.label,
      targetSelector,
      property: "translateY",
      kind: metaTranslate.kind,
      unit: metaTranslate.unit,
      from: metaTranslate.from,
      to: metaTranslate.to,
      role: metaTranslate.role,
      defaultCurveId: metaTranslate.defaultCurveId,
      durationMs: 400,
    })

    const metaScale = inferKineticRole(el, "scale", phase)
    channels.push({
      id: "scale",
      label: metaScale.label,
      targetSelector,
      property: "scale",
      kind: metaScale.kind,
      unit: metaScale.unit,
      from: metaScale.from,
      to: metaScale.to,
      role: metaScale.role,
      defaultCurveId: metaScale.defaultCurveId,
      durationMs: 400,
    })

    return channels
  }

  // 2. CSS @keyframes stylesheet inspection
  if (typeof window !== "undefined" && el.ownerDocument) {
    try {
      const style = window.getComputedStyle(el)
      const animName = style.animationName
      if (animName && animName !== "none") {
        const kfDeltas = parseKeyframesFromStylesheets(
          el.ownerDocument,
          animName
        )
        for (const [prop, delta] of Object.entries(kfDeltas)) {
          const meta = inferKineticRole(el, prop, phase)
          channels.push({
            id: prop,
            label: meta.label,
            targetSelector,
            property: prop,
            kind: delta.kind,
            unit: delta.unit,
            from: delta.from,
            to: delta.to,
            role: meta.role,
            defaultCurveId: meta.defaultCurveId,
          })
        }
        if (channels.length > 0) return channels
      }
    } catch {
      // Stylesheet inspection fallback
    }
  }

  // 3. Tailwind `tailwindcss-animate` utility classes inspection
  const twChannels = parseTailwindAnimateChannels(el, phase)
  if (twChannels.length > 0) {
    return twChannels
  }

  // 4. Computed Style & CSS Transition inspection
  if (typeof window !== "undefined") {
    try {
      const style = window.getComputedStyle(el)
      const transitionProp = style.transitionProperty || ""
      const transitionDuration = style.transitionDuration || ""

      const hasTransition =
        transitionDuration !== "" &&
        transitionDuration !== "0s" &&
        transitionDuration !== "0ms"

      if (hasTransition) {
        if (
          transitionProp.includes("all") ||
          transitionProp.includes("opacity")
        ) {
          const meta = inferKineticRole(el, "opacity", phase)
          channels.push({
            id: "opacity",
            label: meta.label,
            targetSelector,
            property: "opacity",
            kind: meta.kind,
            unit: meta.unit,
            from: meta.from,
            to: meta.to,
            role: meta.role,
            defaultCurveId: meta.defaultCurveId,
          })
        }

        if (
          transitionProp.includes("all") ||
          transitionProp.includes("transform")
        ) {
          const metaTranslate = inferKineticRole(el, "translateY", phase)
          channels.push({
            id: "translateY",
            label: metaTranslate.label,
            targetSelector,
            property: "translateY",
            kind: metaTranslate.kind,
            unit: metaTranslate.unit,
            from: metaTranslate.from,
            to: metaTranslate.to,
            role: metaTranslate.role,
            defaultCurveId: metaTranslate.defaultCurveId,
          })

          const metaScale = inferKineticRole(el, "scale", phase)
          channels.push({
            id: "scale",
            label: metaScale.label,
            targetSelector,
            property: "scale",
            kind: metaScale.kind,
            unit: metaScale.unit,
            from: metaScale.from,
            to: metaScale.to,
            role: metaScale.role,
            defaultCurveId: metaScale.defaultCurveId,
          })
        }
      }
    } catch {
      // In non-browser environments or jsdom without getComputedStyle support
    }
  }

  // 5. Fallback: Tailwind transition-* classes
  const className = el.className || ""
  if (typeof className === "string") {
    if (
      className.includes("transition-opacity") ||
      className.includes("opacity-")
    ) {
      const meta = inferKineticRole(el, "opacity", phase)
      channels.push({
        id: "opacity",
        label: meta.label,
        targetSelector,
        property: "opacity",
        kind: meta.kind,
        unit: meta.unit,
        from: meta.from,
        to: meta.to,
        role: meta.role,
        defaultCurveId: meta.defaultCurveId,
      })
    }
  }

  return channels
}

/**
 * Sniffs an entire DOM tree or Document for animated components and channels.
 */
export function sniffStageAnimations(
  root: Document | HTMLElement,
  scenarioKey: string = "dialog",
  phase: "enter" | "exit" = "enter"
): KineticChannelDef[] {
  const discovered: KineticChannelDef[] = []
  const seenIds = new Set<string>()

  // 1. Discover all explicit data-ease-target nodes
  const explicitTargets =
    root.querySelectorAll<HTMLElement>("[data-ease-target]")
  explicitTargets.forEach((targetEl) => {
    const elChannels = sniffElement(targetEl, phase)
    for (const ch of elChannels) {
      if (!seenIds.has(ch.id)) {
        seenIds.add(ch.id)
        discovered.push(ch)
      }
    }
  })

  // 2. Discover semantic dialogs / surfaces if not already tagged
  if (discovered.length === 0) {
    const dialogs = root.querySelectorAll<HTMLElement>(
      '[role="dialog"], [role="alertdialog"], .dialog, .modal'
    )
    dialogs.forEach((dialogEl) => {
      const elChannels = sniffElement(dialogEl, phase)
      for (const ch of elChannels) {
        if (!seenIds.has(ch.id)) {
          seenIds.add(ch.id)
          discovered.push(ch)
        }
      }
    })
  }

  // 3. WAAPI Animations discovery via document.getAnimations (if no targets found yet)
  if (discovered.length === 0) {
    const doc = "ownerDocument" in root ? root.ownerDocument || document : root
    if (typeof doc?.getAnimations === "function") {
      try {
        const anims = doc.getAnimations()
        for (const anim of anims) {
          const effect = anim.effect
          if (
            effect &&
            "target" in effect &&
            effect.target instanceof HTMLElement
          ) {
            const el = effect.target
            const elChannels = sniffElement(el, phase)
            for (const ch of elChannels) {
              if (!seenIds.has(ch.id)) {
                seenIds.add(ch.id)
                discovered.push(ch)
              }
            }
          }
        }
      } catch {
        // WAAPI query fallback
      }
    }
  }

  // 4. Fallback Default Channels: If the DOM has not rendered yet or is empty,
  // provide standard archetype channels so the toolbar is always functional.
  if (
    discovered.length === 0 &&
    (scenarioKey === "dialog" || scenarioKey === "modal")
  ) {
    const isExit = phase === "exit"
    return [
      {
        id: "backdrop",
        label: "Backdrop",
        targetSelector: '[data-ease-target="backdrop"]',
        property: "opacity",
        kind: "scalar",
        unit: "",
        from: isExit ? 1 : 0,
        to: isExit ? 0 : 1,
        role: "Atmospheric Scrim",
        defaultCurveId: isExit ? "expo-in" : "material-decelerate",
        durationMs: 300,
      },
      {
        id: "translateY",
        label: "Translate Y",
        targetSelector: '[data-ease-target="card"]',
        property: "translateY",
        kind: "dimension",
        unit: "px",
        from: isExit ? 0 : 16,
        to: isExit ? 12 : 0,
        role: "Focal Surface Lock",
        defaultCurveId: isExit ? "expo-in" : "modal-sheet",
        durationMs: 400,
      },
      {
        id: "scale",
        label: "Scale",
        targetSelector: '[data-ease-target="card"]',
        property: "scale",
        kind: "scalar",
        unit: "",
        from: isExit ? 1 : 0.95,
        to: isExit ? 0.95 : 1,
        role: "Focal Surface Lock",
        defaultCurveId: isExit ? "expo-in" : "gentle",
        durationMs: 400,
      },
    ]
  }

  return discovered
}

/**
 * Reactive DOM Mutation Observer:
 * Automatically watches for dynamically mounted, portaled, or toggled components.
 * Returns a teardown function to disconnect when unmounted.
 */
export function observeStageMutations(
  target: HTMLElement | Document,
  onMutate: () => void
): () => void {
  if (
    typeof window === "undefined" ||
    typeof MutationObserver === "undefined"
  ) {
    return () => {}
  }

  const observerTarget =
    target instanceof Document ? target.body || target.documentElement : target

  if (!observerTarget) return () => {}

  let rafId: number | null = null

  const observer = new MutationObserver(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      onMutate()
      rafId = null
    })
  })

  observer.observe(observerTarget, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-state", "open", "style"],
  })

  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    observer.disconnect()
  }
}

/**
 * React Hook that reactively binds the animation sniffer to live DOM mutations.
 */
export function useSnifferObserver(
  root: Document | HTMLElement | null,
  scenarioKey: string,
  phase: "enter" | "exit",
  onDiscovered: (channels: KineticChannelDef[]) => void
) {
  React.useEffect(() => {
    if (!root) return

    // 1. Initial sniff
    const initial = sniffStageAnimations(root, scenarioKey, phase)
    onDiscovered(initial)

    // 2. Observe dynamic changes (portals, conditional mounting, state toggles)
    const cleanup = observeStageMutations(root, () => {
      const updated = sniffStageAnimations(root, scenarioKey, phase)
      onDiscovered(updated)
    })

    return cleanup
  }, [root, scenarioKey, phase, onDiscovered])
}
