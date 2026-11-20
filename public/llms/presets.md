# Curve Presets

> Curated catalog of standardized cubic-bezier curves and analytical spring dynamics.

## What presets are included in Satisium Ease?

Satisium Ease ships with 61 production-calibrated curves spanning industry standards (CSS, Material Design 3, Apple Human Interface, Tailwind v4) and physical springs. Every preset is tuned to provide organic deceleration and predictable settling times across real UI components.

## Standard Cubic-Bézier Presets

- **Swift In-Out:** `cubic-bezier(0.4, 0.0, 0.2, 1.0)` — Symmetrical acceleration and deceleration calibrated for modals, full-page navigation, and layout reflows.
- **Snappy Out:** `cubic-bezier(0.16, 1.0, 0.3, 1.0)` — Fast initial impulse with elongated, gentle deceleration for dropdown menus, tooltips, and hover cards.
- **Emphasized:** `cubic-bezier(0.2, 0.0, 0.0, 1.0)` — High-energy dramatic curve designed for primary action triggers and hero sheet reveals.

## Calibrated Spring Presets

- **Bouncy ($m: 1, k: 180, c: 12$):** Underdamped spring with controlled overshoot for playful micro-interactions, badge bumps, and celebration toasts.
- **Gentle ($m: 1, k: 120, c: 18$):** Moderately damped trajectory with near-zero overshoot for natural sheet slide-outs, accordion drawers, and focus rings.
- **Wobbly ($m: 1, k: 240, c: 8$):** Multi-cycle resonant spring designed for attention-seeking indicators, playful pulls, and kinetic physics demonstrations.
