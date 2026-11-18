"use client"

import * as React from "react"
import type { TrackFrameResult } from "@/core"
import { useEaseStoreApi } from "@/hooks/use-ease-store"
import { useTransitionTrack } from "@/hooks/use-transition-track"

interface OtpShakeHabitatProps {
  compareItemId?: string
}

export function OtpShakeHabitat({ compareItemId }: OtpShakeHabitatProps) {
  const store = useEaseStoreApi()
  const [code, setCode] = React.useState<string>("")
  const [isFocused, setIsFocused] = React.useState<boolean>(false)
  const [isVerified, setIsVerified] = React.useState<boolean>(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const codeRef = React.useRef<string>(code)
  const rowRef = React.useRef<HTMLDivElement | null>(null)
  const hiddenInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    codeRef.current = code
  }, [code])

  const handleFrame = React.useCallback((frame: TrackFrameResult) => {
    if (rowRef.current) {
      const pShake = frame.progressByChannel.shake ?? 0
      const amp = frame.values.shake ?? 0
      const clampedP = Math.min(1, Math.max(0, pShake))
      const wave =
        Math.sin(clampedP * Math.PI * 5) *
        (1 - clampedP) *
        (Math.abs(amp) > 0.1 ? 10 : 0)

      rowRef.current.style.transform = `translate3d(${wave.toFixed(2)}px, 0px, 0px)`

      const popScale = frame.values.digitPop ?? 1
      const slots =
        rowRef.current.querySelectorAll<HTMLDivElement>("[data-otp-slot]")
      const targetIdx = Math.max(0, Math.min(3, codeRef.current.length - 1))
      const targetSlot = slots[targetIdx]
      if (targetSlot) {
        targetSlot.style.transform = `scale(${popScale.toFixed(4)})`
      }
    }
  }, [])

  const { triggerLive } = useTransitionTrack("otp:verify", {
    compareItemId,
    onFrame: handleFrame,
  })

  const triggerVerify = React.useCallback(() => {
    if (compareItemId) {
      store.getState().playScoped()
    } else {
      triggerLive()
    }
  }, [compareItemId, store, triggerLive])

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = e.target.value.replace(/\D/g, "").slice(0, 4)
      const prevLen = codeRef.current.length
      setCode(sanitized)
      setErrorMsg(null)

      if (sanitized.length > prevLen && rowRef.current) {
        const slots =
          rowRef.current.querySelectorAll<HTMLDivElement>("[data-otp-slot]")
        const slot = slots[sanitized.length - 1]
        if (slot) {
          slot.style.transform = "scale(0.88)"
          requestAnimationFrame(() => {
            slot.style.transform = "scale(1.0)"
          })
        }
      }

      if (sanitized.length === 4) {
        if (sanitized === "1234") {
          setIsVerified(true)
          setTimeout(() => {
            setIsVerified(false)
            setCode("")
          }, 1400)
        } else {
          setErrorMsg("Invalid code")
          triggerVerify()
        }
      }
    },
    [triggerVerify]
  )

  const handleVerify = React.useCallback(() => {
    if (code === "1234") {
      setIsVerified(true)
      setTimeout(() => {
        setIsVerified(false)
        setCode("")
      }, 1400)
    } else {
      setErrorMsg("Invalid code")
      triggerVerify()
      hiddenInputRef.current?.focus()
    }
  }, [code, triggerVerify])

  return (
    <div className="relative flex h-full min-h-full w-full flex-1 items-center justify-center overflow-hidden rounded-[16px] bg-secondary p-1.5 select-none">
      <div className="relative flex h-full w-full items-center justify-center rounded-[11px] bg-background p-6">
        <div className="flex w-[216px] flex-col items-center gap-4">
          <span className="font-heading text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Enter verification code
          </span>

          {/* Underlying Input & Visual 4-slot row */}
          <div
            ref={rowRef}
            className="relative flex w-[216px] justify-center will-change-transform"
          >
            <input
              ref={hiddenInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={code}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              aria-label="Verification code input"
              className="absolute inset-0 z-20 h-full w-full cursor-text opacity-0"
            />

            <div className="grid w-full grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((idx) => {
                const digit = code[idx] ?? ""
                const isActiveSlot =
                  isFocused &&
                  !isVerified &&
                  (idx === code.length || (code.length === 4 && idx === 3))
                const showCaret =
                  isFocused && !isVerified && idx === code.length

                return (
                  <div
                    key={idx}
                    data-otp-slot=""
                    className={`relative flex h-12 w-12 items-center justify-center rounded-[11px] font-heading text-base font-semibold tabular-nums transition-colors will-change-transform ${
                      isVerified
                        ? "bg-foreground text-background"
                        : isActiveSlot
                          ? "bg-secondary text-foreground ring-2 ring-foreground"
                          : "bg-secondary text-foreground"
                    }`}
                  >
                    {digit ? (
                      <span>{digit}</span>
                    ) : showCaret ? (
                      <span className="h-4 w-0.5 animate-pulse bg-foreground" />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          {errorMsg ? (
            <span className="font-sans text-[11px] font-medium text-destructive">
              {errorMsg}
            </span>
          ) : null}

          <button
            type="button"
            onClick={handleVerify}
            aria-label="Verify code"
            className="inline-flex h-9 w-[216px] cursor-pointer items-center justify-center rounded-[10px] bg-foreground font-heading text-xs font-medium text-background transition-opacity hover:opacity-90 active:scale-95"
          >
            {isVerified ? "Verified" : "Verify Code"}
          </button>
        </div>
      </div>
    </div>
  )
}
