/**
 * @file core/registry/exporters.ts
 * @description Code generation exporter plugin registry for CSS, Tailwind, Motion, and GSAP.
 *
 * Guaranteed Invariants:
 * - ZERO React or DOM dependencies.
 * - Formats numbers cleanly without floating-point artifacts.
 * - CSS linear(...) quantizer formats spring physics directly into native CSS.
 * - Tailwind exporter formats linear(...) with underscores (_) for valid arbitrary syntax.
 * - Motion exporter formats clean type: "spring" parameters (mass, stiffness, damping).
 * - GSAP exporter compiles real CustomEase SVG paths (M0,0...) and NEVER fakes power4.out.
 */

import {
  ChannelBinding,
  EaseCurve,
  SpringDurationMode,
  SpringParams,
  TransitionTrackPlugin,
} from "../schema"
import {
  compileSpringToLinearCss,
  compileSpringToSvgPath,
} from "../math/spring-compilers"
import {
  computeSpringSettleTimeMs,
  fitSpringToDurationMs,
} from "../math/spring-ode"
import { PluginRegistry } from "./plugin-registry"

/** Supported code exporter target identifiers. */
export type ExporterId = "css" | "tailwind" | "motion" | "gsap"

/** Scope for single-ease export: pure timing curve vs runnable component snippet. */
export type ExportFormatScope = "ease" | "snippet"

/** Contract for a code generation exporter plugin. */
export interface ExporterPlugin {
  /** Unique exporter identifier. */
  id: ExporterId
  /** Human-readable display label. */
  label: string
  /** Source code syntax highlighting mode. */
  language: "css" | "html" | "tsx" | "ts"
  /** Compiles a single channel binding into code snippet. */
  compileChannel: (channel: ChannelBinding) => string
  /** Compiles an entire choreographed transition track into code snippet. */
  compileTrack: (track: TransitionTrackPlugin) => string
}

// ============================================================================
// Formatting & Resolution Helpers
// ============================================================================

/** Formats a number to max decimals, cleanly stripping trailing zeros. */
function formatNum(n: number, maxDecimals = 3): string {
  if (Number.isInteger(n)) return n.toString()
  const s = n.toFixed(maxDecimals)
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s
}

