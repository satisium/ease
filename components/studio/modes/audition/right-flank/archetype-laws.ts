export interface RecommendedCurve {
  id: string
  label: string
  engine: "bezier" | "spring"
  why: string
}

export interface BestPracticeSpec {
  id: string
  name: string
  guideline: string
  targetDuration: string
  targetDurationIn?: string
  targetDurationOut?: string
  bounce: string
  recommended?: RecommendedCurve[]
  recommendedIn?: RecommendedCurve[]
  recommendedOut?: RecommendedCurve[]
}

export interface KineticRoleSpec {
  role: string
  label: string
  guideline: string
  targetDurationIn: string
  targetDurationOut: string
  recommendedIn: RecommendedCurve[]
  recommendedOut: RecommendedCurve[]
}

export const BEST_PRACTICES: Record<string, BestPracticeSpec> = {
  dialog: {
    id: "dialog",
    name: "Dialog",
    guideline:
      "Dialogs feel most natural with asymmetric motion: progressive scale deceleration on arrival, and swift acceleration on dismissal.",
    targetDuration: "In: 220–320ms · Out: 160–220ms",
    targetDurationIn: "220–320ms",
    targetDurationOut: "160–220ms",
    bounce: "Minimal (≤ 2%)",
    recommendedIn: [
      {
        id: "modal-sheet",
        label: "Modal Sheet",
        engine: "bezier",
        why: "Balanced cubic deceleration absorbing dialog mass smoothly.",
      },
      {
        id: "power2-out",
        label: "Power2 Out",
        engine: "bezier",
        why: "Smooth quadratic deceleration for subtle dialog reveals.",
      },
      {
        id: "ios-fluid",
        label: "Fluid (iOS)",
        engine: "spring",
        why: "High natural frequency spring for modern mobile OS feel.",
      },
    ],
    recommendedOut: [
      {
        id: "modal-sheet-exit",
        label: "Exit Swift",
        engine: "bezier",
        why: "Steep cubic acceleration clearing the dialog without visual linger.",
      },
      {
        id: "expo-in",
        label: "Expo In",
        engine: "bezier",
        why: "Exponential acceleration for snappy, instant dismissal.",
      },
      {
        id: "ease-in",
        label: "Ease In",
        engine: "bezier",
        why: "Natural cubic acceleration mimicking physical gravity falloff.",
      },
    ],
  },
}

// Aliases for backward compatibility
BEST_PRACTICES.modal = BEST_PRACTICES.dialog

