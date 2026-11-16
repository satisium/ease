import type { Transition, Variants } from "motion/react"

/** Mirrors the CSS tokens in globals.css (--duration-*). Change both together. */
export const DURATION = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.35,
  display: 0.6,
} as const

/** Mirrors --ease-* (as cubic-bezier tuples for Motion/GSAP). */
export const EASE: Record<
  "outExpo" | "inOut" | "snap" | "springOut" | "cinematic",
  [number, number, number, number]
> = {
  outExpo: [0.16, 1, 0.3, 1],
  inOut: [0.4, 0, 0.2, 1],
  snap: [0.2, 1, 0.2, 1],
  springOut: [0.3, 1.5, 0.5, 1],
  /** Cinematic Filmic Curve: zero jerk from rest, majestic acceleration, and ultra-silky asymptotic coast. */
  cinematic: [0.65, 0, 0.076, 1],
}

/** Named springs. Never inline these numbers in a component. */
export const SPRING: Record<
  "card" | "snappy" | "pill" | "soft" | "gentle" | "fluid",
  Transition
> = {
  /** Docs card + rail — the signature spatial motion. */
  card: { type: "spring", stiffness: 380, damping: 38, mass: 0.8 },
  /** ActionButton success swap, toolbars. */
  snappy: { type: "spring", stiffness: 500, damping: 30 },
  /** Active indicators (`layoutId` pills). */
  pill: { type: "spring", stiffness: 350, damping: 30 },
  /** Gentle entrances. */
  soft: { type: "spring", stiffness: 260, damping: 30 },
  /** Floating badges, video expanders. */
  gentle: { type: "spring", stiffness: 120, damping: 14 },
  /** Fluid kinetic scrub with physical mass, trailing lag, and momentum coast. */
  fluid: { type: "spring", stiffness: 85, damping: 24, mass: 1.4 },
}

/** Standard presets. Reduced motion is handled globally by <MotionConfig reducedMotion="user">
 *  (main spec §21.1), so components never branch on the OS setting themselves. */
export const FADE_IN: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const SLIDE_UP: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
}

/** Parent for staggered lists: <motion.ul variants={{ transition: { staggerChildren: 0.03 } }}> */
export const STAGGER_CHILDREN = 0.03

/** Canonical Satisium Shell Motion Grammar ("Quiet Precision") */
export const SATISIUM_EASE_DECEL = [0.16, 1, 0.3, 1] as const
export const SATISIUM_EASE_QUINT = [0.22, 1, 0.36, 1] as const
export const SATISIUM_EASE_ACCEL = [0.4, 0, 1, 1] as const
export const SATISIUM_IOS_SHEET_EASE = [0.32, 0.72, 0, 1] as const

export const SATISIUM_SPRING_PILL = {
  type: "spring",
  stiffness: 460,
  damping: 34,
  mass: 0.8,
} as const

export const SATISIUM_CASSETTE_TRANSITION = {
  duration: 0.34,
  ease: SATISIUM_EASE_DECEL,
} as const

export const SATISIUM_STAGE_MORPH_TRANSITION = {
  duration: 0.26,
  ease: SATISIUM_EASE_QUINT,
} as const

export const SATISIUM_FLANK_SLIDE_TRANSITION = {
  duration: 0.38,
  ease: SATISIUM_IOS_SHEET_EASE,
} as const

export const SATISIUM_LEFT_COLLAPSE_TRANSITION = {
  duration: 0.42,
  ease: SATISIUM_IOS_SHEET_EASE,
} as const

export const SATISIUM_STAGE_SLIDE_TRANSITION = {
  duration: 0.46,
  ease: SATISIUM_IOS_SHEET_EASE,
} as const

export const SATISIUM_CARD_POP_VARIANTS = {
  initial: { opacity: 0, scale: 0.88, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.2, ease: SATISIUM_EASE_DECEL },
  },
  exit: {
    opacity: 0,
    scale: 0.88,
    filter: "blur(4px)",
    transition: { duration: 0.14, ease: SATISIUM_EASE_ACCEL },
  },
} as const

export const SATISIUM_POPOVER_VARIANTS = {
  initial: { opacity: 0, scale: 0.95, y: 4, filter: "blur(2px)" },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.15, ease: SATISIUM_EASE_DECEL },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 2,
    filter: "blur(2px)",
    transition: { duration: 0.11, ease: SATISIUM_EASE_ACCEL },
  },
} as const

export const SATISIUM_MODAL_TRANSITION = {
  enter: { duration: 0.22, ease: SATISIUM_EASE_DECEL },
  exit: { duration: 0.14, ease: SATISIUM_EASE_ACCEL },
} as const

export const SATISIUM_PRESS_CLASS =
  "transition-transform duration-100 ease-out active:scale-[0.97]"
