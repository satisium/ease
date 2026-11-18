"use client"

import * as React from "react"
import { getTrackPlugin } from "@/core"
import { useEaseStore } from "@/hooks/use-ease-store"
import { DialogHabitat } from "./overlays/dialog-habitat"
import { CommandPaletteHabitat } from "./overlays/command-palette-habitat"
import { DrawerHabitat } from "./overlays/drawer-habitat"
import { BottomSheetHabitat } from "./overlays/bottom-sheet-habitat"
import { DropdownHabitat } from "./overlays/dropdown-habitat"
import { HoverCardHabitat } from "./overlays/hover-card-habitat"
import { ButtonHabitat } from "./button-habitat"
import { ToastHabitat } from "./toast-habitat"
import { TabsHabitat } from "./tabs-habitat"
import { CarouselHabitat } from "./carousel-habitat"
import {
  PrimitivesXRay,
  type PrimitiveFilter,
} from "@/components/studio/modes/customize/primitives-xray"

export interface HabitatStageProps {
  compareItemId?: string
}

const HABITAT_REGISTRY: Record<
  string,
  React.ComponentType<HabitatStageProps>
> = {
  dialog: DialogHabitat,
  spotlight: CommandPaletteHabitat,
  drawer: DrawerHabitat,
  sheet: BottomSheetHabitat,
  dropdown: DropdownHabitat,
  hovercard: HoverCardHabitat,
  button: ButtonHabitat,
  toast: ToastHabitat,
  tabs: TabsHabitat,
  carousel: CarouselHabitat,
}

export function HabitatStage({ compareItemId }: HabitatStageProps = {}) {
  const mode = useEaseStore((s) => s.mode)
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
  const focusedChannelId = useEaseStore((s) => s.focusedChannelId)
  const compareQueue = useEaseStore((s) => s.compareQueue)
  const globalCompareTarget = useEaseStore((s) => s.globalCompareTarget)

  const resolvedTrackId = React.useMemo(() => {
    if (compareItemId) {
      const item = compareQueue.find((i) => i.id === compareItemId)
      return item?.overrideTrackId ?? globalCompareTarget.trackId
    }
    return focusedTrackId
  }, [compareItemId, compareQueue, globalCompareTarget.trackId, focusedTrackId])

  const componentId = React.useMemo(() => {
    return getTrackPlugin(resolvedTrackId)?.componentId ?? "dialog"
  }, [resolvedTrackId])

  const normalizedChannelId = React.useMemo<PrimitiveFilter>(() => {
    if (
      focusedChannelId === "position" ||
      focusedChannelId === "scale" ||
      focusedChannelId === "opacity" ||
      focusedChannelId === "rotate"
    ) {
      return focusedChannelId
    }
    return "all"
  }, [focusedChannelId])

  const controlledFilter = React.useMemo<PrimitiveFilter>(() => {
    if (compareItemId) {
      const item = compareQueue.find((i) => i.id === compareItemId)
      const targetChannelId =
        item?.overrideChannelId ?? globalCompareTarget.channelId
      if (
        targetChannelId === "position" ||
        targetChannelId === "scale" ||
        targetChannelId === "opacity" ||
        targetChannelId === "rotate"
      ) {
        return targetChannelId
      }
      return "all"
    }
    return normalizedChannelId
  }, [
    compareItemId,
    compareQueue,
    globalCompareTarget.channelId,
    normalizedChannelId,
  ])

  if (componentId === "primitives") {
    if (compareItemId) {
      return (
        <PrimitivesXRay
          compareItemId={compareItemId}
          controlledFilter={controlledFilter}
        />
      )
    }
    return (
      <PrimitivesXRay
        isPreviewMode={mode === "preview"}
        controlledFilter={normalizedChannelId}
      />
    )
  }

  const Habitat = HABITAT_REGISTRY[componentId] ?? DialogHabitat
  return <Habitat compareItemId={compareItemId} />
}
