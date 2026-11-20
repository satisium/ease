"use client"

import * as React from "react"
import { StarIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { SiGithub, SiDiscord, SiX } from "@icons-pack/react-simple-icons"
import { PROJECT, AUTHOR } from "@/lib/config"
import { SATISIUM_PRESS_CLASS } from "@/lib/motion"
import { cn } from "@/lib/utils"

export type SponsorAdVariant = "open-source" | "rent-space" | "satisium-ui"
export type SponsorVariant = SponsorAdVariant

interface SponsorAdSlabProps {
  initialVariant?: SponsorAdVariant
  className?: string
}

const isDev = process.env.NODE_ENV === "development"

export function SponsorAdSlab({
  initialVariant = "open-source",
  className,
}: SponsorAdSlabProps) {
  const [variant, setVariant] = React.useState<SponsorAdVariant>(initialVariant)
  const [stars, setStars] = React.useState<number | null>(null)

  React.useEffect(() => {
    const controller = new AbortController()

    async function fetchStars() {
      try {
        const res = await fetch("https://api.github.com/repos/satisium/ease", {
          signal: controller.signal,
          headers: { Accept: "application/vnd.github.v3+json" },
        })
        if (!res.ok) return
        const data = await res.json()
        if (
          typeof data?.stargazers_count === "number" &&
          data.stargazers_count > 0
        ) {
          setStars(data.stargazers_count)
        }
      } catch {
        // Silently swallow network errors, rate limits, or offline mode
      }
    }

    void fetchStars()

    return () => {
      controller.abort()
    }
  }, [])

  // In development only, clicking headline cycles through variants
  const handleToggleVariant = () => {
    if (!isDev) return
    setVariant((prev) => {
      if (prev === "open-source") return "rent-space"
      if (prev === "rent-space") return "satisium-ui"
      return "open-source"
    })
  }

  return (
    <section
      aria-label="Sponsor & Partner Placement"
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-[16px] bg-background p-4 transition-colors select-none",
        className
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <h3
          onClick={isDev ? handleToggleVariant : undefined}
          title={
            isDev ? "Click to cycle sponsor ad variant (dev only)" : undefined
          }
          className={cn(
            "font-heading text-xs font-semibold tracking-tight text-foreground",
            isDev && "cursor-pointer"
          )}
        >
          {variant === "open-source" && "Open Source · MIT"}
          {variant === "rent-space" && "Feature your product here"}
          {variant === "satisium-ui" && "Build faster with Satisium UI"}
        </h3>

        {/* Quiet GitHub star pill: only rendered if stars > 0 */}
        {variant === "open-source" && stars !== null && stars > 0 && (
          <span className="inline-flex items-center gap-1 rounded-[6px] bg-secondary px-1.5 py-0.5 font-sans text-[10px] font-medium text-foreground tabular-nums">
            <HugeiconsIcon
              icon={StarIcon}
              className="size-2.5 fill-[#e3b341] text-[#e3b341] [&_path]:fill-[#e3b341]"
            />
            {stars}
          </span>
        )}
      </div>

      {/* Body Copy */}
      <p className="font-sans text-[11px] leading-relaxed text-muted-foreground">
        {variant === "open-source" &&
          "Free, local-first, and built in the open. Star the repo, join Discord, or follow on X."}
        {variant === "rent-space" &&
          "Put your devtool, library, or SaaS directly inside the Ease studio where modern builders craft daily."}
        {variant === "satisium-ui" &&
          "Production-ready components, kinetic tokens, and fluid layout foundations crafted for design engineers."}
      </p>

      {/* Action Row */}
      <div className="pt-0.5">
        {variant === "open-source" && (
          <div className="flex flex-wrap items-center gap-1.5">
            <a
              href={PROJECT.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Star Satisium Ease on GitHub"
              className={cn(
                "inline-flex h-8 w-fit cursor-pointer items-center justify-center gap-1.5 rounded-[8px] bg-secondary px-3 font-heading text-[11px] font-medium text-foreground transition-colors hover:bg-muted",
                SATISIUM_PRESS_CLASS
              )}
            >
              <SiGithub className="size-3.5 fill-current text-foreground" />
              <span>Star on GitHub</span>
            </a>
            <a
              href={AUTHOR.discord}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Join Satisium Discord community"
              className={cn(
                "inline-flex h-8 w-fit cursor-pointer items-center justify-center gap-1.5 rounded-[8px] bg-muted px-2.5 font-heading text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                SATISIUM_PRESS_CLASS
              )}
            >
              <SiDiscord className="size-3.5 fill-[#5865F2] text-[#5865F2]" />
              <span>Discord</span>
            </a>
            <a
              href={AUTHOR.x}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Satishkumar on X"
              title="Follow @iamsatish4564 on X"
              className={cn(
                "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] bg-muted text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                SATISIUM_PRESS_CLASS
              )}
            >
              <SiX className="size-3 fill-current text-foreground" />
            </a>
          </div>
        )}

        {variant === "rent-space" && (
          <a
            href="mailto:satisiumhq@gmail.com?subject=Sponsor%20Satisium%20Ease"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Rent this space to sponsor Satisium Ease"
            className={cn(
              "inline-flex h-8 w-fit cursor-pointer items-center justify-center rounded-[8px] bg-secondary px-3 font-heading text-[11px] font-medium text-foreground transition-colors hover:bg-muted",
              SATISIUM_PRESS_CLASS
            )}
          >
            <span>Rent This Space</span>
          </a>
        )}

        {variant === "satisium-ui" && (
          <a
            href="https://ui.satisium.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Explore Satisium UI component library"
            className={cn(
              "inline-flex h-8 w-fit cursor-pointer items-center justify-center rounded-[8px] bg-secondary px-3 font-heading text-[11px] font-medium text-foreground transition-colors hover:bg-muted",
              SATISIUM_PRESS_CLASS
            )}
          >
            <span>Explore Satisium UI</span>
          </a>
        )}
      </div>
    </section>
  )
}
