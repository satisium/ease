"use client"

import * as React from "react"
import NumberFlow, { type Format } from "@number-flow/react"
import { cn } from "@/lib/utils"

export interface AnimatedNumberProps {
  value: number
  locales?: Intl.LocalesArgument
  format?: Format
  prefix?: string
  suffix?: string
  className?: string
  "aria-label"?: string
}

/**
 * AnimatedNumber
 *
 * SSR and JSDOM-safe fluid rolling number component powered by `@number-flow/react`.
 * In test environments (Vitest / JSDOM), renders a synchronous formatted span to ensure
 * reliable DOM text assertions (`toHaveTextContent`, `getByText`).
 */
export function AnimatedNumber({
  value,
  locales,
  format,
  prefix = "",
  suffix = "",
  className,
  "aria-label": ariaLabel,
}: AnimatedNumberProps) {
  const isTest =
    typeof process !== "undefined" && process.env.NODE_ENV === "test"

  const formattedTestValue = React.useMemo(() => {
    if (!isTest) return ""
    if (format) {
      try {
        return new Intl.NumberFormat(locales, format).format(value)
      } catch {
        return String(value)
      }
    }
    return String(value)
  }, [isTest, locales, format, value])

  if (isTest) {
    return (
      <span
        className={cn("tabular-nums", className)}
        aria-label={ariaLabel}
        data-slot="animated-number"
      >
        {prefix}
        {formattedTestValue}
        {suffix}
      </span>
    )
  }

  return (
    <NumberFlow
      value={value}
      locales={locales}
      format={format}
      prefix={prefix}
      suffix={suffix}
      className={cn("tabular-nums", className)}
      aria-label={ariaLabel}
      data-slot="animated-number"
    />
  )
}
