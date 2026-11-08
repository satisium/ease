"use client"

import * as React from "react"
import { ArchetypeKey, ArchetypeScenario } from "./studio-types"
import {
  ModalScenario,
  CarouselScenario,
  ButtonScenario,
} from "@/components/studio/modes/audition/center-stage/scenarios"

export interface MotionSlotDefinition {
  id: string
  label: string
  description: string
  defaultCurveId: string
  iconType?: "in" | "out" | "slide" | "press" | "generic"
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
    id: "modal",
    name: "Modal Dialog",
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
      },
      {
        id: "exit",
        label: "Exit",
        description: "Swift acceleration on dismiss and unmount",
        defaultCurveId: "expo-in",
        iconType: "out",
      },
    ],
    component: ModalScenario,
  },
  {
    id: "carousel",
    name: "Media Carousel",
    role: "Paged Travel",
    description:
      "Horizontal surface translation with symmetric travel tempo, boundary resistance, and natural momentum.",
    category: "navigation",
    slots: [
      {
        id: "slide",
        label: "Slide",
        description: "Horizontal card translation with spring physics",
        defaultCurveId: "ios-fluid",
        iconType: "slide",
      },
    ],
    component: CarouselScenario,
  },
  {
    id: "button",
    name: "Tactile Button",
    role: "Direct Contact",
    description:
      "Direct manipulation trigger featuring spring-loaded surface compression and high-fidelity haptic rebound.",
    category: "interactive",
    slots: [
      {
        id: "press",
        label: "Press",
        description: "Tactile scale compression and rebound bounce",
        defaultCurveId: "button",
        iconType: "press",
      },
    ],
    component: ButtonScenario,
  },
]

export function getArchetypeManifest(
  key: string
): MotionComponentManifest | undefined {
  return ARCHETYPE_MANIFESTS.find((m) => m.id === key)
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
