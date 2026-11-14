/**
 * @file core/math/parser.ts
 * @description Robust multi-format kinetic curve parser.
 *
 * Supports:
 * 1. CSS named easing keywords (linear, ease, ease-in, ease-out, ease-in-out)
 * 2. CSS cubic-bezier(...) and Tailwind ease-[cubic-bezier(...)] duration-[280ms]
 * 3. Raw 4-coordinate arrays [x1, y1, x2, y2] and lists x1, y1, x2, y2
 * 4. Motion / JS spring configs ({ stiffness, damping, mass }) and spring(m, k, c)
 *
 * Guaranteed Invariants:
 * - ZERO React or DOM dependencies.
 * - Never throws on invalid input; returns null safely.
 * - Defensively validates numerical bounds and rejects NaN / Infinity.
 */

import { BezierParams, MotionEngine, SpringParams } from "../schema"

/** Result returned when a curve string is successfully parsed. */
export interface ParsedCurveResult {
  engine: MotionEngine
  bezier?: BezierParams
  spring?: SpringParams
  suggestedDurationMs?: number
}

/** Standard CSS easing keywords mapped to their canonical cubic-bezier coordinates. */
const CSS_KEYWORD_MAP: Record<string, BezierParams> = {
  linear: { p1: { x: 0, y: 0 }, p2: { x: 1, y: 1 } },
  ease: { p1: { x: 0.25, y: 0.1 }, p2: { x: 0.25, y: 1 } },
  "ease-in": { p1: { x: 0.42, y: 0 }, p2: { x: 1, y: 1 } },
  "ease-out": { p1: { x: 0, y: 0 }, p2: { x: 0.58, y: 1 } },
  "ease-in-out": { p1: { x: 0.42, y: 0 }, p2: { x: 0.58, y: 1 } },
}

/**
 * Extracts optional duration in milliseconds from a Tailwind class or CSS transition string.
 * Examples: `duration-[280ms]`, `duration-[0.3s]`, `0.28s`, `280ms`.
 */
function extractDurationMs(input: string): number | undefined {
  // 1. Tailwind duration syntax: duration-[280ms] or duration-[0.3s]
  const tailwindMatch = input.match(/duration-\[(\d+(?:\.\d+)?)(ms|s)\]/i)
  if (tailwindMatch) {
    const val = parseFloat(tailwindMatch[1])
    const unit = tailwindMatch[2].toLowerCase()
    return unit === "s" ? Math.round(val * 1000) : Math.round(val)
  }

  // 2. CSS transition syntax: 0.3s or 300ms
  const cssMatch = input.match(
    /(?:transition|duration)?[:\s=]*(\d+(?:\.\d+)?)(ms|s)\b/i
  )
  if (cssMatch) {
    const val = parseFloat(cssMatch[1])
    const unit = cssMatch[2].toLowerCase()
    return unit === "s" ? Math.round(val * 1000) : Math.round(val)
  }

  return undefined
}

/**
 * Parses any supported CSS, Tailwind, or Motion string into a strongly typed curve definition.
 *
 * @param rawInput - Raw string (e.g. `cubic-bezier(0.16, 1, 0.3, 1)`, `{ stiffness: 860, damping: 46 }`).
 * @returns ParsedCurveResult or null if input is invalid or unrecognized.
 */
