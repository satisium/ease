import { BezierConfig, SpringConfig } from "@/core/types"

export type EngineType = "bezier" | "spring"
export type StudioMode = "audition" | "customize" | "compare"
export type ViewportMode = "desktop" | "tablet" | "mobile" | "custom"

export type ScenarioSlotMap = {
  enter?: string
  exit?: string
  enterId?: string
  exitId?: string
  [slotId: string]: string | undefined
}

export type ScenarioSlotAssignment = ScenarioSlotMap
export type ScenarioSlotsRecord = Record<string, ScenarioSlotMap>

export function getDefaultSlotForScenario(scenarioKey: string): string {
  switch (scenarioKey) {
    case "dialog":
    case "modal":
    default:
      return "enter"
  }
}

export interface CustomEase {
  id: string
  name: string
  label?: string
  parentPreset: string
  engine: EngineType
  values: string
  bezier?: BezierConfig
  spring?: SpringConfig
  duration: number
  guidance?: string
  targetSettle?: string
  desc?: string
  useCases?: string[]
  variants?: CustomEase[]
}

export interface KineticAnatomy {
  role: string
  launchVelocity: string
  settleCharacter: string
  feel: string
  choreographyLaw: string
  timingSweetSpot: string
  optimalDuration: number
}

export interface EaseDossier {
  id: string
  name: string
  origin: string
  isCustom: boolean
  engine: EngineType
  values: string
  bezier?: BezierConfig
  spring?: SpringConfig
  duration: number
  description: string
  useCases: string[]
  kinetics: KineticAnatomy
  variants?: CustomEase[]
  parentPreset?: string
}

export interface PresetFamily {
  id: string
  label: string
  presetIds: string[]
}

export type ArchetypeKey = "dialog" | "modal"

export interface ArchetypeScenario {
  id: ArchetypeKey
  name: string
  role: string
  description: string
}

export type StackLevel =
  | { level: 0 }
  | { level: 1; curveId: string }
  | { level: 2; curveId: string; variantId: string }

export interface ActivePresetMeta {
  name: string
  subtitle?: string
  engine: EngineType
  values: string
  bezier?: BezierConfig
  spring?: SpringConfig
  duration: number
}

export interface StudioSessionCookie {
  curve?: string
  engine?: EngineType
  timeline?: boolean
  viewport?: ViewportMode
  width?: number | string
  scenario?: ArchetypeKey
  navLevel?: number
  mode?: StudioMode
}

export type InterpolationKind = "scalar" | "dimension" | "angular"

export interface KineticChannelDef {
  id: string
  label: string
  targetSelector?: string
  property: string
  kind: InterpolationKind
  unit: "px" | "" | "deg" | "%"
  from: number
  to: number
  defaultCurveId: string
  durationMs?: number
  delayMs?: number
  isMuted?: boolean
  role?: string
}

export type ScenarioChannelRecord = Record<
  string,
  Record<string, Record<string, string>>
>
