"use client"

import {
  ArchetypeKey,
  EaseDossier,
  ScenarioSlotsRecord,
  ScenarioChannelRecord,
  KineticChannelDef,
} from "@/components/studio/domain/studio-types"

export const EASE_BRIDGE_VERSION = "1.0.0" as const

export type EaseBridgeMessageType =
  | "STAGE_READY"
  | "HOST_INIT"
  | "SYNC_THEME"
  | "SET_SCENARIO"
  | "SET_SLOT_CURVE"
  | "SET_CHANNEL_CURVE"
  | "SCRUB_UPDATE"
  | "TOGGLE_SCENARIO"
  | "BUBBLE_KEYBOARD"
  | "STAGE_ACTION"
  | "SNIFFER_DETECTED_CHANNELS"

export interface EaseBridgeEnvelope<T = unknown> {
  source: "EASE_HOST" | "EASE_STAGE"
  version: typeof EASE_BRIDGE_VERSION
  type: EaseBridgeMessageType
  payload: T
  timestamp: number
}

// Payload Definitions
export interface HostInitPayload {
  theme: "dark" | "light"
  scenarioKey: ArchetypeKey
  activeSlotId: string
  activeCurve: EaseDossier
  scenarioSlots: ScenarioSlotsRecord
  scenarioChannelSlots?: ScenarioChannelRecord
  activeChannelId?: string | "all"
  mutedChannels?: Record<string, boolean>
  scrubProgress: number
  isPlaying: boolean
  isScrubbing: boolean
  isReducedMotion: boolean
  scenarioOpen: boolean
  scenarioPhase: "enter" | "exit"
  animKey: number
}

export interface ScrubUpdatePayload {
  progress: number
  animKey: number
  phase?: "enter" | "exit"
  isPlaying?: boolean
  isScrubbing?: boolean
  scenarioOpen?: boolean
  channelCurves?: Record<string, EaseDossier>
  activeChannelId?: string | "all"
}

export interface SetScenarioPayload {
  scenarioKey: ArchetypeKey
  activeSlotId: string
  activeCurve: EaseDossier
}

export interface SetSlotCurvePayload {
  scenarioKey: string
  slotId: string
  curve: EaseDossier
}

export interface SetChannelCurvePayload {
  scenarioKey: string
  slotId: string
  channelId: string
  curve: EaseDossier
}

export interface SyncThemePayload {
  theme: "dark" | "light"
}

export interface BubbleKeyboardPayload {
  key: string
  code: string
  shiftKey: boolean
  metaKey: boolean
  ctrlKey: boolean
}

export interface StageActionPayload {
  action: "open" | "close" | "toggle" | "audition" | "paginate"
  data?: unknown
}

export interface SnifferDetectedChannelsPayload {
  scenarioKey: string
  slotId: string
  channels: KineticChannelDef[]
}

// Message Creators
export function createBridgeMessage<T>(
  source: "EASE_HOST" | "EASE_STAGE",
  type: EaseBridgeMessageType,
  payload: T
): EaseBridgeEnvelope<T> {
  return {
    source,
    version: EASE_BRIDGE_VERSION,
    type,
    payload,
    timestamp: Date.now(),
  }
}

// Dispatch Helpers
export function postToIframe<T>(
  iframe: HTMLIFrameElement | null,
  type: EaseBridgeMessageType,
  payload: T
): boolean {
  if (!iframe?.contentWindow) return false
  try {
    const msg = createBridgeMessage("EASE_HOST", type, payload)
    iframe.contentWindow.postMessage(msg, "*")
    return true
  } catch {
    return false
  }
}

export function postToHost<T>(
  type: EaseBridgeMessageType,
  payload: T
): boolean {
  if (typeof window === "undefined" || window.parent === window) return false
  try {
    const msg = createBridgeMessage("EASE_STAGE", type, payload)
    window.parent.postMessage(msg, "*")
    return true
  } catch {
    return false
  }
}
