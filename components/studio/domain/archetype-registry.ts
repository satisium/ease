"use client"

import * as React from "react"
import {
  ArchetypeKey,
  ArchetypeScenario,
  KineticChannelDef,
} from "./studio-types"
import { ModalScenario } from "@/components/studio/modes/audition/center-stage/scenarios"

export interface MotionSlotDefinition {
  id: string
  label: string
  description: string
  defaultCurveId: string
  iconType?: "in" | "out" | "slide" | "press" | "generic"
  channels?: KineticChannelDef[]
}

export interface MotionComponentManifest {
  id: ArchetypeKey
  name: string
  role: string
  description: string
  category: "surface" | "interactive" | "feedback" | "navigation"
  slots: MotionSlotDefinition[]
  component: React.ComponentType
}

export const ARCHETYPE_MANIFESTS: MotionComponentManifest[] = [
  {
    id: "dialog",
    name: "Dialog",
    role: "Focused Surface",
    description:
      "Centered dialog surface with progressive scale deceleration on arrival and swift acceleration on dismissal.",
    category: "surface",
    slots: [
      {
        id: "enter",
        label: "Entrance",
        description: "Scale & opacity deceleration into resting focus",
        defaultCurveId: "modal-sheet",
        iconType: "in",
        channels: [
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
            delayMs: 25,
          },
          {
            id: "scale",
            label: "Scale",
            property: "scale",
            kind: "scalar",
            unit: "",
            from: 0.88,
            to: 1.0,
            defaultCurveId: "gentle",
            delayMs: 25,
          },
        ],
      },
      {
        id: "exit",
        label: "Exit",
        description: "Swift acceleration on dismiss and unmount",
        defaultCurveId: "expo-in",
        iconType: "out",
        channels: [
          {
            id: "backdrop",
            label: "Backdrop",
            property: "opacity",
            kind: "scalar",
            unit: "",
            from: 0.45,
            to: 0,
            defaultCurveId: "expo-in",
            delayMs: 40,
          },
          {
            id: "translateY",
            label: "Translate Y",
            property: "translateY",
            kind: "dimension",
            unit: "px",
            from: 0,
            to: 36,
            defaultCurveId: "expo-in",
            delayMs: 0,
          },
          {
            id: "scale",
            label: "Scale",
            property: "scale",
            kind: "scalar",
            unit: "",
            from: 1.0,
            to: 0.88,
            defaultCurveId: "expo-in",
            delayMs: 0,
          },
        ],
      },
    ],
    component: ModalScenario,
  },
]

export function getArchetypeManifest(
  key: string
): MotionComponentManifest | undefined {
  return ARCHETYPE_MANIFESTS.find((m) => m.id === key) ?? ARCHETYPE_MANIFESTS[0]
}

export function getAllArchetypeManifests(): MotionComponentManifest[] {
  return ARCHETYPE_MANIFESTS
}

export const ARCHETYPE_SCENARIOS: ArchetypeScenario[] = ARCHETYPE_MANIFESTS.map(
  (m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    description: m.description,
  })
)
