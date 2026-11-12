import { describe, it, expect } from "vitest"
import { evaluateChoreography } from "@/components/studio/domain/kinetic-evaluator"
import { KineticChannelDef } from "@/components/studio/domain/studio-types"
import { resolveEase } from "@/components/studio/domain/studio-kinetics"
import { INITIAL_CUSTOM_CURVES } from "@/components/studio/domain/studio-curves"

describe("Kinetic Evaluator", () => {
  const modalSheet = resolveEase("modal-sheet", INITIAL_CUSTOM_CURVES)
  const materialDecelerate = resolveEase(
    "material-decelerate",
    INITIAL_CUSTOM_CURVES
  )

  const testChannels: KineticChannelDef[] = [
    {
      id: "backdrop",
      label: "Backdrop",
      property: "opacity",
      kind: "scalar",
      unit: "",
      from: 0,
      to: 0.45,
      defaultCurveId: "material-decelerate",
      delayMs: 0,
      durationMs: 200,
    },
    {
      id: "translateY",
      label: "Translate Y",
      property: "translateY",
      kind: "dimension",
      unit: "px",
      from: 44,
      to: 0,
      defaultCurveId: "modal-sheet",
      delayMs: 50,
      durationMs: 300,
    },
  ]

  const curves = {
    backdrop: materialDecelerate,
    translateY: modalSheet,
  }

  it("evaluates channels at master progress 0%", () => {
    const evaluated = evaluateChoreography(testChannels, curves, 0, 400)
    expect(evaluated.channels.backdrop.currentValue).toBe(0)
    expect(evaluated.channels.translateY.currentValue).toBe(44)
    expect(evaluated.channels.translateY.formattedValue).toBe("44px")
  })

  it("respects stagger delay: delayed channel stays at initial value before its delay", () => {
    // Master duration is 400ms. Progress 5% = 20ms.
    // translateY has delayMs: 50ms, so at 20ms it should not have started (localProgressPct = 0).
    const evaluated = evaluateChoreography(testChannels, curves, 5, 400)
    expect(evaluated.channels.translateY.localProgressPct).toBe(0)
    expect(evaluated.channels.translateY.currentValue).toBe(44)

    // Backdrop has delayMs: 0, so at 20ms / 200ms = 10% progress
    expect(evaluated.channels.backdrop.localProgressPct).toBe(10)
    expect(evaluated.channels.backdrop.currentValue).toBeGreaterThan(0)
  })

  it("evaluates channels at master progress 100%", () => {
    const evaluated = evaluateChoreography(testChannels, curves, 100, 400)
    expect(evaluated.channels.backdrop.currentValue).toBeCloseTo(0.45, 2)
    expect(evaluated.channels.translateY.currentValue).toBeCloseTo(0, 1)
  })

  it("honors muted channels by freezing them at initial 'from' value", () => {
    const mutedChannels: KineticChannelDef[] = [
      {
        ...testChannels[1],
        isMuted: true,
      },
    ]
    const evaluated = evaluateChoreography(
      mutedChannels,
      { translateY: modalSheet },
      50,
      400
    )
    expect(evaluated.channels.translateY.currentValue).toBe(44)
    expect(evaluated.channels.translateY.easedValue).toBe(0)
  })
})
