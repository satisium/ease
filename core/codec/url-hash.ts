/**
 * @file core/codec/url-hash.ts
 * @description Lossless URL hash encoder and decoder for shareable motion state.
 *
 * Invariants:
 * - 100% pure TypeScript. Zero browser globals or React dependencies.
 * - Strict validation: Returns `null` on corrupt, negative-stiffness, or out-of-bounds hashes (never throws!).
 * - Idempotent round-trips for both Bézier and Spring curves across standard URLs and standalone hashes.
 */

import {
  BezierParams,
  MotionEngine,
  SpringDurationMode,
  SpringParams,
} from "../schema"

/** Shareable animation configuration payload encoded into URL hashes. */
export interface UrlHashPayload {
  trackId: string
  channelId: string
  curveId?: string
  curveName?: string
  engine: MotionEngine
  bezier: BezierParams
  spring: SpringParams
  durationMs: number
  springMode: SpringDurationMode
}

/** Utility to cleanly round float numbers to avoid long IEEE-754 mantissa tails. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * Encodes an animation state payload into a lossless URL hash string.
 *
 * @param payload - Animation configuration payload.
 * @returns Clean URL hash string starting with `#`.
 */
export function encodeEaseHash(payload: UrlHashPayload): string {
  const params = new URLSearchParams()
  params.set("t", payload.trackId)
  params.set("ch", payload.channelId)
  params.set("e", payload.engine)

  if (payload.curveId) {
    params.set("id", payload.curveId)
  }
  if (payload.curveName) {
    params.set("name", payload.curveName)
  }

  params.set("d", Math.round(payload.durationMs).toString())
  params.set("sm", payload.springMode)

  if (payload.engine === "bezier") {
    params.set("x1", round(payload.bezier.p1.x, 3).toString())
    params.set("y1", round(payload.bezier.p1.y, 3).toString())
    params.set("x2", round(payload.bezier.p2.x, 3).toString())
    params.set("y2", round(payload.bezier.p2.y, 3).toString())
  } else {
    params.set("m", round(payload.spring.mass, 2).toString())
    params.set("k", round(payload.spring.stiffness, 2).toString())
    params.set("c", round(payload.spring.damping, 2).toString())
    if (payload.spring.velocity !== 0) {
      params.set("v", round(payload.spring.velocity, 2).toString())
    }
  }

  return `#${params.toString()}`
}

/**
 * Decodes a URL hash string, query string, or full URL into a validated UrlHashPayload.
 * Returns `null` if the string is corrupt or contains invalid math parameters (never throws).
 *
 * @param hashOrUrl - Hash string (e.g. `#t=...`), query string (`t=...`), or full URL.
 * @returns Validated UrlHashPayload or null.
 */
export function decodeEaseHash(hashOrUrl: string): UrlHashPayload | null {
  if (!hashOrUrl || typeof hashOrUrl !== "string") {
    return null
  }

  try {
    let queryStr = hashOrUrl.trim()
    const hashIndex = queryStr.indexOf("#")
    if (hashIndex !== -1) {
      queryStr = queryStr.slice(hashIndex + 1)
    }

    if (!queryStr) {
      return null
    }

    const params = new URLSearchParams(queryStr)
    const trackId = params.get("t")
    const channelId = params.get("ch")
    const engine = params.get("e")

    if (!trackId || !channelId || !engine) {
      return null
    }

    if (engine !== "bezier" && engine !== "spring") {
      return null
    }

    const durationRaw = params.get("d")
    const durationMs = durationRaw !== null ? Number(durationRaw) : NaN
    if (!Number.isFinite(durationMs) || durationMs < 1) {
      return null
    }

    const springModeRaw = params.get("sm")
    const springMode: SpringDurationMode =
      springModeRaw === "natural" ? "natural" : "fit"

    const curveId = params.get("id") ?? undefined
    const curveName = params.get("name") ?? undefined

    // Default fallbacks for whichever engine is not primary
    let bezier: BezierParams = {
      p1: { x: 0.16, y: 1.0 },
      p2: { x: 0.3, y: 1.0 },
    }
    let spring: SpringParams = {
      mass: 1,
      stiffness: 400,
      damping: 32,
      velocity: 0,
    }

    if (engine === "bezier") {
      const x1 = Number(params.get("x1"))
      const y1 = Number(params.get("y1"))
      const x2 = Number(params.get("x2"))
      const y2 = Number(params.get("y2"))

      if (
        !Number.isFinite(x1) ||
        !Number.isFinite(y1) ||
        !Number.isFinite(x2) ||
        !Number.isFinite(y2) ||
        x1 < 0 ||
        x1 > 1 ||
        x2 < 0 ||
        x2 > 1
      ) {
        return null
      }

      bezier = {
        p1: { x: x1, y: y1 },
        p2: { x: x2, y: y2 },
      }
    } else {
      // engine === "spring"
      const m = Number(params.get("m"))
      const k = Number(params.get("k"))
      const c = Number(params.get("c"))
      const v = params.get("v") !== null ? Number(params.get("v")) : 0

      if (
        !Number.isFinite(m) ||
        !Number.isFinite(k) ||
        !Number.isFinite(c) ||
        !Number.isFinite(v) ||
        m <= 0 ||
        k <= 0 ||
        c < 0
      ) {
        return null
      }

      spring = {
        mass: m,
        stiffness: k,
        damping: c,
        velocity: v,
      }
    }

    return {
      trackId,
      channelId,
      curveId,
      curveName,
      engine,
      bezier,
      spring,
      durationMs,
      springMode,
    }
  } catch {
    return null
  }
}