export function parseCurveString(rawInput: string): ParsedCurveResult | null {
  if (!rawInput || typeof rawInput !== "string") {
    return null
  }

  const trimmed = rawInput.trim()
  if (!trimmed) {
    return null
  }

  const suggestedDurationMs = extractDurationMs(trimmed)

  // --------------------------------------------------------------------------
  // 1. CSS Named Keywords
  // --------------------------------------------------------------------------
  const lowerKeyword = trimmed.toLowerCase()
  if (CSS_KEYWORD_MAP[lowerKeyword]) {
    return {
      engine: "bezier",
      bezier: CSS_KEYWORD_MAP[lowerKeyword],
      suggestedDurationMs,
    }
  }

  // --------------------------------------------------------------------------
  // 2. CSS cubic-bezier(...) [including inside Tailwind ease-[...]]
  // --------------------------------------------------------------------------
  const cubicBezierMatch = trimmed.match(
    /cubic-bezier\s*\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)/i
  )

  if (cubicBezierMatch) {
    const x1 = parseFloat(cubicBezierMatch[1])
    const y1 = parseFloat(cubicBezierMatch[2])
    const x2 = parseFloat(cubicBezierMatch[3])
    const y2 = parseFloat(cubicBezierMatch[4])

    if ([x1, y1, x2, y2].every(Number.isFinite)) {
      return {
        engine: "bezier",
        bezier: {
          p1: { x: Math.min(Math.max(x1, 0), 1), y: y1 },
          p2: { x: Math.min(Math.max(x2, 0), 1), y: y2 },
        },
        suggestedDurationMs,
      }
    }
    return null
  }

  // --------------------------------------------------------------------------
  // 3. Raw 4-Number Arrays or Coordinate Lists: [x1, y1, x2, y2] or x1, y1, x2, y2
  // --------------------------------------------------------------------------
  const rawArrayMatch = trimmed.match(
    /^\s*\[?\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\]?\s*$/
  )

  if (rawArrayMatch) {
    const x1 = parseFloat(rawArrayMatch[1])
    const y1 = parseFloat(rawArrayMatch[2])
    const x2 = parseFloat(rawArrayMatch[3])
    const y2 = parseFloat(rawArrayMatch[4])

    if ([x1, y1, x2, y2].every(Number.isFinite)) {
      return {
        engine: "bezier",
        bezier: {
          p1: { x: Math.min(Math.max(x1, 0), 1), y: y1 },
          p2: { x: Math.min(Math.max(x2, 0), 1), y: y2 },
        },
        suggestedDurationMs,
      }
    }
    return null
  }

  // --------------------------------------------------------------------------
  // 4. Motion / JS Spring Objects & Functions
  // --------------------------------------------------------------------------
  // Match key-value syntax: { stiffness: 860, damping: 46, mass: 1 } or stiffness: 860, damping: 46
  const stiffnessMatch = trimmed.match(/stiffness\s*[:=]\s*(-?\d*\.?\d+)/i)
  const dampingMatch = trimmed.match(/damping\s*[:=]\s*(-?\d*\.?\d+)/i)

  if (stiffnessMatch && dampingMatch) {
    const stiffness = parseFloat(stiffnessMatch[1])
    const damping = parseFloat(dampingMatch[1])

    const massMatch = trimmed.match(/mass\s*[:=]\s*(-?\d*\.?\d+)/i)
    const mass = massMatch ? parseFloat(massMatch[1]) : 1

    const velocityMatch = trimmed.match(/velocity\s*[:=]\s*(-?\d*\.?\d+)/i)
    const velocity = velocityMatch ? parseFloat(velocityMatch[1]) : 0

    if (
      Number.isFinite(mass) &&
      Number.isFinite(stiffness) &&
      Number.isFinite(damping) &&
      Number.isFinite(velocity) &&
      mass > 0 &&
      stiffness > 0 &&
      damping >= 0
    ) {
      return {
        engine: "spring",
        spring: { mass, stiffness, damping, velocity },
        suggestedDurationMs,
      }
    }
    return null
  }

  // Match positional functional spring(m, k, c) or spring(k, c)
  const functionalSpringMatch = trimmed.match(
    /spring\s*\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)(?:\s*,\s*(-?\d*\.?\d+))?(?:\s*,\s*(-?\d*\.?\d+))?\s*\)/i
  )

  if (functionalSpringMatch) {
    let mass = 1
    let stiffness = 0
    let damping = 0
    let velocity = 0

    if (functionalSpringMatch[3] !== undefined) {
      // 3 or 4 args: spring(mass, stiffness, damping [, velocity])
      mass = parseFloat(functionalSpringMatch[1])
      stiffness = parseFloat(functionalSpringMatch[2])
      damping = parseFloat(functionalSpringMatch[3])
      if (functionalSpringMatch[4] !== undefined) {
        velocity = parseFloat(functionalSpringMatch[4])
      }
    } else {
      // 2 args: spring(stiffness, damping)
      stiffness = parseFloat(functionalSpringMatch[1])
      damping = parseFloat(functionalSpringMatch[2])
    }

    if (
      Number.isFinite(mass) &&
      Number.isFinite(stiffness) &&
      Number.isFinite(damping) &&
      Number.isFinite(velocity) &&
      mass > 0 &&
      stiffness > 0 &&
      damping >= 0
    ) {
      return {
        engine: "spring",
        spring: { mass, stiffness, damping, velocity },
        suggestedDurationMs,
      }
    }
    return null
  }

  // Unrecognized pattern
  return null
}
