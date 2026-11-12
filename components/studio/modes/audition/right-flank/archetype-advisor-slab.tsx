"use client"

import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useStudioStore } from "@/store/useStudioStore"
import {
  BEST_PRACTICES,
  BestPracticeSpec,
  KINETIC_ROLE_LAWS,
} from "./archetype-laws"

export function ArchetypeAdvisorSlab({ className }: { className?: string }) {
  const activePresetId = useStudioStore((s) => s.activeCurveId)
  const activeScenarioKey = useStudioStore((s) => s.activeScenarioKey)
  const scenarioSlots = useStudioStore((s) => s.scenarioSlots)
  const scenarioChannelSlots = useStudioStore((s) => s.scenarioChannelSlots)
  const activeSlot = useStudioStore((s) => s.activeSlot)
  const activeSlotId = useStudioStore((s) => s.activeSlotId)
  const activeChannelId = useStudioStore((s) => s.activeChannelId)
  const discoveredChannels = useStudioStore((s) => s.discoveredChannels)
  const selectEase = useStudioStore((s) => s.selectEase)
  const assignCurveToSlot = useStudioStore((s) => s.assignCurveToSlot)
  const assignCurveToChannel = useStudioStore((s) => s.assignCurveToChannel)

  // 1. Check if a specific Kinetic Channel is selected in Center Stage
  const channels = discoveredChannels?.[activeScenarioKey]?.[activeSlotId] || []
  const activeChannel =
    activeChannelId !== "all"
      ? channels.find((c) => c.id === activeChannelId)
      : null

  const roleSpec = activeChannel?.role
    ? KINETIC_ROLE_LAWS[activeChannel.role]
    : null

  // 2. Resolve guidance spec (Adaptive Kinetic Role vs Scenario Macro Law)
  const currentSlot = scenarioSlots[activeScenarioKey]
  const macroSpec: BestPracticeSpec =
    BEST_PRACTICES[activeScenarioKey] ?? BEST_PRACTICES.dialog

  const guidelineText = roleSpec ? roleSpec.guideline : macroSpec.guideline
  const sectionTitle = roleSpec
    ? `Motion Guide · ${activeChannel?.label || roleSpec.label}`
    : "Motion Guide"

  const recommendedIn = roleSpec?.recommendedIn ?? macroSpec.recommendedIn
  const recommendedOut = roleSpec?.recommendedOut ?? macroSpec.recommendedOut
  const targetDurationIn =
    roleSpec?.targetDurationIn ?? macroSpec.targetDurationIn ?? "220–320ms"
  const targetDurationOut =
    roleSpec?.targetDurationOut ?? macroSpec.targetDurationOut ?? "160–220ms"

  // 3. Curve assignment dispatcher
  const handleAssignIn = (curveId: string) => {
    if (activeChannelId !== "all") {
      assignCurveToChannel(curveId, activeChannelId, "enter", activeScenarioKey)
    } else {
      assignCurveToSlot(curveId, "enter", activeScenarioKey)
    }
  }

  const handleAssignOut = (curveId: string) => {
    if (activeChannelId !== "all") {
      assignCurveToChannel(curveId, activeChannelId, "exit", activeScenarioKey)
    } else {
      assignCurveToSlot(curveId, "exit", activeScenarioKey)
    }
  }

  return (
    <TooltipProvider delayDuration={150}>
      <section
        aria-label="Motion Guide"
        className={cn(
          "no-scrollbar flex min-h-0 flex-1 flex-col gap-3 rounded-[20px] bg-background p-4 transition-colors select-none",
          className
        )}
      >
        {/* Header: Clean, confident title with contextual channel pill if active */}
        <div className="flex shrink-0 items-center justify-between">
          <span className="font-heading text-xs font-semibold text-foreground">
            {sectionTitle}
          </span>
          {roleSpec && (
            <span className="rounded-[6px] bg-secondary px-2 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
              {roleSpec.role}
            </span>
          )}
        </div>

        {/* Motion Guideline: Adaptive Kinetic Role Advice */}
        <p className="font-sans text-xs leading-relaxed text-muted-foreground">
          {guidelineText}
        </p>

        {/* Curated Recommendations Anchored to Bottom of Block (mt-auto) */}
        {recommendedIn && recommendedOut ? (
          <div className="mt-auto flex flex-col gap-3 pt-2">
            {/* Entrance Section with Contextual Target Timing */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-heading text-xs font-medium text-foreground">
                  Recommended Entrance
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {targetDurationIn}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {recommendedIn.map((rec) => {
                  let isAssigned = false
                  if (activeChannelId !== "all") {
                    const assignedChannelCurve =
                      scenarioChannelSlots?.[activeScenarioKey]?.["enter"]?.[
                        activeChannelId
                      ]
                    isAssigned =
                      assignedChannelCurve === rec.id ||
                      (!assignedChannelCurve &&
                        activePresetId === rec.id &&
                        activeSlot === "enter")
                  } else {
                    const enterAssigned =
                      currentSlot?.enter ?? currentSlot?.enterId
                    isAssigned =
                      enterAssigned === rec.id ||
                      (!enterAssigned &&
                        activePresetId === rec.id &&
                        activeSlot === "enter")
                  }

                  return (
                    <Tooltip key={rec.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleAssignIn(rec.id)}
                          className={cn(
                            "flex h-8 cursor-pointer items-center justify-center rounded-[8px] px-1 font-sans text-xs transition-colors active:scale-95",
                            isAssigned
                              ? "border border-border bg-background font-medium text-foreground shadow-xs"
                              : "bg-muted font-normal text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          <span className="truncate">{rec.label}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <span>
                          {rec.label} · {rec.why}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>

            {/* Exit Section with Contextual Target Timing */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-heading text-xs font-medium text-foreground">
                  Recommended Exit
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {targetDurationOut}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {recommendedOut.map((rec) => {
                  let isAssigned = false
                  if (activeChannelId !== "all") {
                    const assignedChannelCurve =
                      scenarioChannelSlots?.[activeScenarioKey]?.["exit"]?.[
                        activeChannelId
                      ]
                    isAssigned =
                      assignedChannelCurve === rec.id ||
                      (!assignedChannelCurve &&
                        activePresetId === rec.id &&
                        activeSlot === "exit")
                  } else {
                    const exitAssigned =
                      currentSlot?.exit ?? currentSlot?.exitId
                    isAssigned =
                      exitAssigned === rec.id ||
                      (!exitAssigned &&
                        activePresetId === rec.id &&
                        activeSlot === "exit")
                  }

                  return (
                    <Tooltip key={rec.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleAssignOut(rec.id)}
                          className={cn(
                            "flex h-8 cursor-pointer items-center justify-center rounded-[8px] px-1 font-sans text-xs transition-colors active:scale-95",
                            isAssigned
                              ? "border border-border bg-background font-medium text-foreground shadow-xs"
                              : "bg-muted font-normal text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          <span className="truncate">{rec.label}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <span>
                          {rec.label} · {rec.why}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          </div>
        ) : macroSpec.recommended ? (
          <div className="mt-auto flex flex-col gap-1.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-heading text-xs font-medium text-foreground">
                Recommended
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {macroSpec.targetDuration}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {macroSpec.recommended.map((rec) => {
                const isSelected = activePresetId === rec.id

                return (
                  <Tooltip key={rec.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => selectEase(rec.id)}
                        className={cn(
                          "flex h-8 cursor-pointer items-center justify-center rounded-[8px] px-1 font-sans text-xs transition-colors active:scale-95",
                          isSelected
                            ? "border border-border bg-background font-medium text-foreground shadow-xs"
                            : "bg-muted font-normal text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <span className="truncate">{rec.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <span>
                        {rec.label} · {rec.why}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        ) : null}
      </section>
    </TooltipProvider>
  )
}
