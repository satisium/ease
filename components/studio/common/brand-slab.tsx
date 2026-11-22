"use client"

import * as React from "react"
import { SatisiumLogo } from "@/components/satisium-logo"

export function BrandSlab() {
  return (
    <header
      aria-label="Studio Brand Lockup"
      className="flex shrink-0 flex-col select-none"
    >
      {/* BRAND CHASSIS: DUAL-BOX (BOX-IN-BOX) WITH CONCAVE INVERSE FILLETS */}
      <div className="flex flex-col items-end">
        {/* The Outer Box Chassis: Ultra-thin subtle brand razor bezel */}
        <div className="flex w-full flex-col rounded-[14px] bg-brand p-0.5 transition-colors">
          {/* The Inner Box Slab: Elevated height with prominent brand lockup */}
          <div className="flex h-12 w-full items-center justify-between rounded-[12px] bg-background px-3.5 transition-colors">
            <div className="flex items-center gap-2.5">
              <SatisiumLogo
                size={28}
                primaryColor="#f8f8f8"
                className="shrink-0"
              />
              <span className="font-heading text-base font-semibold tracking-tight text-foreground">
                Ease
              </span>
            </div>
            <span className="font-sans text-[11px] font-normal text-muted-foreground">
              v1.0
            </span>
          </div>
        </div>

        {/* Satisium Folded Architectural Index Tab with Continuous Inverse Fillets */}
        <div className="relative -mt-px mr-3.5 inline-flex h-6 items-center justify-center rounded-b-[7px] bg-brand px-3 text-brand-foreground select-none">
          {/* Left Concave Inverse Fillet */}
          <svg
            className="pointer-events-none absolute top-0 right-full h-2 w-2"
            viewBox="0 0 8 8"
            fill="none"
            style={{ fill: "var(--brand)" }}
            aria-hidden="true"
          >
            <path d="M0 0 A 8 8 0 0 1 8 8 L 8 0 Z" />
          </svg>

          {/* Right Concave Inverse Fillet */}
          <svg
            className="pointer-events-none absolute top-0 left-full h-2 w-2"
            viewBox="0 0 8 8"
            fill="none"
            style={{ fill: "var(--brand)" }}
            aria-hidden="true"
          >
            <path d="M0 8 A 8 8 0 0 1 8 0 L 0 0 Z" />
          </svg>

          <span className="font-sans text-[10px] leading-none tracking-tight">
            <span className="font-normal opacity-90">A tool by </span>
            <span className="font-bold tracking-normal">Satisium</span>
          </span>
        </div>
      </div>
    </header>
  )
}
