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
