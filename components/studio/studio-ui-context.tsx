"use client"

import * as React from "react"

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
  const [isTimelineOpen, setTimelineOpen] =
    React.useState<boolean>(initialTimelineOpen)

  const toggleTimeline = React.useCallback(() => {
    setTimelineOpen((prev) => !prev)
  }, [])

  const value = React.useMemo<StudioUiContextValue>(
    () => ({
      isTimelineOpen,
      setTimelineOpen,
      toggleTimeline,
    }),
    [isTimelineOpen, toggleTimeline]
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
