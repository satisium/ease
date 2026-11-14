import { describe, it, expect } from "vitest"
import {
  compileSpringToLinearCss,
  compileSpringToSvgPath,
  simplifySpringSamples,
} from "../../core/math/spring-compilers"
import { parseCurveString } from "../../core/math/parser"
import type { SpringParams } from "../../core/schema"
import * as fs from "fs"
import * as path from "path"

describe("Spring Compilers & String Parser (core/math/)", () => {
  const underdampedSpring: SpringParams = {
    mass: 1,
    stiffness: 860,
    damping: 46,
    velocity: 0,
  }

  const criticallyDampedSpring: SpringParams = {
    mass: 1,
    stiffness: 400,
    damping: 40,
    velocity: 0,
  }

  describe("CSS linear(...) Compiler (compileSpringToLinearCss)", () => {
    it("compiles underdamped spring with preserved overshoot peak", () => {
      const result = compileSpringToLinearCss(underdampedSpring)

      expect(result.linearCss.startsWith("linear(0,")).toBe(true)
      expect(result.linearCss.endsWith(", 1)")).toBe(true)

      // Must be compact (<= 25 points)
      expect(result.points.length).toBeLessThanOrEqual(25)
      expect(result.points.length).toBeGreaterThan(3)

      // Must have at least one point with value > 1.0 (overshoot)
      const hasOvershoot = result.points.some((p) => p.value > 1.0)
      expect(hasOvershoot).toBe(true)

      // Verified exact duration
      expect(result.durationMs).toBeGreaterThan(200)
    })

    it("compiles critically damped spring without overshoot (stays <= 1.0)", () => {
      const result = compileSpringToLinearCss(criticallyDampedSpring)

      expect(result.linearCss.startsWith("linear(0,")).toBe(true)
      expect(result.linearCss.endsWith(", 1)")).toBe(true)
      expect(result.points.length).toBeLessThanOrEqual(25)

      // No overshoot
      const hasOvershoot = result.points.some((p) => p.value > 1.0001)
      expect(hasOvershoot).toBe(false)
    })

    it("simplification retains exact start and end points", () => {
      const dummySamples = [
        { t: 0, elapsedMs: 0, value: 0, velocity: 0 },
        { t: 0.5, elapsedMs: 150, value: 1.02, velocity: 0 },
        { t: 1, elapsedMs: 300, value: 1, velocity: 0 },
      ]
      const simplified = simplifySpringSamples(dummySamples, 0.002)
      expect(simplified[0].t).toBe(0)
      expect(simplified[simplified.length - 1].t).toBe(1)
    })
  })

  describe("GSAP SVG Path Compiler (compileSpringToSvgPath)", () => {
    it("generates a valid, finite C1-continuous cubic Bézier path", () => {
      const pathString = compileSpringToSvgPath(underdampedSpring)

      expect(pathString.startsWith("M0,0 C")).toBe(true)
      expect(pathString.endsWith("1,1")).toBe(true)

      // Must contain zero NaN or Infinity
      expect(pathString.includes("NaN")).toBe(false)
      expect(pathString.includes("Infinity")).toBe(false)

      // Must have cubic control points
      const cubicSegments = pathString.split(" C").length - 1
      expect(cubicSegments).toBeGreaterThan(2)
    })
  })

  describe("Curve String Parser (parseCurveString)", () => {
    it("parses CSS named keywords cleanly", () => {
      const linear = parseCurveString("linear")
      expect(linear?.engine).toBe("bezier")
      expect(linear?.bezier?.p1).toEqual({ x: 0, y: 0 })
      expect(linear?.bezier?.p2).toEqual({ x: 1, y: 1 })

      const easeOut = parseCurveString("ease-out")
      expect(easeOut?.engine).toBe("bezier")
      expect(easeOut?.bezier?.p1).toEqual({ x: 0, y: 0 })
      expect(easeOut?.bezier?.p2).toEqual({ x: 0.58, y: 1 })
    })

    it("parses standard CSS cubic-bezier(...) format", () => {
      const parsed = parseCurveString("cubic-bezier(0.16, 1, 0.3, 1)")
      expect(parsed?.engine).toBe("bezier")
      expect(parsed?.bezier?.p1).toEqual({ x: 0.16, y: 1 })
      expect(parsed?.bezier?.p2).toEqual({ x: 0.3, y: 1 })
    })

    it("parses Tailwind class with duration extraction", () => {
      const parsed = parseCurveString(
        "duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
      )
      expect(parsed?.engine).toBe("bezier")
      expect(parsed?.suggestedDurationMs).toBe(280)
      expect(parsed?.bezier?.p1.x).toBeCloseTo(0.16, 2)
      expect(parsed?.bezier?.p2.x).toBeCloseTo(0.3, 2)
    })

    it("parses CSS transition strings with second-to-ms duration conversion", () => {
      const parsed = parseCurveString(
        "transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)"
      )
      expect(parsed?.engine).toBe("bezier")
      expect(parsed?.suggestedDurationMs).toBe(300)
      expect(parsed?.bezier?.p1).toEqual({ x: 0.25, y: 0.1 })
    })

    it("parses raw 4-number arrays and comma-separated lists", () => {
      const fromArray = parseCurveString("[0.25, 1, 0.5, 1]")
      expect(fromArray?.engine).toBe("bezier")
      expect(fromArray?.bezier?.p1).toEqual({ x: 0.25, y: 1 })
      expect(fromArray?.bezier?.p2).toEqual({ x: 0.5, y: 1 })

      const fromList = parseCurveString("0.25, 1, 0.5, 1")
      expect(fromList?.engine).toBe("bezier")
      expect(fromList?.bezier?.p1).toEqual({ x: 0.25, y: 1 })
    })

    it("parses JS spring objects without quotes and functional spring calls", () => {
      const fromObj = parseCurveString("{ stiffness: 860, damping: 46 }")
      expect(fromObj?.engine).toBe("spring")
      expect(fromObj?.spring?.stiffness).toBe(860)
      expect(fromObj?.spring?.damping).toBe(46)
      expect(fromObj?.spring?.mass).toBe(1) // default
      expect(fromObj?.spring?.velocity).toBe(0) // default

      const fromFunc = parseCurveString("spring(1, 860, 46)")
      expect(fromFunc?.engine).toBe("spring")
      expect(fromFunc?.spring?.stiffness).toBe(860)
      expect(fromFunc?.spring?.damping).toBe(46)
    })

    it("safely rejects invalid inputs with null", () => {
      expect(parseCurveString("")).toBeNull()
      expect(parseCurveString("invalid gibberish")).toBeNull()
      expect(parseCurveString("{}")).toBeNull()
      // Negative stiffness is physically invalid
      expect(parseCurveString("{ stiffness: -100, damping: 20 }")).toBeNull()
      // Negative damping is physically invalid
      expect(parseCurveString("{ stiffness: 100, damping: -20 }")).toBeNull()
    })
  })

  describe("Purity & Headless Isolation", () => {
    it("contains zero React or DOM references in source code", () => {
      const compilersPath = path.resolve(
        __dirname,
        "../../core/math/spring-compilers.ts"
      )
      const parserPath = path.resolve(__dirname, "../../core/math/parser.ts")

      for (const filePath of [compilersPath, parserPath]) {
        const source = fs.readFileSync(filePath, "utf-8")
        expect(source).not.toMatch(/from\s+['"]react['"]/)
        expect(source).not.toMatch(/from\s+['"]react-dom['"]/)

        const codeWithoutComments = source
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/.*/g, "")
        expect(codeWithoutComments).not.toMatch(/\bwindow\b/)
        expect(codeWithoutComments).not.toMatch(/\bdocument\b/)
      }
    })
  })
})