/** Converts a human string or kebab/colon delimited identifier to clean camelCase. */
function toCamelCase(str: string): string {
  const words = str
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return ""
  if (words.length === 1) {
    return words[0].charAt(0).toLowerCase() + words[0].slice(1)
  }

  return words
    .map((word, index) => {
      if (index === 0) return word.toLowerCase()
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join("")
}

/** Resolves clean camelCase identifier from curve.name for GSAP CustomEase.create("<id>", ...). */
function getGsapCustomEaseId(curve: EaseCurve): string {
  const fromName = toCamelCase(curve.name)
  if (fromName) return fromName
  const fromId = toCamelCase(curve.id)
  if (fromId) return fromId
  return "customEase"
}

/** Maps animatable channel property to its standard CSS transition property. */
function getCssProperty(property: string): string {
  switch (property) {
    case "translateX":
    case "translateY":
    case "scale":
    case "rotate":
      return "transform"
    case "opacity":
      return "opacity"
    case "blur":
      return "filter"
    default:
      return "all"
  }
}

/** Maps animatable channel property to Tailwind transition class. */
function getTailwindPropertyClass(property: string): string {
  switch (property) {
    case "translateX":
    case "translateY":
    case "scale":
    case "rotate":
      return "transition-transform"
    case "opacity":
      return "transition-opacity"
    case "blur":
      return "transition-all"
    default:
      return "transition-all"
  }
}

/** Resolves effective duration and spring params respecting springMode. */
function resolveChannelEffectiveMotion(channel: ChannelBinding): {
  durationMs: number
  effectiveSpring: SpringParams
} {
  if (channel.curve.engine === "bezier") {
    return {
      durationMs: Math.max(1, Math.round(channel.durationMs)),
      effectiveSpring: channel.curve.spring,
    }
  }

  const effectiveSpring =
    channel.springMode === "fit"
      ? fitSpringToDurationMs(channel.curve.spring, channel.durationMs)
      : channel.curve.spring

  const durationMs = computeSpringSettleTimeMs(effectiveSpring, 0.005)

  return {
    durationMs,
    effectiveSpring,
  }
}

/** Resolves effective duration and spring params for a single EaseCurve. */
function resolveCurveEffectiveMotion(
  curve: EaseCurve,
  durationMs?: number,
  springMode: SpringDurationMode = "fit"
): {
  durationMs: number
  effectiveSpring: SpringParams
} {
  const baseDuration = durationMs ?? curve.suggestedDurationMs
  if (curve.engine === "bezier") {
    return {
      durationMs: Math.max(1, Math.round(baseDuration)),
      effectiveSpring: curve.spring,
    }
  }

  if (springMode === "fit") {
    const effectiveSpring = fitSpringToDurationMs(curve.spring, baseDuration)
    return {
      durationMs: Math.max(1, Math.round(baseDuration)),
      effectiveSpring,
    }
  }

  const effectiveSpring = curve.spring
  const naturalDurationMs = computeSpringSettleTimeMs(effectiveSpring, 0.005)
  return {
    durationMs: naturalDurationMs,
    effectiveSpring,
  }
}

// ============================================================================
// 1. CSS Exporter Implementation
// ============================================================================

function compileChannelCss(channel: ChannelBinding): string {
  const { durationMs, effectiveSpring } = resolveChannelEffectiveMotion(channel)
  const cssProp = getCssProperty(channel.property)

  let transitionValue = ""
  if (channel.curve.engine === "bezier") {
    const p1x = formatNum(channel.curve.bezier.p1.x)
    const p1y = formatNum(channel.curve.bezier.p1.y)
    const p2x = formatNum(channel.curve.bezier.p2.x)
    const p2y = formatNum(channel.curve.bezier.p2.y)
    transitionValue = `${cssProp} ${durationMs}ms cubic-bezier(${p1x}, ${p1y}, ${p2x}, ${p2y})`
  } else {
    const { linearCss } = compileSpringToLinearCss(effectiveSpring, {
      durationMs,
    })
    transitionValue = `${cssProp} ${durationMs}ms ${linearCss}`
  }

  const lines = [`transition: ${transitionValue};`]
  if (channel.delayMs > 0) {
    lines.push(`transition-delay: ${channel.delayMs}ms;`)
  }
  return lines.join("\n")
}

function compileTrackCss(track: TransitionTrackPlugin): string {
  const lines: string[] = [
    `/* --- ${track.componentLabel} (${track.phaseLabel}) --- */`,
  ]
  for (const channel of track.channels) {
    lines.push(`/* ${channel.label} */`)
    const channelCss = compileChannelCss(channel)
    lines.push(
      `.${track.componentId}-${channel.id} {`,
      `  ${channelCss.split("\n").join("\n  ")}`,
      `}`,
      ""
    )
  }
  return lines.join("\n").trim()
}

// ============================================================================
// 2. Tailwind Exporter Implementation
// ============================================================================

function compileChannelTailwind(channel: ChannelBinding): string {
  const { durationMs, effectiveSpring } = resolveChannelEffectiveMotion(channel)
  const propClass = getTailwindPropertyClass(channel.property)

  let easeClass = ""
  if (channel.curve.engine === "bezier") {
    const p1x = formatNum(channel.curve.bezier.p1.x)
    const p1y = formatNum(channel.curve.bezier.p1.y)
    const p2x = formatNum(channel.curve.bezier.p2.x)
    const p2y = formatNum(channel.curve.bezier.p2.y)
    easeClass = `ease-[cubic-bezier(${p1x},${p1y},${p2x},${p2y})]`
  } else {
    const { linearCss } = compileSpringToLinearCss(effectiveSpring, {
      durationMs,
    })
    // Replace spaces with underscores for valid Tailwind v4 arbitrary value syntax
    const tailwindEase = linearCss.replace(/\s+/g, "_")
    easeClass = `ease-[${tailwindEase}]`
  }

  const classes = [propClass, `duration-[${durationMs}ms]`, easeClass]
  if (channel.delayMs > 0) {
    classes.push(`delay-[${channel.delayMs}ms]`)
  }
  return classes.join(" ")
}

function compileTrackTailwind(track: TransitionTrackPlugin): string {
  const lines: string[] = [
    `/* --- ${track.componentLabel} (${track.phaseLabel}) --- */`,
  ]
  for (const channel of track.channels) {
    lines.push(`/* ${channel.label} */`)
    lines.push(compileChannelTailwind(channel), "")
  }
  return lines.join("\n").trim()
}

// ============================================================================
// 3. Motion (motion/react) Exporter Implementation
// ============================================================================

function compileChannelMotion(channel: ChannelBinding): string {
  const { durationMs, effectiveSpring } = resolveChannelEffectiveMotion(channel)

  if (channel.curve.engine === "bezier") {
    const durSec = formatNum(durationMs / 1000)
    const p1x = formatNum(channel.curve.bezier.p1.x)
    const p1y = formatNum(channel.curve.bezier.p1.y)
    const p2x = formatNum(channel.curve.bezier.p2.x)
    const p2y = formatNum(channel.curve.bezier.p2.y)
    const delaySec =
      channel.delayMs > 0 ? `, delay: ${formatNum(channel.delayMs / 1000)}` : ""
    return `transition={{ duration: ${durSec}, ease: [${p1x}, ${p1y}, ${p2x}, ${p2y}]${delaySec} }}`
  }

  const m = formatNum(effectiveSpring.mass, 2)
  const k = formatNum(effectiveSpring.stiffness, 2)
  const c = formatNum(effectiveSpring.damping, 2)
  const vStr =
    effectiveSpring.velocity !== 0
      ? `, velocity: ${formatNum(effectiveSpring.velocity, 2)}`
      : ""
  const delaySec =
    channel.delayMs > 0 ? `, delay: ${formatNum(channel.delayMs / 1000)}` : ""
  return `transition={{ type: "spring", mass: ${m}, stiffness: ${k}, damping: ${c}${vStr}${delaySec} }}`
}

function compileTrackMotion(track: TransitionTrackPlugin): string {
  const varName = `${toCamelCase(track.id)}Transitions`
  const lines: string[] = [
    `/** Motion transitions for ${track.componentLabel} (${track.phaseLabel}) */`,
    `export const ${varName} = {`,
  ]

  for (const channel of track.channels) {
    const { durationMs, effectiveSpring } =
      resolveChannelEffectiveMotion(channel)
    lines.push(`  // ${channel.label}`)
    lines.push(`  ${channel.id}: {`)
    if (channel.curve.engine === "bezier") {
      const durSec = formatNum(durationMs / 1000)
      const p1x = formatNum(channel.curve.bezier.p1.x)
      const p1y = formatNum(channel.curve.bezier.p1.y)
      const p2x = formatNum(channel.curve.bezier.p2.x)
      const p2y = formatNum(channel.curve.bezier.p2.y)
      lines.push(`    duration: ${durSec},`)
      if (channel.delayMs > 0) {
        lines.push(`    delay: ${formatNum(channel.delayMs / 1000)},`)
      }
      lines.push(`    ease: [${p1x}, ${p1y}, ${p2x}, ${p2y}],`)
    } else {
      const m = formatNum(effectiveSpring.mass, 2)
      const k = formatNum(effectiveSpring.stiffness, 2)
      const c = formatNum(effectiveSpring.damping, 2)
      lines.push(`    type: "spring",`)
      lines.push(`    mass: ${m},`)
      lines.push(`    stiffness: ${k},`)
      lines.push(`    damping: ${c},`)
      if (effectiveSpring.velocity !== 0) {
        lines.push(`    velocity: ${formatNum(effectiveSpring.velocity, 2)},`)
      }
      if (channel.delayMs > 0) {
        lines.push(`    delay: ${formatNum(channel.delayMs / 1000)},`)
      }
    }
    lines.push(`  },`)
  }

  lines.push(`} as const`)
  return lines.join("\n")
}

// ============================================================================
// 4. GSAP Exporter Implementation
// ============================================================================

function compileChannelGsap(channel: ChannelBinding): string {
  const { durationMs, effectiveSpring } = resolveChannelEffectiveMotion(channel)
  const durSec = formatNum(durationMs / 1000)
  const delayStr =
    channel.delayMs > 0 ? `, delay: ${formatNum(channel.delayMs / 1000)}` : ""

  if (channel.curve.engine === "bezier") {
    const p1x = formatNum(channel.curve.bezier.p1.x)
    const p1y = formatNum(channel.curve.bezier.p1.y)
    const p2x = formatNum(channel.curve.bezier.p2.x)
    const p2y = formatNum(channel.curve.bezier.p2.y)
    return `gsap.to(".target", { duration: ${durSec}, ease: "cubic-bezier(${p1x},${p1y},${p2x},${p2y})"${delayStr}, overwrite: "auto" });`
  }

  const svgPath = compileSpringToSvgPath(effectiveSpring, { durationMs })
  const easeId = "springEase"
  return [
    `gsap.registerPlugin(CustomEase);`,
    `CustomEase.create("${easeId}", "${svgPath}");`,
    `gsap.to(".target", { duration: ${durSec}, ease: "${easeId}"${delayStr}, overwrite: "auto" });`,
  ].join("\n")
}

function compileTrackGsap(track: TransitionTrackPlugin): string {
  const lines: string[] = [`import gsap from "gsap";`]

  const springChannels = track.channels.filter(
    (c) => c.curve.engine === "spring"
  )
  if (springChannels.length > 0) {
    lines.push(`import { CustomEase } from "gsap/CustomEase";`, "")
    lines.push(`gsap.registerPlugin(CustomEase);`, "")
    for (const channel of springChannels) {
      const { durationMs, effectiveSpring } =
        resolveChannelEffectiveMotion(channel)
      const svgPath = compileSpringToSvgPath(effectiveSpring, { durationMs })
      const easeId = `${toCamelCase(track.id)}_${channel.id}Ease`
      lines.push(`CustomEase.create("${easeId}", "${svgPath}");`)
    }
    lines.push("")
  }

  lines.push(
    `/* --- ${track.componentLabel} (${track.phaseLabel}) Animation --- */`
  )
  for (const channel of track.channels) {
    const { durationMs } = resolveChannelEffectiveMotion(channel)
    const durSec = formatNum(durationMs / 1000)
    const delayStr =
      channel.delayMs > 0 ? `, delay: ${formatNum(channel.delayMs / 1000)}` : ""
    const targetSelector = `.${track.componentId}-${channel.id}`

    lines.push(`// ${channel.label}`)
    if (channel.curve.engine === "bezier") {
      const p1x = formatNum(channel.curve.bezier.p1.x)
      const p1y = formatNum(channel.curve.bezier.p1.y)
      const p2x = formatNum(channel.curve.bezier.p2.x)
      const p2y = formatNum(channel.curve.bezier.p2.y)
      lines.push(
        `gsap.to("${targetSelector}", { duration: ${durSec}, ease: "cubic-bezier(${p1x},${p1y},${p2x},${p2y})"${delayStr}, overwrite: "auto" });`
      )
    } else {
      const easeId = `${toCamelCase(track.id)}_${channel.id}Ease`
      lines.push(
        `gsap.to("${targetSelector}", { duration: ${durSec}, ease: "${easeId}"${delayStr}, overwrite: "auto" });`
      )
    }
  }

  return lines.join("\n").trim()
}

// ============================================================================
// Exporter Registry Instance & Public API
// ============================================================================

/** Pre-registered exporter registry instance. */
export const exporterRegistry = new PluginRegistry<ExporterPlugin>()

exporterRegistry.register({
  id: "css",
  label: "CSS",
  language: "css",
  compileChannel: compileChannelCss,
  compileTrack: compileTrackCss,
})

exporterRegistry.register({
  id: "tailwind",
  label: "Tailwind",
  language: "html",
  compileChannel: compileChannelTailwind,
  compileTrack: compileTrackTailwind,
})

exporterRegistry.register({
  id: "motion",
  label: "Motion",
  language: "tsx",
  compileChannel: compileChannelMotion,
  compileTrack: compileTrackMotion,
})

exporterRegistry.register({
  id: "gsap",
  label: "GSAP",
  language: "ts",
  compileChannel: compileChannelGsap,
  compileTrack: compileTrackGsap,
})

/**
 * Retrieves an exporter plugin by target identifier.
 *
 * @param id - "css" | "tailwind" | "motion" | "gsap".
 * @returns The ExporterPlugin or undefined.
 */
export function getExporterPlugin(id: ExporterId): ExporterPlugin | undefined {
  return exporterRegistry.get(id)
}

/**
 * Compiles a single channel binding into code snippet using the chosen exporter.
 *
 * @param id - Exporter ID.
 * @param channel - Channel binding definition.
 * @returns Compiled code string.
 */
export function compileChannelExport(
  id: ExporterId,
  channel: ChannelBinding
): string {
  const plugin = getExporterPlugin(id)
  if (!plugin) {
    throw new Error(`Unknown exporter plugin '${id}'`)
  }
  return plugin.compileChannel(channel)
}

/**
 * Compiles an entire transition track into code snippet using the chosen exporter.
 *
 * @param id - Exporter ID.
 * @param track - Transition track plugin definition.
 * @returns Compiled code string.
 */
export function compileTrackExport(
  id: ExporterId,
  track: TransitionTrackPlugin
): string {
  const plugin = getExporterPlugin(id)
  if (!plugin) {
    throw new Error(`Unknown exporter plugin '${id}'`)
  }
  return plugin.compileTrack(track)
}

/**
 * Compiles a single ease curve timing function/expression without boilerplate.
 *
 * @param id - Exporter target ID.
 * @param curve - Target EaseCurve.
 * @param durationMs - Optional duration override in milliseconds.
 * @param springMode - Duration fitting mode for spring physics ("fit" | "natural").
 * @returns Clean timing function or expression string.
 */
export function compileEaseOnly(
  id: ExporterId,
  curve: EaseCurve,
  durationMs?: number,
  springMode: SpringDurationMode = "fit"
): string {
  if (!getExporterPlugin(id)) {
    throw new Error(`Unknown exporter plugin '${id}'`)
  }

  const { durationMs: resolvedDur, effectiveSpring } =
    resolveCurveEffectiveMotion(curve, durationMs, springMode)

  if (curve.engine === "bezier") {
    const p1x = formatNum(curve.bezier.p1.x)
    const p1y = formatNum(curve.bezier.p1.y)
    const p2x = formatNum(curve.bezier.p2.x)
    const p2y = formatNum(curve.bezier.p2.y)

    switch (id) {
      case "css":
        return `transition-timing-function: cubic-bezier(${p1x}, ${p1y}, ${p2x}, ${p2y});`
      case "tailwind":
        return `ease-[cubic-bezier(${p1x},${p1y},${p2x},${p2y})]`
      case "motion":
        return `[${p1x}, ${p1y}, ${p2x}, ${p2y}]`
      case "gsap":
        return `"cubic-bezier(${p1x},${p1y},${p2x},${p2y})"`
    }
  }

  // Spring physics engine
  switch (id) {
    case "css": {
      const { linearCss } = compileSpringToLinearCss(effectiveSpring, {
        durationMs: resolvedDur,
      })
      return `transition-timing-function: ${linearCss};`
    }
    case "tailwind": {
      const { linearCss } = compileSpringToLinearCss(effectiveSpring, {
        durationMs: resolvedDur,
      })
      const tailwindEase = linearCss.replace(/\s+/g, "_")
      return `ease-[${tailwindEase}]`
    }
    case "motion": {
      const m = formatNum(effectiveSpring.mass, 2)
      const k = formatNum(effectiveSpring.stiffness, 2)
      const c = formatNum(effectiveSpring.damping, 2)
      const vStr =
        effectiveSpring.velocity !== 0
          ? `, velocity: ${formatNum(effectiveSpring.velocity, 2)}`
          : ""
      return `{ type: "spring", mass: ${m}, stiffness: ${k}, damping: ${c}${vStr} }`
    }
    case "gsap": {
      const svgPath = compileSpringToSvgPath(effectiveSpring, {
        durationMs: resolvedDur,
      })
      const safeName = getGsapCustomEaseId(curve)
      return [
        `gsap.registerPlugin(CustomEase);`,
        `CustomEase.create("${safeName}", "${svgPath}");`,
      ].join("\n")
    }
  }
}

/**
 * Compiles a complete, runnable drop-in snippet for a single ease curve.
 *
 * @param id - Exporter target ID.
 * @param curve - Target EaseCurve.
 * @param durationMs - Optional duration override in milliseconds.
 * @param springMode - Duration fitting mode for spring physics ("fit" | "natural").
 * @returns Fully formed code snippet for the target framework.
 */
export function compileEaseSnippet(
  id: ExporterId,
  curve: EaseCurve,
  durationMs?: number,
  springMode: SpringDurationMode = "fit"
): string {
  if (!getExporterPlugin(id)) {
    throw new Error(`Unknown exporter plugin '${id}'`)
  }

  const { durationMs: resolvedDur, effectiveSpring } =
    resolveCurveEffectiveMotion(curve, durationMs, springMode)

  if (curve.engine === "bezier") {
    const p1x = formatNum(curve.bezier.p1.x)
    const p1y = formatNum(curve.bezier.p1.y)
    const p2x = formatNum(curve.bezier.p2.x)
    const p2y = formatNum(curve.bezier.p2.y)
    const durSec = formatNum(resolvedDur / 1000)

    switch (id) {
      case "css":
        return [
          `.ease-target {`,
          `  transition: transform ${resolvedDur}ms cubic-bezier(${p1x}, ${p1y}, ${p2x}, ${p2y});`,
          `}`,
        ].join("\n")
      case "tailwind":
        return `transition-transform duration-[${resolvedDur}ms] ease-[cubic-bezier(${p1x},${p1y},${p2x},${p2y})]`
      case "motion":
        return `transition={{ duration: ${durSec}, ease: [${p1x}, ${p1y}, ${p2x}, ${p2y}] }}`
      case "gsap":
        return `gsap.to(".target", { duration: ${durSec}, ease: "cubic-bezier(${p1x},${p1y},${p2x},${p2y})", overwrite: "auto" });`
    }
  }

  // Spring physics engine
  switch (id) {
    case "css": {
      const { linearCss } = compileSpringToLinearCss(effectiveSpring, {
        durationMs: resolvedDur,
      })
      return [
        `.ease-target {`,
        `  transition: transform ${resolvedDur}ms ${linearCss};`,
        `}`,
      ].join("\n")
    }
    case "tailwind": {
      const { linearCss } = compileSpringToLinearCss(effectiveSpring, {
        durationMs: resolvedDur,
      })
      const tailwindEase = linearCss.replace(/\s+/g, "_")
      return `transition-transform duration-[${resolvedDur}ms] ease-[${tailwindEase}]`
    }
    case "motion": {
      const m = formatNum(effectiveSpring.mass, 2)
      const k = formatNum(effectiveSpring.stiffness, 2)
      const c = formatNum(effectiveSpring.damping, 2)
      const vStr =
        effectiveSpring.velocity !== 0
          ? `, velocity: ${formatNum(effectiveSpring.velocity, 2)}`
          : ""
      return `transition={{ type: "spring", mass: ${m}, stiffness: ${k}, damping: ${c}${vStr} }}`
    }
    case "gsap": {
      const svgPath = compileSpringToSvgPath(effectiveSpring, {
        durationMs: resolvedDur,
      })
      const safeName = getGsapCustomEaseId(curve)
      const durSec = formatNum(resolvedDur / 1000)
      return [
        `gsap.registerPlugin(CustomEase);`,
        `CustomEase.create("${safeName}", "${svgPath}");`,
        `gsap.to(".target", { duration: ${durSec}, ease: "${safeName}", overwrite: "auto" });`,
      ].join("\n")
    }
  }
}
