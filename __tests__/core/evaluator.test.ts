import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { ChannelBinding, TransitionTrackPlugin } from "../../core/schema"
import {
  evaluateChannelAtTime,
  evaluateTrackFrame,
  getChannelEffectiveDurationMs,
  getTrackTotalDurationMs,
  REDUCED_MOTION_DURATION_MS,
} from "../../core/math/evaluator"

describe("core/math/evaluator", () => {
  const easeOutQuart = {
    p1: { x: 0.25, y: 1 },
    p2: { x: 0.5, y: 1 },
  }

  const bouncySpring = {
    mass: 1,
    stiffness: 300,
    damping: 10, // Underdamped with substantial overshoot (> 25%)
    velocity: 0,
  }

  const smoothSpring = {
    mass: 1,
    stiffness: 860,
    damping: 46, // Near critical damping
    velocity: 0,
  }

  const backdropChannel: ChannelBinding = {
    id: "backdrop",
    label: "Backdrop Opacity",
    property: "opacity",
    from: 0,
    to: 0.5,
    unit: "",
    durationMs: 180,
    savedBezierDurationMs: 180,
    delayMs: 0,
    springMode: "fit",
    curve: {
      id: "bezier-quart",
      name: "Quart Out",
      engine: "bezier",
      bezier: easeOutQuart,
      spring: smoothSpring,
      suggestedDurationMs: 180,
    },
    semanticContext: {
      roleTitle: "Backdrop Scrim",
      guidance: "Subtle backdrop dimming",
      recommendedRangeMs: [150, 250],
      recommendedPresetIds: ["bezier-quart"],
    },
  }

  const translateYChannel: ChannelBinding = {
    id: "translateY",
    label: "Translate Y",
    property: "translateY",
    from: 28,
    to: 0,
    unit: "px",
    durationMs: 240,
    savedBezierDurationMs: 240,
    delayMs: 40,
    springMode: "fit",
    curve: {
      id: "bezier-quart",
      name: "Quart Out",
      engine: "bezier",
      bezier: easeOutQuart,
      spring: smoothSpring,
      suggestedDurationMs: 240,
    },
    semanticContext: {
      roleTitle: "Spatial Sheet Entrance",
      guidance: "Sheet entrance translation",
      recommendedRangeMs: [200, 320],
      recommendedPresetIds: ["bezier-quart"],
    },
  }

  const scaleChannel: ChannelBinding = {
    id: "scale",
    label: "Scale",
    property: "scale",
    from: 0.94,
    to: 1,
    unit: "",
    durationMs: 280,
    savedBezierDurationMs: 280,
    delayMs: 0,
    springMode: "fit",
    curve: {
      id: "bezier-quart",
      name: "Quart Out",
      engine: "bezier",
      bezier: easeOutQuart,
      spring: smoothSpring,
      suggestedDurationMs: 280,
    },
    semanticContext: {
      roleTitle: "Focal Surface Scale",
      guidance: "Dialog focus pop",
      recommendedRangeMs: [200, 320],
      recommendedPresetIds: ["bezier-quart"],
    },
  }

  const enterTrack: TransitionTrackPlugin = {
    id: "dialog:enter",
    componentId: "dialog",
    componentLabel: "Modal Dialog",
    phase: "enter",
    phaseLabel: "Entrance",
    triggerLabel: "Open Dialog",
    channels: [backdropChannel, translateYChannel, scaleChannel],
  }

  const exitTrack: TransitionTrackPlugin = {
    id: "dialog:exit",
    componentId: "dialog",
    componentLabel: "Modal Dialog",
    phase: "exit",
    phaseLabel: "Exit",
    triggerLabel: "Close Dialog",
    channels: [
      {
        ...backdropChannel,
        from: 0.5,
        to: 0,
      },
      {
        ...translateYChannel,
        from: 0,
        to: 28,
        delayMs: 0,
      },
      {
        ...scaleChannel,
        from: 1,
        to: 0.94,
      },
    ],
  }

  describe("Multi-channel delay & duration alignment", () => {
    it("computes track total duration taking stagger delay into account", () => {
      // translateY has delayMs 40 + duration 240 = 280ms
      // scale has duration 280ms
      // backdrop has duration 180ms
      const totalDur = getTrackTotalDurationMs(enterTrack)
      expect(totalDur).toBe(280)
    })

    it("evaluates frame progression and isComplete flag correctly", () => {
      // At t = 0ms: not complete
      const f0 = evaluateTrackFrame({ track: enterTrack, elapsedMs: 0 })
      expect(f0.isComplete).toBe(false)
      expect(f0.values.backdrop).toBe(0)
      expect(f0.values.translateY).toBe(28) // Staggered delay (delayMs: 40)
      expect(f0.values.scale).toBe(0.94)

      // At t = 20ms: translateY still at rest from (delayMs: 40)
      const f20 = evaluateTrackFrame({ track: enterTrack, elapsedMs: 20 })
      expect(f20.values.translateY).toBe(28)
      expect(f20.values.backdrop).toBeGreaterThan(0)

      // At t = 200ms: backdrop (dur: 180) is complete, translateY (40+240=280) is not
      const f200 = evaluateTrackFrame({ track: enterTrack, elapsedMs: 200 })
      expect(f200.values.backdrop).toBe(0.5)
      expect(f200.isComplete).toBe(false)

      // At t = 280ms: all channels settled
      const f280 = evaluateTrackFrame({ track: enterTrack, elapsedMs: 280 })
      expect(f280.values.backdrop).toBe(0.5)
      expect(f280.values.translateY).toBe(0)
      expect(f280.values.scale).toBe(1)
      expect(f280.isComplete).toBe(true)
    })
  })

  describe("Smart Opacity Protection", () => {
    const bouncyOpacityChannel: ChannelBinding = {
      ...backdropChannel,
      from: 0,
      to: 1,
      curve: {
        id: "bouncy-spring",
        name: "Bouncy Spring",
        engine: "spring",
        bezier: easeOutQuart,
        spring: bouncySpring,
        suggestedDurationMs: 400,
      },
    }

    it("clamps opacity strictly to [0, 1] when protectOpacityOvershoot is true", () => {
      // Sample over 100 steps
      for (let ms = 0; ms <= 500; ms += 5) {
        const result = evaluateChannelAtTime(bouncyOpacityChannel, ms, {
          protectOpacityOvershoot: true,
        })
        expect(result.value).toBeGreaterThanOrEqual(0)
        expect(result.value).toBeLessThanOrEqual(1.0)
      }
    })

    it("allows raw overshoot when protectOpacityOvershoot is false", () => {
      let maxObserved = 0
      for (let ms = 0; ms <= 500; ms += 5) {
        const result = evaluateChannelAtTime(bouncyOpacityChannel, ms, {
          protectOpacityOvershoot: false,
        })
        if (result.value > maxObserved) {
          maxObserved = result.value
        }
      }
      // Bouncy spring has > 25% overshoot, so maxObserved will exceed 1.15
      expect(maxObserved).toBeGreaterThan(1.15)
    })
  })

  describe("Solo (S) Mode: Entrance vs Exit Rest State Preservation", () => {
    it("locks sibling channels to resting destination (channel.to) during Entrance", () => {
      // Solo scale channel at t = 100ms during 'enter'
      const frame = evaluateTrackFrame({
        track: enterTrack,
        elapsedMs: 100,
        soloChannelId: "scale",
      })

      // Sibling channels should be held at their fully open resting state
      expect(frame.values.backdrop).toBe(backdropChannel.to) // 0.5
      expect(frame.values.translateY).toBe(translateYChannel.to) // 0

      // Soloed channel should actively animate
      expect(frame.values.scale).toBeGreaterThan(scaleChannel.from)
      expect(frame.values.scale).toBeLessThan(scaleChannel.to)
    })

    it("locks sibling channels to visible open start state (channel.from) during Exit", () => {
      // Solo scale channel at t = 100ms during 'exit'
      const frame = evaluateTrackFrame({
        track: exitTrack,
        elapsedMs: 100,
        soloChannelId: "scale",
      })

      // Backdrop and translateY must stay in their OPEN resting positions (channel.from)
      // so modal doesn't vanish while auditioning scale
      expect(frame.values.backdrop).toBe(0.5) // exitTrack backdrop.from
      expect(frame.values.translateY).toBe(0) // exitTrack translateY.from

      // Soloed scale should actively animate 1 -> 0.94
      expect(frame.values.scale).toBeLessThan(1)
      expect(frame.values.scale).toBeGreaterThan(0.94)
    })
  })

  describe("Reduced Motion (♿) Accessibility Invariants", () => {
    it("snaps spatial channels immediately and fades opacity over 140ms", () => {
      // Effective duration of spatial channel is 0ms
      expect(getChannelEffectiveDurationMs(translateYChannel, true)).toBe(0)
      expect(getChannelEffectiveDurationMs(scaleChannel, true)).toBe(0)

      // Effective duration of opacity is REDUCED_MOTION_DURATION_MS (140ms)
      expect(getChannelEffectiveDurationMs(backdropChannel, true)).toBe(
        REDUCED_MOTION_DURATION_MS
      )

      // Total track duration is 140ms
      expect(getTrackTotalDurationMs(enterTrack, true)).toBe(140)

      // Spatial properties snap immediately at t = 0
      const f0 = evaluateTrackFrame({
        track: enterTrack,
        elapsedMs: 0,
        isReducedMotion: true,
      })
      expect(f0.values.translateY).toBe(translateYChannel.to)
      expect(f0.values.scale).toBe(scaleChannel.to)
      expect(f0.values.backdrop).toBe(backdropChannel.from) // 0

      // At t = 70ms (halfway): opacity is at 50% progress
      const f70 = evaluateTrackFrame({
        track: enterTrack,
        elapsedMs: 70,
        isReducedMotion: true,
      })
      expect(f70.values.backdrop).toBeCloseTo(0.25, 2)
      expect(f70.isComplete).toBe(false)

      // At t = 140ms: complete
      const f140 = evaluateTrackFrame({
        track: enterTrack,
        elapsedMs: 140,
        isReducedMotion: true,
      })
      expect(f140.values.backdrop).toBe(0.5)
      expect(f140.isComplete).toBe(true)
    })
  })

  describe("Spring Mode: Fit vs Natural", () => {
    const springChannel: ChannelBinding = {
      ...translateYChannel,
      durationMs: 280,
      curve: {
        id: "snappy-spring",
        name: "Snappy",
        engine: "spring",
        bezier: easeOutQuart,
        spring: smoothSpring,
        suggestedDurationMs: 240,
      },
    }

    it("calculates effective duration in fit mode using fitted parameters", () => {
      const durFit = getChannelEffectiveDurationMs({
        ...springChannel,
        springMode: "fit",
      })
      expect(durFit).toBeGreaterThanOrEqual(280)
    })

    it("calculates effective duration in natural mode using ODE settle time", () => {
      const durNatural = getChannelEffectiveDurationMs({
        ...springChannel,
        springMode: "natural",
      })
      // smoothSpring settle time is around 220-260ms
      expect(durNatural).toBeGreaterThanOrEqual(220)
      expect(durNatural).toBeLessThanOrEqual(260)
    })
  })

  describe("Interruption & Velocity Continuity", () => {
    it("handles Spring interruption handoff with position x0 and velocity v0", () => {
      const springChannel: ChannelBinding = {
        ...translateYChannel,
        springMode: "natural",
        curve: {
          id: "snappy-spring",
          name: "Snappy",
          engine: "spring",
          bezier: easeOutQuart,
          spring: smoothSpring,
          suggestedDurationMs: 240,
        },
      }

      // Interruption snapshot at x0 = 0.5, v0 = 2.0
      const interruption = { x0: 0.5, v0: 2.0 }
      const res0 = evaluateChannelAtTime(springChannel, springChannel.delayMs, {
        interruption,
      })

      // Value must start at exactly x0 handoff
      expect(res0.progress).toBeCloseTo(0.5, 3)
      expect(res0.value).toBeCloseTo(
        springChannel.from + (springChannel.to - springChannel.from) * 0.5,
        3
      )
      // Analytical velocity at t = 0 must match v0
      expect(res0.velocityPerSec).toBeCloseTo(2.0, 1)
    })

    it("handles Bézier reversal interruption handoff starting smoothly from x0", () => {
      const interruption = { x0: 0.35, v0: 0 }
      const res0 = evaluateChannelAtTime(
        translateYChannel,
        translateYChannel.delayMs,
        {
          interruption,
        }
      )

      expect(res0.progress).toBeCloseTo(0.35, 3)
      expect(res0.value).toBeCloseTo(
        translateYChannel.from +
          (translateYChannel.to - translateYChannel.from) * 0.35,
        3
      )
    })
  })

  describe("Architectural Purity", () => {
    it("has zero React, DOM, or browser global references in evaluator.ts", () => {
      const filePath = resolve(process.cwd(), "core/math/evaluator.ts")
      const rawContent = readFileSync(filePath, "utf-8")

      // Strip comments before checking for tokens
      const codeOnly = rawContent
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*/g, "")

      expect(codeOnly).not.toMatch(/\bwindow\b/)
      expect(codeOnly).not.toMatch(/\bdocument\b/)
      expect(codeOnly).not.toMatch(/\bHTMLElement\b/)
      expect(codeOnly).not.toMatch(/from\s+["']react["']/)
      expect(codeOnly).not.toMatch(/from\s+["']react-dom["']/)
    })
  })
})
