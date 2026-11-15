"use client"

import * as React from "react"

const TIMELINE_STORAGE_KEY = "satisium-ease-timeline-open"

interface StudioUiContextValue {
  isTimelineOpen: boolean
  setTimelineOpen: (open: boolean) => void
  toggleTimeline: () => void
}

const StudioUiContext = React.createContext<StudioUiContextValue | null>(null)

export interface StudioUiProviderProps {
  children: React.ReactNode
  initialTimelineOpen?: boolean
}

export function StudioUiProvider({
  children,
  initialTimelineOpen = true,
}: StudioUiProviderProps) {
  const [isTimelineOpen, setIsTimelineOpenState] =
    React.useState<boolean>(initialTimelineOpen)

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TIMELINE_STORAGE_KEY)
      if (stored !== null) {
        queueMicrotask(() => {
          setIsTimelineOpenState(stored === "true")
        })
      }
    } catch {
      // safe fallback on storage failure
    }
  }, [])

  const setTimelineOpen = React.useCallback((open: boolean) => {
    setIsTimelineOpenState(open)
    try {
      window.localStorage.setItem(TIMELINE_STORAGE_KEY, String(open))
    } catch {
      // safe fallback on storage failure
    }
  }, [])

  const toggleTimeline = React.useCallback(() => {
    setIsTimelineOpenState((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(TIMELINE_STORAGE_KEY, String(next))
      } catch {
        // safe fallback on storage failure
      }
      return next
    })
  }, [])

  const value = React.useMemo<StudioUiContextValue>(
    () => ({
      isTimelineOpen,
      setTimelineOpen,
      toggleTimeline,
    }),
    [isTimelineOpen, setTimelineOpen, toggleTimeline]
  )

  return (
    <StudioUiContext.Provider value={value}>
      {children}
    </StudioUiContext.Provider>
  )
}

export function useStudioUi(): StudioUiContextValue {
  const context = React.useContext(StudioUiContext)
  if (!context) {
    throw new Error("useStudioUi must be used within a <StudioUiProvider>")
  }
  return context
}
