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

export function HabitatStage() {
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)

  const componentId = React.useMemo(() => {
    return getTrackPlugin(focusedTrackId)?.componentId ?? "dialog"
  }, [focusedTrackId])

  switch (componentId) {
    case "dialog":
      return <DialogHabitat />
    case "drawer":
      return <DrawerHabitat />
    case "dropdown":
      return <DropdownHabitat />
    case "button":
      return <ButtonHabitat />
    case "toast":
      return <ToastHabitat />
    case "tabs":
      return <TabsHabitat />
    case "carousel":
      return <CarouselHabitat />
    default:
      return <DialogHabitat />
  }
}
