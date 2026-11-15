"use client"

import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  getCanonicalPresetById,
  getPairedTrackId,
  getTrackPlugin,
  trackRegistry,
} from "@/core"
import { useEaseStore } from "@/hooks/use-ease-store"

const SHORT_PRESET_NAMES: Record<string, string> = {
  "ease-out-quart": "Quart Out",
  "material-emphasized": "Emphasized",
  "material-decelerate": "Decel",
  "material-accelerate": "Accel",
  "snappy-spring": "Snappy",
  "expo-out": "Expo Out",
  "expo-in": "Expo In",
  "ios-fluid": "Fluid (iOS)",
  "power1-out": "Power1 Out",
  "power2-out": "Power2 Out",
  "power3-out": "Power3 Out",
  "power4-out": "Power4 Out",
  "power1-in": "Power1 In",
  "power2-in": "Power2 In",
  "power3-in": "Power3 In",
  "power4-in": "Power4 In",
  "circ-out": "Circ Out",
  "circ-in": "Circ In",
  "back-out": "Back Out",
  "back-in": "Back In",
  "back-in-out": "Back InOut",
  "react-default": "React",
  "material-pop": "Pop",
  "mechanical-arm": "Mechanical",
  "soap-bubble": "Bubble",
  "rubber-band": "Rubber",
  "super-bouncy": "Bouncy",
  "elastic-out": "Elastic Out",
  "elastic-soft": "Elastic Soft",
  "elastic-hard": "Elastic Hard",
  gentle: "Gentle",
  stiff: "Stiff",
  heavy: "Heavy",
  button: "Button",
  toast: "Toast",
  drawer: "Drawer",
}

function getShortPresetName(id: string, fullName: string): string {
  return SHORT_PRESET_NAMES[id] ?? fullName
}

