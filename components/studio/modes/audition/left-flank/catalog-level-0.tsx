"use client"

import * as React from "react"
import { AnimatePresence, motion, LayoutGroup } from "motion/react"
import {
  ArrowUpRight01Icon,
  Search01Icon,
  Cancel01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { MiniGraph } from "@/components/ui/mini-graph"
import {
  CANONICAL_BEZIER_PRESETS,
  CANONICAL_SPRING_PRESETS,
  isPopularPreset,
} from "@/core/presets/index"
import { EaseCurve } from "@/core/schema"
import { useEaseStore } from "@/hooks/use-ease-store"
import {
  SATISIUM_CARD_POP_VARIANTS,
  SATISIUM_IOS_SHEET_EASE,
  SATISIUM_PRESS_CLASS,
  SATISIUM_SPRING_PILL,
} from "@/lib/motion"
import { cn } from "@/lib/utils"

const librarySlideVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? "100%" : "-100%",
    opacity: 1,
  }),
  center: {
    x: "0%",
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? "-100%" : "100%",
    opacity: 1,
  }),
}

const librarySlideTransition = {
  duration: 0.32,
  ease: SATISIUM_IOS_SHEET_EASE,
} as const

export function CatalogLevel0() {
  const customCurves = useEaseStore((s) => s.customCurves)
  const activeLibraryTab = useEaseStore((s) => s.activeLibraryTab)
  const setActiveLibraryTab = useEaseStore((s) => s.setActiveLibraryTab)
  const selectCurveForFocused = useEaseStore((s) => s.selectCurveForFocused)
  const drillIntoCurve = useEaseStore((s) => s.drillIntoCurve)
  const deleteCurve = useEaseStore((s) => s.deleteCurve)

  const focusedChannel = useEaseStore((s) => s.getFocusedChannel())
  const activeCurveId = focusedChannel?.curve.id

  const [searchQuery, setSearchQuery] = React.useState<string>("")
  const [catalogFilter, setCatalogFilter] = React.useState<"all" | "popular">(
    "all"
  )
  const [slideDirection, setSlideDirection] = React.useState<number>(1)

  const [isGridSliding, setIsGridSliding] = React.useState(false)
  const gridTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (gridTimerRef.current) clearTimeout(gridTimerRef.current)
    }
  }, [])

  const handleGridAnimationStart = React.useCallback(() => {
    setIsGridSliding(true)
    if (gridTimerRef.current) clearTimeout(gridTimerRef.current)
    gridTimerRef.current = setTimeout(() => {
      setIsGridSliding(false)
    }, 400)
  }, [])

  const handleGridAnimationComplete = React.useCallback(() => {
    if (gridTimerRef.current) clearTimeout(gridTimerRef.current)
    setIsGridSliding(false)
  }, [])

  const handleEngineChange = (target: "bezier" | "spring") => {
    if (target === activeLibraryTab) return
    setSlideDirection(target === "spring" ? 1 : -1)
    setActiveLibraryTab(target)
  }

  const handleFilterChange = (target: "all" | "popular") => {
    if (target === catalogFilter) return
    setSlideDirection(target === "popular" ? 1 : -1)
    setCatalogFilter(target)
  }

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [isScrolledTop, setIsScrolledTop] = React.useState(false)
  const [isScrolledBottom, setIsScrolledBottom] = React.useState(false)

  const checkScroll = React.useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setIsScrolledTop(scrollTop > 0)
    setIsScrolledBottom(Math.ceil(scrollTop + clientHeight) < scrollHeight - 1)
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()

    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => checkScroll())
    ro.observe(el)
    return () => {
      ro.disconnect()
    }
  }, [checkScroll])

  const groupedSystemPresets = React.useMemo(() => {
    const list =
      activeLibraryTab === "bezier"
        ? CANONICAL_BEZIER_PRESETS
        : CANONICAL_SPRING_PRESETS
    const query = searchQuery.trim().toLowerCase()

    const filtered = list.filter((p) => {
      if (catalogFilter === "popular" && !isPopularPreset(p.id)) {
        return false
      }
      if (!query) return true
      const matchName = p.name.toLowerCase().includes(query)
      const matchDesc = p.description?.toLowerCase().includes(query) ?? false
      const matchUse =
        p.useCases?.some((u) => u.toLowerCase().includes(query)) ?? false
      return matchName || matchDesc || matchUse
    })

    const groupsMap = new Map<string, EaseCurve[]>()
    for (const preset of filtered) {
      const cat = preset.category || "General"
      const existing = groupsMap.get(cat)
      if (existing) {
        existing.push(preset)
      } else {
        groupsMap.set(cat, [preset])
      }
    }

    const groups = Array.from(groupsMap.entries()).map(([label, presets]) => ({
      id: label,
      label,
      presets,
    }))

    return { groups, totalCount: filtered.length }
  }, [activeLibraryTab, searchQuery, catalogFilter])

  const renderLibraryContent = () => {
    if (groupedSystemPresets.totalCount === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-2 flex size-9 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
            <HugeiconsIcon icon={Search01Icon} className="size-4" />
          </div>
          <span className="font-heading text-xs font-semibold text-foreground">
            No curves found
          </span>
          <p className="mt-0.5 font-sans text-[11px] text-muted-foreground">
            {searchQuery
              ? `No matches for "${searchQuery}"`
              : "No curves in this view"}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-2.5 cursor-pointer rounded-[6px] bg-secondary px-2.5 py-1 font-sans text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              Clear search
            </button>
          )}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-3">
        {groupedSystemPresets.groups.map((group) => (
          <div key={group.id} className="flex flex-col gap-1.5">
            {/* Family Section Subhead */}
            <div className="flex items-center justify-between px-0.5 pt-0.5">
              <span className="font-heading text-[11px] font-semibold text-muted-foreground">
                {group.label}
              </span>
              <span className="font-sans text-[10px] text-muted-foreground">
                {group.presets.length}
              </span>
            </div>

            {/* 3-Column Squircle Grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {group.presets.map((item) => {
                const isActive = activeCurveId === item.id
                return (
                  <div
                    key={item.id}
                    className="group relative flex w-full flex-col"
                  >
                    <button
                      type="button"
                      onClick={() => selectCurveForFocused(item.id)}
                      onDoubleClick={() => drillIntoCurve(item.id)}
                      title={`${item.name} · Click to select · Double-click to open slide`}
                      className={cn(
                        "relative flex w-full cursor-pointer flex-col items-center rounded-[10px] p-0.5 transition-all",
                        SATISIUM_PRESS_CLASS,
                        isActive
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {/* Inner Mini Graph Box */}
                      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[8px] bg-background p-1">
                        <MiniGraph
                          mode={activeLibraryTab}
                          bezier={
                            activeLibraryTab === "bezier"
                              ? item.bezier
                              : undefined
                          }
                          spring={
                            activeLibraryTab === "spring"
                              ? item.spring
                              : undefined
                          }
                          className={cn(
                            "h-full w-full stroke-2 transition-colors",
                            isActive
                              ? "stroke-foreground"
                              : "stroke-muted-foreground group-hover:stroke-foreground"
                          )}
                        />
                      </div>

                      {/* Grounded Name Strip in Outer Box */}
                      <div className="flex h-4.5 w-full items-center justify-center px-0.5">
                        <span className="truncate font-sans text-[10px] leading-none font-medium tracking-tight">
                          {item.name}
                        </span>
                      </div>
                    </button>

                    {/* Quick Inspect Button on Hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        drillIntoCurve(item.id)
                      }}
                      aria-label={`Open ${item.name} slide`}
                      title={`Open ${item.name} slide`}
                      className="absolute top-1.5 right-1.5 z-10 flex size-4 cursor-pointer items-center justify-center rounded-[4px] bg-background text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                    >
                      <HugeiconsIcon
                        icon={ArrowUpRight01Icon}
                        className="size-2.5"
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col select-none">
      {/* 1. APEX: CUSTOM CURVES */}
      {customCurves.length > 0 && (
        <div className="mb-1 flex shrink-0 flex-col gap-1.5 pb-3.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="font-heading text-xs font-semibold text-foreground">
              Custom curves
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {customCurves.map((curve) => {
                const isSelected =
                  activeCurveId === curve.id ||
                  Boolean(curve.variants?.some((v) => v.id === activeCurveId))
                const variantCount = curve.variants?.length ?? 0

                return (
                  <motion.div
                    key={curve.id}
                    layout
                    variants={SATISIUM_CARD_POP_VARIANTS}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="group relative flex w-full flex-col"
                  >
                    <button
                      type="button"
                      onClick={() => selectCurveForFocused(curve.id)}
                      onDoubleClick={() => drillIntoCurve(curve.id)}
                      title={
                        variantCount > 0
                          ? `${curve.name} · Click to select · Double-click to expand variants`
                          : `${curve.name} · Click to select · Double-click to inspect`
                      }
                      className={cn(
                        "relative flex w-full cursor-pointer flex-col items-center rounded-[10px] p-0.5 transition-all",
                        SATISIUM_PRESS_CLASS,
                        isSelected
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {/* Inner Mini Graph Box */}
                      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[8px] bg-background p-1">
                        {variantCount > 0 && (
                          <span className="pointer-events-none absolute top-1 left-1.5 font-sans text-[9px] font-semibold tracking-tight text-muted-foreground">
                            +{variantCount}
                          </span>
                        )}

                        <MiniGraph
                          mode={curve.engine}
                          bezier={curve.bezier}
                          spring={curve.spring}
                          className={cn(
                            "h-full w-full stroke-2 transition-colors",
                            isSelected
                              ? "stroke-foreground"
                              : "stroke-muted-foreground group-hover:stroke-foreground"
                          )}
                        />
                      </div>

                      {/* Grounded Name Strip in Outer Box */}
                      <div className="flex h-4.5 w-full items-center justify-center px-0.5">
                        <span className="truncate font-sans text-[10px] leading-none font-medium tracking-tight">
                          {curve.name}
                        </span>
                      </div>
                    </button>

                    {/* Delete Custom Curve on Hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteCurve(curve.id)
                      }}
                      aria-label={`Delete ${curve.name}`}
                      title={`Delete ${curve.name}`}
                      className="absolute top-1.5 left-1.5 z-10 flex size-4 cursor-pointer items-center justify-center rounded-[4px] bg-background text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-2.5" />
                    </button>

                    {/* Quick Inspect Button on Hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        drillIntoCurve(curve.id)
                      }}
                      aria-label={`Open ${curve.name} studio`}
                      title="Open Ease Studio"
                      className="absolute top-1.5 right-1.5 z-10 flex size-4 cursor-pointer items-center justify-center rounded-[4px] bg-background text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                    >
                      <HugeiconsIcon
                        icon={ArrowUpRight01Icon}
                        className="size-2.5"
                      />
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* 2. LIBRARY QUERY CONTROLS (ENGINE SWITCHER + SEARCH + CATEGORY FILTER) */}
      <div className="flex shrink-0 flex-col gap-1.5 pt-0.5">
        {/* Engine Switcher */}
        <LayoutGroup id="catalog-engine-group">
          <div className="flex h-7 w-full shrink-0 items-center rounded-[10px] bg-muted p-0.5">
            <button
              type="button"
              onClick={() => handleEngineChange("bezier")}
              className={cn(
                "relative z-10 h-full flex-1 cursor-pointer rounded-[8px] text-center font-heading text-[11px] font-medium transition-colors outline-none",
                SATISIUM_PRESS_CLASS,
                activeLibraryTab === "bezier"
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeLibraryTab === "bezier" && (
                <motion.div
                  layoutId="catalog-engine-pill"
                  transition={SATISIUM_SPRING_PILL}
                  className="absolute inset-0 rounded-[8px] bg-background"
                />
              )}
              <span className="relative z-20">
                Bezier ({CANONICAL_BEZIER_PRESETS.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleEngineChange("spring")}
              className={cn(
                "relative z-10 h-full flex-1 cursor-pointer rounded-[8px] text-center font-heading text-[11px] font-medium transition-colors outline-none",
                SATISIUM_PRESS_CLASS,
                activeLibraryTab === "spring"
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeLibraryTab === "spring" && (
                <motion.div
                  layoutId="catalog-engine-pill"
                  transition={SATISIUM_SPRING_PILL}
                  className="absolute inset-0 rounded-[8px] bg-background"
                />
              )}
              <span className="relative z-20">
                Spring ({CANONICAL_SPRING_PRESETS.length})
              </span>
            </button>
          </div>
        </LayoutGroup>

        {/* Flush Search Bar */}
        <div className="relative flex h-7 w-full shrink-0 items-center">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search curves..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 w-full rounded-[8px] bg-muted pr-7 pl-7 font-sans text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. LIBRARY HEADER + FILTER DOCK */}
      <div className="mt-2.5 flex h-5 shrink-0 items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-heading text-xs font-semibold text-foreground">
            Library
          </span>
          <span className="font-sans text-[11px] font-normal text-muted-foreground">
            ({groupedSystemPresets.totalCount})
          </span>
        </div>

        {/* All vs Popular Filter Pill */}
        <LayoutGroup id="catalog-filter-group">
          <div className="flex h-5 items-center rounded-[6px] bg-muted p-0.5 font-sans text-[10px]">
            <button
              type="button"
              onClick={() => handleFilterChange("all")}
              className={cn(
                "relative z-10 cursor-pointer rounded-[4px] px-1.5 py-0.5 transition-colors outline-none",
                SATISIUM_PRESS_CLASS,
                catalogFilter === "all"
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {catalogFilter === "all" && (
                <motion.div
                  layoutId="catalog-filter-pill"
                  transition={SATISIUM_SPRING_PILL}
                  className="absolute inset-0 rounded-[5px] bg-background"
                />
              )}
              <span className="relative z-20">All</span>
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange("popular")}
              className={cn(
                "relative z-10 cursor-pointer rounded-[4px] px-1.5 py-0.5 transition-colors outline-none",
                SATISIUM_PRESS_CLASS,
                catalogFilter === "popular"
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {catalogFilter === "popular" && (
                <motion.div
                  layoutId="catalog-filter-pill"
                  transition={SATISIUM_SPRING_PILL}
                  className="absolute inset-0 rounded-[5px] bg-background"
                />
              )}
              <span className="relative z-20">★ Popular</span>
            </button>
          </div>
        </LayoutGroup>
      </div>

      {/* 4. SCROLLABLE LIBRARY GRID WITH PROGRESSIVE BLUR VIGNETTES */}
      <div className="relative mt-1.5 flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Top Progressive Blur Vignette */}
        <div
          aria-hidden="true"
          className={cn(
            "progressive-blur-top pointer-events-none absolute top-0 right-0 left-0 z-20 h-6 transition-opacity duration-300 select-none",
            isScrolledTop ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Scrollable Container (Zero Scrollbar) */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto pt-0.5 pb-2"
        >
          {typeof process !== "undefined" && process.env.NODE_ENV === "test" ? (
            <div
              key={`${activeLibraryTab}-${catalogFilter}`}
              className="w-full"
            >
              {renderLibraryContent()}
            </div>
          ) : (
            <AnimatePresence
              mode="popLayout"
              initial={false}
              custom={slideDirection}
            >
              <motion.div
                key={`${activeLibraryTab}-${catalogFilter}`}
                custom={slideDirection}
                variants={librarySlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={librarySlideTransition}
                onAnimationStart={handleGridAnimationStart}
                onAnimationComplete={handleGridAnimationComplete}
                className="flex h-full min-h-0 w-full flex-col will-change-transform"
              >
                {renderLibraryContent()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Active Edge Progressive Blur Vignettes during Grid Slide */}
        {isGridSliding && (
          <>
            <div
              aria-hidden="true"
              className="progressive-blur-left pointer-events-none absolute inset-y-0 left-0 z-20 w-3 select-none"
            />
            <div
              aria-hidden="true"
              className="progressive-blur-right pointer-events-none absolute inset-y-0 right-0 z-20 w-3 select-none"
            />
          </>
        )}

        {/* Bottom Progressive Blur Vignette */}
        <div
          aria-hidden="true"
          className={cn(
            "progressive-blur-bottom pointer-events-none absolute right-0 bottom-0 left-0 z-20 h-8 transition-opacity duration-300 select-none",
            isScrolledBottom ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
    </div>
  )
}