export const KINETIC_ROLE_LAWS: Record<string, KineticRoleSpec> = {
  "Atmospheric Scrim": {
    role: "Atmospheric Scrim",
    label: "Backdrop Scrim",
    guideline:
      "Atmospheric lighting change. Decouple from focal surface travel — use a gentle, continuous deceleration or linear transition (280–380ms) with zero overshoot to prevent strobe effect.",
    targetDurationIn: "280–380ms",
    targetDurationOut: "180–240ms",
    recommendedIn: [
      {
        id: "material-decelerate",
        label: "Material Decel",
        engine: "bezier",
        why: "Gentle cubic deceleration fading in the backdrop smoothly without competing with card entry.",
      },
      {
        id: "power2-out",
        label: "Power2 Out",
        engine: "bezier",
        why: "Natural quadratic opacity curve mimicking gradual ambient dimming.",
      },
      {
        id: "cinematic",
        label: "Cinematic",
        engine: "bezier",
        why: "Subtle slow-reveal easing for theatrical, deep backdrops.",
      },
    ],
    recommendedOut: [
      {
        id: "expo-in",
        label: "Expo In",
        engine: "bezier",
        why: "Exponential acceleration clearing the dark scrim swiftly so background content is restored.",
      },
      {
        id: "ease-in",
        label: "Ease In",
        engine: "bezier",
        why: "Standard cubic acceleration for clean, predictable dismissals.",
      },
      {
        id: "linear",
        label: "Linear",
        engine: "bezier",
        why: "Uniform fade-out without abrupt acceleration spikes.",
      },
    ],
  },
  "Focal Surface Lock": {
    role: "Focal Surface Lock",
    label: "Focal Surface",
    guideline:
      "The primary interactive layer. Demands high mass damping (critically damped spring or cubic deceleration 220–300ms) so users perceive solid physical arrival rather than floating geometry.",
    targetDurationIn: "220–320ms",
    targetDurationOut: "160–220ms",
    recommendedIn: [
      {
        id: "modal-sheet",
        label: "Modal Sheet",
        engine: "bezier",
        why: "Balanced cubic deceleration absorbing dialog spatial mass smoothly.",
      },
      {
        id: "ios-fluid",
        label: "Fluid (iOS)",
        engine: "spring",
        why: "Critically damped physics with zero bounce for authoritative UI landing.",
      },
      {
        id: "gentle",
        label: "Gentle Spring",
        engine: "spring",
        why: "Slight soft deceleration settling into place with high tactile polish.",
      },
    ],
    recommendedOut: [
      {
        id: "expo-in",
        label: "Expo In",
        engine: "bezier",
        why: "Steep exponential acceleration clearing the screen instantly without visual linger.",
      },
      {
        id: "modal-sheet-exit",
        label: "Exit Swift",
        engine: "bezier",
        why: "Steep cubic acceleration clearing the dialog purposefully.",
      },
      {
        id: "ease-in",
        label: "Ease In",
        engine: "bezier",
        why: "Natural gravitational acceleration dismissing downwards.",
      },
    ],
  },
  "Tactile Press": {
    role: "Tactile Press",
    label: "Tactile Press",
    guideline:
      "Instant micro-interaction feedback. Requires high-stiffness springs or ultra-fast cubic deceleration (80–140ms) that responds immediately to finger or cursor pressure.",
    targetDurationIn: "80–140ms",
    targetDurationOut: "100–160ms",
    recommendedIn: [
      {
        id: "quick-spring",
        label: "Quick Spring",
        engine: "spring",
        why: "Immediate snappy spring mimicking tactile button switch travel.",
      },
      {
        id: "power4-out",
        label: "Power4 Out",
        engine: "bezier",
        why: "Extremely steep initial response for instantaneous compression.",
      },
      {
        id: "ease-out",
        label: "Ease Out",
        engine: "bezier",
        why: "Standard immediate feedback.",
      },
    ],
    recommendedOut: [
      {
        id: "quick-spring",
        label: "Quick Spring",
        engine: "spring",
        why: "Snappy release restoring original scale without perceptible lag.",
      },
      {
        id: "expo-out",
        label: "Expo Out",
        engine: "bezier",
        why: "Fast physical release.",
      },
      {
        id: "linear",
        label: "Linear",
        engine: "bezier",
        why: "Direct mechanical release.",
      },
    ],
  },
  "Edge Sheet Slide": {
    role: "Edge Sheet Slide",
    label: "Sheet Slide",
    guideline:
      "Full edge travel bound to gesture physics. Requires heavier mass and progressive deceleration to mimic real-world inertia moving a physical tray.",
    targetDurationIn: "300–450ms",
    targetDurationOut: "220–300ms",
    recommendedIn: [
      {
        id: "drawer-physics",
        label: "Drawer Physics",
        engine: "bezier",
        why: "Custom curve tuned specifically for sliding sheets.",
      },
      {
        id: "ios-fluid",
        label: "Fluid (iOS)",
        engine: "spring",
        why: "High natural frequency spring for smooth sheet anchoring.",
      },
      {
        id: "material-decelerate",
        label: "Material Decel",
        engine: "bezier",
        why: "Long-arc deceleration for wide spatial travel.",
      },
    ],
    recommendedOut: [
      {
        id: "expo-in",
        label: "Expo In",
        engine: "bezier",
        why: "Swift dismissal off the screen edge.",
      },
      {
        id: "ease-in",
        label: "Ease In",
        engine: "bezier",
        why: "Smooth downward gravity slide.",
      },
      {
        id: "power2-in",
        label: "Power2 In",
        engine: "bezier",
        why: "Gentle acceleration exiting the screen.",
      },
    ],
  },
  "Track Pagination": {
    role: "Track Pagination",
    label: "Track Pagination",
    guideline:
      "Horizontal track pagination. Requires symmetric or critically damped easing so content slides cleanly and snaps into viewport alignment without overshoot disorientation.",
    targetDurationIn: "250–350ms",
    targetDurationOut: "250–350ms",
    recommendedIn: [
      {
        id: "material-standard",
        label: "Material Std",
        engine: "bezier",
        why: "Balanced S-curve deceleration for horizontal panning.",
      },
      {
        id: "power2-in-out",
        label: "Power2 In-Out",
        engine: "bezier",
        why: "Smooth start and finish for card carousel pagination.",
      },
      {
        id: "gentle",
        label: "Gentle Spring",
        engine: "spring",
        why: "Natural momentum settling onto the active card slot.",
      },
    ],
    recommendedOut: [
      {
        id: "material-standard",
        label: "Material Std",
        engine: "bezier",
        why: "Consistent pagination travel easing.",
      },
      {
        id: "power2-in-out",
        label: "Power2 In-Out",
        engine: "bezier",
        why: "Smooth exit.",
      },
      {
        id: "ease-in-out",
        label: "Ease In-Out",
        engine: "bezier",
        why: "Standard S-curve.",
      },
    ],
  },
}
