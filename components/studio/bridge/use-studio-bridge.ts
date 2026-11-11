"use client"

import * as React from "react"
import {
  EaseBridgeEnvelope,
  HostInitPayload,
  ScrubUpdatePayload,
  SetScenarioPayload,
  SetSlotCurvePayload,
  BubbleKeyboardPayload,
  StageActionPayload,
  postToIframe,
  postToHost,
} from "./studio-bridge"
import {
  ArchetypeKey,
  EaseDossier,
  ScenarioSlotsRecord,
} from "@/components/studio/domain/studio-types"

export interface UseHostBridgeOptions {
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  getInitPayload: () => HostInitPayload
  onKeyboardEvent?: (event: BubbleKeyboardPayload) => void
  onStageAction?: (action: StageActionPayload) => void
}

export function useHostBridge({
  iframeRef,
  getInitPayload,
  onKeyboardEvent,
  onStageAction,
}: UseHostBridgeOptions) {
  const [isStageReady, setIsStageReady] = React.useState(false)

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as EaseBridgeEnvelope
      if (!data || data.source !== "EASE_STAGE") return

      switch (data.type) {
        case "STAGE_READY": {
          setIsStageReady(true)
          const payload = getInitPayload()
          postToIframe(iframeRef.current, "HOST_INIT", payload)
          break
        }
        case "BUBBLE_KEYBOARD": {
          onKeyboardEvent?.(data.payload as BubbleKeyboardPayload)
          break
        }
        case "STAGE_ACTION": {
          onStageAction?.(data.payload as StageActionPayload)
          break
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [iframeRef, getInitPayload, onKeyboardEvent, onStageAction])

  // Broadcast high-frequency scrub updates
  const sendScrubUpdate = React.useCallback(
    (payload: ScrubUpdatePayload) => {
      postToIframe(iframeRef.current, "SCRUB_UPDATE", payload)
    },
    [iframeRef]
  )

  // Broadcast scenario selection changes
  const sendSetScenario = React.useCallback(
    (payload: SetScenarioPayload) => {
      postToIframe(iframeRef.current, "SET_SCENARIO", payload)
    },
    [iframeRef]
  )

  // Broadcast slot curve changes
  const sendSetSlotCurve = React.useCallback(
    (payload: SetSlotCurvePayload) => {
      postToIframe(iframeRef.current, "SET_SLOT_CURVE", payload)
    },
    [iframeRef]
  )

  // Broadcast theme updates
  const sendSyncTheme = React.useCallback(
    (theme: "dark" | "light") => {
      postToIframe(iframeRef.current, "SYNC_THEME", { theme })
    },
    [iframeRef]
  )

  return {
    isStageReady,
    sendScrubUpdate,
    sendSetScenario,
    sendSetSlotCurve,
    sendSyncTheme,
  }
}

export interface StageBridgeState {
  isInitialized: boolean
  theme: "dark" | "light"
  scenarioKey: ArchetypeKey
  activeSlotId: string
  activeCurve: EaseDossier | null
  scenarioSlots: ScenarioSlotsRecord
  scrubProgress: number
  isPlaying: boolean
  isScrubbing: boolean
  isReducedMotion: boolean
  scenarioOpen: boolean
  scenarioPhase: "enter" | "exit"
  animKey: number
}

export function useStageBridge() {
  const [stageState, setStageState] = React.useState<StageBridgeState>({
    isInitialized: false,
    theme: "dark",
    scenarioKey: "modal",
    activeSlotId: "enter",
    activeCurve: null,
    scenarioSlots: { modal: {} },
    scrubProgress: 0,
    isPlaying: false,
    isScrubbing: false,
    isReducedMotion: false,
    scenarioOpen: false,
    scenarioPhase: "enter",
    animKey: 0,
  })

  // Signal ready to host and setup incoming message listener
  React.useEffect(() => {
    // 1. Immediately inform host that stage is mounted
    postToHost("STAGE_READY", { ready: true })

    // 2. Incoming messages from Host
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as EaseBridgeEnvelope
      if (!data || data.source !== "EASE_HOST") return

      switch (data.type) {
        case "HOST_INIT": {
          const p = data.payload as HostInitPayload
          setStageState({
            isInitialized: true,
            theme: p.theme,
            scenarioKey: p.scenarioKey,
            activeSlotId: p.activeSlotId,
            activeCurve: p.activeCurve,
            scenarioSlots: p.scenarioSlots,
            scrubProgress: p.scrubProgress,
            isPlaying: p.isPlaying,
            isScrubbing: p.isScrubbing,
            isReducedMotion: p.isReducedMotion,
            scenarioOpen: p.scenarioOpen,
            scenarioPhase: p.scenarioPhase,
            animKey: p.animKey,
          })
          // Sync HTML theme class
          if (p.theme === "dark") {
            document.documentElement.classList.add("dark")
          } else {
            document.documentElement.classList.remove("dark")
          }
          break
        }
        case "SCRUB_UPDATE": {
          const p = data.payload as ScrubUpdatePayload
          setStageState((prev) => ({
            ...prev,
            scrubProgress: p.progress,
            animKey: p.animKey,
            ...(p.phase ? { scenarioPhase: p.phase } : {}),
            ...(p.isPlaying !== undefined ? { isPlaying: p.isPlaying } : {}),
            ...(p.isScrubbing !== undefined
              ? { isScrubbing: p.isScrubbing }
              : {}),
            ...(p.scenarioOpen !== undefined
              ? { scenarioOpen: p.scenarioOpen }
              : {}),
          }))
          break
        }
        case "SET_SCENARIO": {
          const p = data.payload as SetScenarioPayload
          setStageState((prev) => ({
            ...prev,
            scenarioKey: p.scenarioKey,
            activeSlotId: p.activeSlotId,
            activeCurve: p.activeCurve,
          }))
          break
        }
        case "SET_SLOT_CURVE": {
          const p = data.payload as SetSlotCurvePayload
          setStageState((prev) => {
            const scenarioMap = prev.scenarioSlots[p.scenarioKey] || {}
            return {
              ...prev,
              scenarioSlots: {
                ...prev.scenarioSlots,
                [p.scenarioKey]: {
                  ...scenarioMap,
                  [p.slotId]: p.curve.id,
                },
              },
              activeCurve: p.curve,
            }
          })
          break
        }
        case "SYNC_THEME": {
          const p = data.payload as { theme: "dark" | "light" }
          setStageState((prev) => ({ ...prev, theme: p.theme }))
          if (p.theme === "dark") {
            document.documentElement.classList.add("dark")
          } else {
            document.documentElement.classList.remove("dark")
          }
          break
        }
      }
    }

    // 3. Global keyboard forwarding (solve focus trap)
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isInput =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable)

      if (isInput) return

      // Forward studio hotkeys back to parent
      if ([" ", "Escape", "r", "R", "t", "T", "1", "2", "3"].includes(e.key)) {
        if (e.key === " ") e.preventDefault()
        postToHost("BUBBLE_KEYBOARD", {
          key: e.key,
          code: e.code,
          shiftKey: e.shiftKey,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
        })
      }
    }

    window.addEventListener("message", handleMessage)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("message", handleMessage)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Action emitters to send back to host (with local fallback if running standalone)
  const emitAction = React.useCallback(
    (action: StageActionPayload["action"], data?: unknown) => {
      postToHost("STAGE_ACTION", { action, data })

      // Standalone mode fallback when /stage is opened outside of an iframe
      if (typeof window !== "undefined" && window.parent === window) {
        if (action === "open") {
          setStageState((prev) => ({
            ...prev,
            scenarioOpen: true,
            scenarioPhase: "enter",
            scrubProgress: 100,
          }))
        } else if (action === "close") {
          setStageState((prev) => ({
            ...prev,
            scenarioOpen: false,
            scenarioPhase: "exit",
            scrubProgress: 100,
          }))
        }
      }
    },
    []
  )

  return {
    stageState,
    emitAction,
  }
}