export function ArchetypeAdvisorSlab({ className }: { className?: string }) {
  const focusedTrackId = useEaseStore((s) => s.focusedTrackId)
  const focusedChannelId = useEaseStore((s) => s.focusedChannelId)
  const trackBindings = useEaseStore((s) => s.trackBindings)
  const focusTrack = useEaseStore((s) => s.focusTrack)
  const selectCurveForFocused = useEaseStore((s) => s.selectCurveForFocused)

  // 1. Resolve active track and channel
  const focusedTrack = React.useMemo(() => {
    return getTrackPlugin(focusedTrackId) ?? trackRegistry.list()[0]
  }, [focusedTrackId])

  const currentChannels = React.useMemo(() => {
    return trackBindings[focusedTrackId] ?? focusedTrack.channels
  }, [trackBindings, focusedTrackId, focusedTrack])

  const channel = React.useMemo(() => {
    if (focusedChannelId !== "all") {
      const found = currentChannels.find((c) => c.id === focusedChannelId)
      if (found) return found
    }
    // When "all", pick the primary non-opacity channel—or channels[0] if all are opacity
    return (
      currentChannels.find((c) => c.property !== "opacity") ??
      currentChannels[0]
    )
  }, [currentChannels, focusedChannelId])

  // 2. Paired phase resolution (e.g. Entrance vs Exit)
  const pairedTrackId = React.useMemo(() => {
    return getPairedTrackId(focusedTrackId)
  }, [focusedTrackId])

  const pairedTrack = React.useMemo(() => {
    if (!pairedTrackId) return null
    return getTrackPlugin(pairedTrackId) ?? null
  }, [pairedTrackId])

  const pairedChannel = React.useMemo(() => {
    if (!pairedTrack || !channel) return null
    const pairedBindings = trackBindings[pairedTrack.id] ?? pairedTrack.channels
    return (
      pairedBindings.find((c) => c.property === channel.property) ??
      pairedBindings[0]
    )
  }, [pairedTrack, channel, trackBindings])

  if (!channel) return null

  const activePresets = (
    channel.semanticContext?.recommendedPresetIds ?? []
  ).slice(0, 3)
  const pairedPresets = (
    pairedChannel?.semanticContext?.recommendedPresetIds ?? []
  ).slice(0, 3)

  return (
    <TooltipProvider delayDuration={150}>
      <section
        aria-label="Motion Guide"
        className={cn(
          "no-scrollbar flex min-h-0 flex-1 flex-col gap-3 rounded-[20px] bg-background p-4 transition-colors select-none",
          className
        )}
      >
        {/* Header: Title + Semantic Role Badge */}
        <div className="flex shrink-0 items-center justify-between">
          <span className="font-heading text-xs font-semibold text-foreground">
            Motion Guide · {channel.label}
          </span>
          {channel.semanticContext?.roleTitle && (
            <span className="rounded-[6px] bg-secondary px-2 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
              {channel.semanticContext.roleTitle}
            </span>
          )}
        </div>

        {/* Semantic Role Guidance Text */}
        <p className="font-sans text-xs leading-relaxed text-muted-foreground">
          {channel.semanticContext?.guidance ??
            "Calibrate arrival timing and deceleration to communicate spatial physical continuity."}
        </p>

        {/* Quiet, Borderless Active Curve & Duration Line */}
        <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <span>{channel.curve.name}</span>
          <span>·</span>
          <span>{channel.durationMs}ms</span>
        </div>

        {/* Curated Recommendations Anchored to Bottom of Block (mt-auto) */}
        <div className="mt-auto flex flex-col gap-3 pt-2">
          {/* Active Phase Recommendations */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-heading text-xs font-medium text-foreground">
                Recommended
              </span>
              {channel.semanticContext?.recommendedRangeMs && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {channel.semanticContext.recommendedRangeMs[0]}–
                  {channel.semanticContext.recommendedRangeMs[1]}ms
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {activePresets.map((presetId) => {
                const preset = getCanonicalPresetById(presetId)
                if (!preset) return null
                const isSelected = channel.curve.id === preset.id
                const shortLabel = getShortPresetName(preset.id, preset.name)

                return (
                  <Tooltip key={preset.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => selectCurveForFocused(preset.id)}
                        aria-label={`Apply ${preset.name} preset`}
                        className={cn(
                          "flex h-8 cursor-pointer items-center justify-center rounded-[8px] px-1 font-sans text-xs transition-colors active:scale-95",
                          isSelected
                            ? "bg-background font-medium text-foreground"
                            : "bg-muted font-normal text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <span className="truncate">{shortLabel}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <span>
                        {preset.name} · {preset.description || preset.engine}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>

          {/* Paired Phase Recommendations (if paired track exists) */}
          {pairedTrack && pairedChannel && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-heading text-xs font-medium text-foreground">
                  {pairedTrack.phaseLabel ?? "Exit"} Recommended
                </span>
                {pairedChannel.semanticContext?.recommendedRangeMs && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {pairedChannel.semanticContext.recommendedRangeMs[0]}–
                    {pairedChannel.semanticContext.recommendedRangeMs[1]}ms
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {pairedPresets.map((presetId) => {
                  const preset = getCanonicalPresetById(presetId)
                  if (!preset) return null
                  const isSelected = pairedChannel.curve.id === preset.id
                  const shortLabel = getShortPresetName(preset.id, preset.name)

                  return (
                    <Tooltip key={preset.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            focusTrack(pairedTrack.id)
                            selectCurveForFocused(preset.id)
                          }}
                          aria-label={`Switch to ${pairedTrack.phaseLabel} and apply ${preset.name}`}
                          className={cn(
                            "flex h-8 cursor-pointer items-center justify-center rounded-[8px] px-1 font-sans text-xs transition-colors active:scale-95",
                            isSelected
                              ? "bg-background font-medium text-foreground"
                              : "bg-muted font-normal text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          <span className="truncate">{shortLabel}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <span>
                          {preset.name} · {preset.description || preset.engine}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </TooltipProvider>
  )
}
