"use client"

import * as React from "react"
import { motion } from "motion/react"
import {
  ChevronDoubleCloseIcon,
  LaptopIcon,
  Tablet01Icon,
  SmartPhone01Icon,
  SlidersHorizontalIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PreviewBackground } from "@/components/previewer/preview-background"
import { cn } from "@/lib/utils"
import { useEaseStore } from "@/hooks/use-ease-store"
import { useStudioUi } from "@/components/studio/studio-ui-context"
import { HabitatStage } from "@/components/studio/habitats/habitat-stage"
import { AuditionToolbar } from "./audition-toolbar"

/** Smallest usable preview stage, in px. Also the hit area of the drag handle. */
const MIN_STAGE_W = 320

export function PreviewTheater() {
  const viewport = useEaseStore((s) => s.viewport)
  const setViewport = useEaseStore((s) => s.setViewport)
  const { isTimelineOpen, toggleTimeline } = useStudioUi()

  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [customDrag, setCustomDrag] = React.useState<{
    viewport: string
    width: number
  } | null>(null)

  const previewWidth =
    customDrag && customDrag.viewport === viewport
      ? customDrag.width
      : viewport === "mobile"
        ? 375
        : viewport === "tablet"
          ? 768
          : "100%"

  // Drag-to-resize viewport interaction
  const handlePointerDown = React.useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setIsDragging(true)
    document.body.style.cursor = "col-resize"
  }, [])

  React.useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const raw = e.clientX - containerRect.left
      const nextWidth = Math.min(
        Math.max(raw, MIN_STAGE_W),
        containerRect.width
      )
      setCustomDrag({ viewport, width: nextWidth })
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ""
    }

    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove)
      window.addEventListener("pointerup", handlePointerUp)
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      if (isDragging) {
        document.body.style.cursor = ""
      }
    }
  }, [isDragging, viewport])

  return (
    <TooltipProvider delayDuration={150}>
      <section
        aria-label="Component Preview Theater"
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-background p-2 transition-colors select-none"
      >
        {/* Stage Container */}
        <div className="relative flex h-full w-full overflow-hidden rounded-[16px]">
          {/* Workbench Cutting-Mat Substrate */}
          <PreviewBackground />

          {/* Top-Right Viewport Switcher */}
          <div
            role="tablist"
            aria-label="Preview viewport modes"
            className="absolute top-3 right-3 z-30 flex items-center rounded-[10px] bg-background p-0.5 select-none"
          >
            {[
              { mode: "desktop" as const, icon: LaptopIcon, label: "Desktop" },
              { mode: "tablet" as const, icon: Tablet01Icon, label: "Tablet" },
              {
                mode: "mobile" as const,
                icon: SmartPhone01Icon,
                label: "Mobile",
              },
            ].map((item) => {
              const isActive = viewport === item.mode
              return (
                <Tooltip key={item.mode}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`${item.label} viewport`}
                      onClick={() => {
                        setCustomDrag(null)
                        setViewport(item.mode)
                      }}
                      className={cn(
                        "relative flex size-7 cursor-pointer items-center justify-center rounded-[8px] transition-colors outline-none",
                        isActive
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <HugeiconsIcon icon={item.icon} className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <span>{item.label} View</span>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>

          {/* Resizable Playground Canvas */}
          <div
            className="pointer-events-none absolute inset-0 flex"
            ref={containerRef}
          >
            <motion.div
              initial={false}
              animate={{ width: previewWidth }}
              transition={{
                type: "spring",
                bounce: 0,
                duration: isDragging ? 0 : 0.4,
              }}
              className="pointer-events-auto relative flex h-full max-w-full flex-row overflow-hidden rounded-2xl bg-background"
            >
              {/* In-Process Habitat Stage */}
              <div className="relative flex h-full min-w-0 flex-1 overflow-hidden rounded-2xl bg-background contain-paint">
                <HabitatStage />
              </div>

              {/* Absolutely positioned right-edge col-resize handle */}
              <div
                onPointerDown={handlePointerDown}
                className="group absolute top-0 right-0 z-50 flex h-full w-4 cursor-col-resize items-center justify-center select-none"
              >
                <div
                  className={cn(
                    "flex h-[40%] w-1.5 items-center justify-center rounded-full transition-colors",
                    isDragging
                      ? "bg-foreground"
                      : "bg-border group-hover:bg-foreground"
                  )}
                >
                  <HugeiconsIcon
                    icon={ChevronDoubleCloseIcon}
                    className="size-3.5 text-background opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Centered Floating Kinetic Dock */}
          <div className="absolute bottom-3 left-1/2 z-30 max-w-[calc(100%-112px)] -translate-x-1/2">
            <AuditionToolbar />
          </div>

          {/* Bottom-Right Master Timeline Toggle Squircle */}
          <div className="absolute right-3 bottom-3 z-30">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleTimeline}
                  aria-label={
                    isTimelineOpen
                      ? "Hide Timeline Scrubber"
                      : "Reveal Timeline Scrubber"
                  }
                  className={cn(
                    "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[10px] transition-colors outline-none",
                    isTimelineOpen
                      ? "bg-foreground text-background"
                      : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <HugeiconsIcon
                    icon={SlidersHorizontalIcon}
                    className="size-4"
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex items-center gap-2">
                <span>
                  {isTimelineOpen ? "Hide Timeline" : "Reveal Timeline"}
                </span>
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                  T
                </kbd>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </section>
    </TooltipProvider>
  )
}
