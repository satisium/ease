"use client"

import * as React from "react"
import { getTrackPlugin } from "@/core"
import { useEaseStore } from "@/hooks/use-ease-store"
import { DialogHabitat } from "./dialog-habitat"
import { DrawerHabitat } from "./drawer-habitat"
import { DropdownHabitat } from "./dropdown-habitat"
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

export function HabitatStage({ compareItemId }: HabitatStageProps = {}) {
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
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
    }
    return "all"
  }, [compareItemId, compareQueue, globalCompareTarget.channelId])

  switch (componentId) {
    case "dialog":
      return <DialogHabitat compareItemId={compareItemId} />
    case "drawer":
      return <DrawerHabitat compareItemId={compareItemId} />
    case "dropdown":
      return <DropdownHabitat compareItemId={compareItemId} />
    case "button":
      return <ButtonHabitat compareItemId={compareItemId} />
    case "toast":
      return <ToastHabitat compareItemId={compareItemId} />
    case "tabs":
      return <TabsHabitat compareItemId={compareItemId} />
    case "carousel":
      return <CarouselHabitat compareItemId={compareItemId} />
    case "primitives":
      if (compareItemId) {
        return (
          <PrimitivesXRay
            compareItemId={compareItemId}
            controlledFilter={controlledFilter}
          />
        )
      }
      return <DialogHabitat compareItemId={compareItemId} />
    default:
      return <DialogHabitat compareItemId={compareItemId} />
  }
}
