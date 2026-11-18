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
import { MorphButtonHabitat } from "./controls/morph-button-habitat"
import { DynamicPillHabitat } from "./controls/dynamic-pill-habitat"
import { ToastStackHabitat } from "./disclosure/toast-stack-habitat"
import { SegmentedTabsHabitat } from "./controls/segmented-tabs-habitat"
import { ShimmerCtaHabitat } from "./controls/shimmer-cta-habitat"
import { CollapsibleSidebarHabitat } from "./controls/collapsible-sidebar-habitat"
import { TactileTogglesHabitat } from "./controls/tactile-toggles-habitat"
import { FloatingInputHabitat } from "./controls/floating-input-habitat"
import { OtpShakeHabitat } from "./controls/otp-shake-habitat"
import { WalletDeckHabitat } from "./disclosure/wallet-deck-habitat"
import { AccordionHabitat } from "./disclosure/accordion-habitat"
import { ProgressWizardHabitat } from "./disclosure/progress-wizard-habitat"
import { UploadProgressHabitat } from "./disclosure/upload-progress-habitat"
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
  button: MorphButtonHabitat,
  pill: DynamicPillHabitat,
  toast: ToastStackHabitat,
  tabs: SegmentedTabsHabitat,
  cta: ShimmerCtaHabitat,
  sidebar: CollapsibleSidebarHabitat,
  toggles: TactileTogglesHabitat,
  input: FloatingInputHabitat,
  otp: OtpShakeHabitat,
  carousel: WalletDeckHabitat,
  accordion: AccordionHabitat,
  wizard: ProgressWizardHabitat,
  progress: UploadProgressHabitat,
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
