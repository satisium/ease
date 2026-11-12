import * as React from "react"
import { EvaluatedChannel } from "./kinetic-evaluator"
import { KineticChannelDef } from "./studio-types"

const TRANSFORM_PROPERTIES = new Set([
  "transform",
  "translate",
  "translateX",
  "translateY",
  "translateZ",
  "x",
  "y",
  "z",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "skew",
  "skewX",
  "skewY",
])

interface TargetChannelGroup {
  element: HTMLElement
  transforms: Record<string, { value: number; unit: string }>
  styles: Record<string, string>
}

/**
 * Universal DOM Applicator:
 * Groups evaluated channels by target element and applies properties with
 * automatic spatial transform consolidation and zero property collisions.
 */
export function applyChoreographyToDOM(
  container: Document | HTMLElement,
  channels: Record<string, EvaluatedChannel>,
  channelDefs: KineticChannelDef[]
): void {
  if (!container) return

  const targetGroups = new Map<HTMLElement, TargetChannelGroup>()

  for (const def of channelDefs) {
    const evaluated = channels[def.id]
    if (!evaluated) continue

    const selector = def.targetSelector || "[data-ease-target]"
    const element =
      container instanceof Document
        ? (container.querySelector(selector) as HTMLElement | null)
        : container.matches(selector)
          ? container
          : (container.querySelector(selector) as HTMLElement | null)

    if (!element) continue

    let group = targetGroups.get(element)
    if (!group) {
      group = {
        element,
        transforms: {},
        styles: {},
      }
      targetGroups.set(element, group)
    }

    const prop = def.property

    if (TRANSFORM_PROPERTIES.has(prop)) {
      group.transforms[prop] = {
        value: evaluated.currentValue,
        unit:
          evaluated.unit ||
          (prop.includes("rotate")
            ? "deg"
            : prop.includes("translate")
              ? "px"
              : ""),
      }
    } else if (prop.startsWith("--")) {
      group.styles[prop] = evaluated.formattedValue
    } else if (prop === "opacity") {
      group.styles["opacity"] = String(
        Math.max(0, Math.min(1, evaluated.currentValue))
      )
    } else if (
      prop === "blur" ||
      prop === "backdrop-filter" ||
      prop === "backdropFilter"
    ) {
      const blurVal = `blur(${Math.max(0, evaluated.currentValue)}px)`
      group.styles["backdropFilter"] = blurVal
      group.styles["webkitBackdropFilter"] = blurVal
    } else if (prop === "filter") {
      group.styles["filter"] = `blur(${Math.max(0, evaluated.currentValue)}px)`
    } else {
      group.styles[prop] = evaluated.formattedValue
    }
  }

  // Apply consolidated styles to each target element
  for (const group of targetGroups.values()) {
    const el = group.element

    // 1. Consolidate spatial transforms
    if (Object.keys(group.transforms).length > 0) {
      const t = group.transforms

      const transX = t.translateX ?? t.x
      const transY = t.translateY ?? t.y
      const transZ = t.translateZ ?? t.z

      const xStr = transX ? `${transX.value}${transX.unit || "px"}` : "0px"
      const yStr = transY ? `${transY.value}${transY.unit || "px"}` : "0px"
      const zStr = transZ ? `${transZ.value}${transZ.unit || "px"}` : "0px"

      const hasTranslate =
        transX !== undefined || transY !== undefined || transZ !== undefined

      const scaleUniform = t.scale
      const scaleX = t.scaleX ?? scaleUniform
      const scaleY = t.scaleY ?? scaleUniform
      const hasScale = scaleX !== undefined || scaleY !== undefined
      const sx = scaleX ? scaleX.value : 1
      const sy = scaleY ? scaleY.value : 1

      const rotZ = t.rotate ?? t.rotateZ
      const rotX = t.rotateX
      const rotY = t.rotateY

      const parts: string[] = []

      if (hasTranslate) {
        parts.push(`translate3d(${xStr}, ${yStr}, ${zStr})`)
      }
      if (hasScale) {
        parts.push(`scale(${sx}, ${sy})`)
      }
      if (rotZ) {
        parts.push(`rotate(${rotZ.value}${rotZ.unit || "deg"})`)
      }
      if (rotX) {
        parts.push(`rotateX(${rotX.value}${rotX.unit || "deg"})`)
      }
      if (rotY) {
        parts.push(`rotateY(${rotY.value}${rotY.unit || "deg"})`)
      }

      el.style.transform = parts.length > 0 ? parts.join(" ") : ""
    }

    // 2. Apply standard styles and CSS variables
    for (const [styleProp, styleVal] of Object.entries(group.styles)) {
      el.style.setProperty(styleProp, styleVal)
    }
  }
}

/**
 * React hook that binds a choreography frame directly to DOM elements.
 */
export function useUniversalDomApplicator(
  rootRef: React.RefObject<HTMLElement | null> | null,
  channels: Record<string, EvaluatedChannel>,
  channelDefs: KineticChannelDef[]
) {
  React.useEffect(() => {
    if (typeof document === "undefined") return
    const container = rootRef?.current || document
    applyChoreographyToDOM(container, channels, channelDefs)
  }, [rootRef, channels, channelDefs])
}
