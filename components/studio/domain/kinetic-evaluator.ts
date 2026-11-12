import { EaseDossier, KineticChannelDef } from "./studio-types"
import { getEasedValue } from "./studio-kinetics"

export interface EvaluatedChannel {
  id: string
  property: string
  kind: KineticChannelDef["kind"]
  unit: string
  easedValue: number
  currentValue: number
  formattedValue: string
  localProgressPct: number
}

export interface EvaluatedChoreography {
  channels: Record<string, EvaluatedChannel>
  masterProgressPct: number
}

/**
 * Evaluates all kinetic channels in a choreographed composition at a given master progress (0..100).
 * Handles independent channel curves, stagger delays, duration scalings, and physical overshoot.
 */
export function evaluateChoreography(
  channels: KineticChannelDef[],
  channelCurves: Record<string, EaseDossier>,
  masterProgressPct: number,
  masterDurationMs: number = 400,
  isReducedMotion: boolean = false
): EvaluatedChoreography {
  const clampedMasterProgress = Math.max(0, Math.min(100, masterProgressPct))
  const currentTimeMs = (clampedMasterProgress / 100) * masterDurationMs

  const result: Record<string, EvaluatedChannel> = {}

  for (const channel of channels) {
    if (channel.isMuted) {
      result[channel.id] = {
        id: channel.id,
        property: channel.property,
        kind: channel.kind,
        unit: channel.unit,
        easedValue: 0,
        currentValue: channel.from,
        formattedValue: formatValue(channel.from, channel.unit),
        localProgressPct: 0,
      }
      continue
    }

    const channelDelay = channel.delayMs ?? 0
    const channelDuration = Math.max(1, channel.durationMs ?? masterDurationMs)

    let localProgressPct = 0
    if (currentTimeMs <= channelDelay) {
      localProgressPct = 0
    } else if (currentTimeMs >= channelDelay + channelDuration) {
      localProgressPct = 100
    } else {
      localProgressPct =
        ((currentTimeMs - channelDelay) / channelDuration) * 100
    }

    const curve = channelCurves[channel.id]
    const easedValue = curve
      ? getEasedValue(localProgressPct, curve, isReducedMotion)
      : localProgressPct / 100

    const currentValue = channel.from + (channel.to - channel.from) * easedValue

    result[channel.id] = {
      id: channel.id,
      property: channel.property,
      kind: channel.kind,
      unit: channel.unit,
      easedValue,
      currentValue,
      formattedValue: formatValue(currentValue, channel.unit),
      localProgressPct,
    }
  }

  return {
    channels: result,
    masterProgressPct: clampedMasterProgress,
  }
}

function formatValue(val: number, unit: string): string {
  if (unit === "px") {
    return `${Math.round(val * 10) / 10}px`
  }
  if (unit === "deg") {
    return `${Math.round(val * 10) / 10}deg`
  }
  if (unit === "%") {
    return `${Math.round(val * 10) / 10}%`
  }
  return `${Math.round(val * 1000) / 1000}`
}
