# Satisium Ease — The Living Motion Curriculum & Documentation Blueprint (`EASE_DOCS_CURRICULUM.md`)

> **Document Type:** MDX Documentation Architecture, Tutorial Curriculum & Motion Best Practices  
> **Target Surface:** `/docs` (`content/docs/**/*.mdx`)  
> **Product:** Satisium Ease (`ease.satisium.com`)  
> **Parent Umbrella:** The Satisium Umbrella (`satisium`)  
> **Core Tenet:** _"Everything is Code. Context is Premium. Educate, Don't Dictate."_  
> **Primary Source:** [`EASE_PRODUCT_CONTEXT.md`](file:///home/satishkumar/Desktop/The%20Satisium%20Umbrella/ease/EASE_PRODUCT_CONTEXT.md) §1–§3  
> **Companion Source:** [`EASE_USER_FLOW.md`](file:///home/satishkumar/Desktop/The%20Satisium%20Umbrella/ease/EASE_USER_FLOW.md) §5 & [`archetype-laws.ts`](file:///home/satishkumar/Desktop/The%20Satisium%20Umbrella/ease/components/studio/modes/audition/right-flank/archetype-laws.ts)

---

## 1. The Vision: Ease as a "Living Document" for Motion

Traditional curve tools (`cubic-bezier.com`, `easings.net`) treat easing as an isolated math toy on a single pink box or 20px dot.

Ease was conceived as a **dual-engine experience**:

1. **The Workstation (`/app`):** An interactive kinetic sandbox for authoring, dueling, and exporting curves on real UI habitats.
2. **The Living Document (`/docs`):** An educational masterclass and tutorial library that teaches frontend engineers and design technologists **how motion actually behaves in production software**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EASE LIVING DOCUMENT TREE                       │
│                        (content/docs/**/*.mdx)                         │
├────────────────────────────────────────────────────────────────────────┤
│  1. FOUNDATIONS                                                        │
│     ├── The 2011 Relic Crisis (Why isolated dots fail)                │
│     ├── The Three Laws (Everything is Code, Context, Educate)         │
│     └── Anatomy of a Kinetic Curve                                     │
│  2. MATHEMATICS & ENGINES                                              │
│     ├── Cubic-Bézier Geometry & Velocity Slopes (f'(t))                │
│     ├── Analytical Differential Springs (m·x'' + c·x' + k·x = 0)       │
│     └── CSS linear() Spring Approximations                             │
│  3. PERCEPTUAL MOTION LAWS (BEST PRACTICES)                            │
│     ├── Asymmetric Transitions (Exits Faster than Entrances)           │
│     ├── Displacement-Aware Durations (Mass vs Screen Pixels)           │
│     ├── Multi-Channel Choreography & The Duration Integrity Law       │
│     └── Decoupled Lighting (Clamping Atmospheric Scrims)               │
│  4. UI ARCHETYPE RECIPES (TUTORIALS)                                   │
│     ├── Modals & Dialogs (Focal surface deceleration + backdrop fade)  │
│     ├── Navigation Drawers & Sheets (Edge slides & gesture inertia)    │
│     ├── Dropdowns & Command Palettes (Micro-response & arrival clamp)  │
│     ├── Accordions & Expanding Disclosures (Content reflow & judder)   │
│     ├── Toasts & Badges (Tactile overshoot & settling time)            │
│     └── Tab Switches & Carousels (Horizontal track pagination)         │
│  5. CODE GENERATION & PRODUCTION INTEGRATION                           │
│     ├── Modern CSS & Tailwind CSS v4 Themes                            │
│     ├── Motion (Framer Motion) Typed Transitions                       │
│     └── GSAP CustomEase & Mobile Targets (SwiftUI / Flutter)           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Chapter 1: The Foundations & The "2011 Relic Crisis"

### 2.1 The Incumbent Failure

Every digital product is judged by the fluid physics of its interactions. Yet, frontend teams and design technologists have been forced to rely on tools conceived over a decade ago:

1. **`cubic-bezier.com` (circa 2011):**  
   An isolated playground that animates a solitary pink box across an arbitrary 300px track. It has zero awareness of modern display refresh rates (120Hz ProMotion), responsive layout reflows, spring dynamics, or component hierarchies.
2. **`easing.net`:**  
   A static reference dictionary of mathematical curves visualized on microscopic 20px dots. It offers no interactive tuning on real UI structures or contextual feedback.
3. **Chrome DevTools Animation Drawer:**  
   A cramped panel buried layers deep inside browser inspectors. It is fragile, resets state on page reload, does not support analytical spring physics, and cannot export to modern design system token architectures (Tailwind, Framer Motion).

### 2.2 The Fatal Flaw of the Vacuum

In production software, motion never runs on an isolated pink square. Motion runs on **multi-layered UI systems**:

- Modals with layered backdrop blurs and focal scaling.
- Navigation drawers that displace neighboring page content.
- Cascading dropdown menus and nested accordions with layout reflow.
- Ephemeral toast notifications entering against high-velocity user actions.

When motion curves are crafted in an abstract sandbox, the mismatch between curve mathematics and physical screen displacement leads to "uncanny valley" UI: animations feel either floaty, harsh, sluggish, or disconnected from physical reality.

---

## 3. Chapter 2: The Core Perceptual Laws (Best Practices)

### 3.1 Law 1: Asymmetric Transitions (Exits Must Be Faster Than Entrances)

- **The Rule:** An exit transition must be **30%–50% faster** than its entrance counterpart.
- **The Human Perception Science:**
  - When an element **enters**, the user’s gaze needs time to acquire, parse, and comprehend the new surface. A deceleration curve (e.g. `cubic-bezier(0.16, 1, 0.3, 1)` or critically damped spring over 250–320ms) cushions arrival without jarring the eyes.
  - When an element **exits**, the user has already completed their task and dismissed it. Lingering exit animations feel unresponsive and block user flow. Exits should accelerate steeply (e.g. `cubic-bezier(0.7, 0, 0.84, 0)` or `expo-in` over 160–200ms).

### 3.2 Law 2: Displacement-Aware Durations

- **The Rule:** Duration and damping must scale with the physical pixel distance traveled on screen.
- **Why:** Motion speed equals distance divided by time ($v = \frac{d}{t}$).
  - A 200ms curve moving a 10px toggle feels snappy.
  - That same 200ms curve applied to a 450px sliding drawer results in an average velocity of 2,250px/sec—causing visual blur and disorientation.
- **Recommended Ranges:**
  - Micro-toggles / Checkboxes (2–16px): `80ms – 140ms`
  - Dropdowns / Popovers (16–80px): `140ms – 220ms`
  - Dialogs / Cards (focal scale $0.95 \to 1.0$): `200ms – 280ms`
  - Edge Sheets / Side Drawers (250–500px): `300ms – 420ms`

### 3.3 Law 3: The Duration Integrity Law

- **The Rule:** Swapping a motion curve preset on a property channel must **never overwrite** that channel's established choreographic duration.
- **Why:** In production component choreography, durations synchronize multiple layers (e.g., backdrop at 200ms, modal body at 280ms, buttons staggered by 40ms). Blindly overwriting durations when trying a new easing breaks multi-element harmony.

### 3.4 Law 4: Decoupled Atmospheric Lighting

- **The Rule:** Background dimmers, scrims, and blurs must remain monotonically clamped to $[0, 1]$ and never bounce.
- **Why:** Backdrops represent environmental lighting. Oscillating opacity creates a strobe/flashing effect that strains visual ergonomics. When using a spring on a modal, apply the bouncy spring to translation/scale, but keep the backdrop on a calm cubic deceleration.

---

## 4. Chapter 3: Analytical Spring Physics & Mathematics

### 4.1 The Second-Order Differential Equation

Unlike Béziers, springs have no fixed timeline. Motion is governed by continuous Newtonian physics:
$$m \frac{d^2x}{dt^2} + c \frac{dx}{dt} + k x = 0$$

- **Mass ($m$):** The weight of the virtual UI element. Controls inertia.
- **Stiffness ($k$):** The tension of the virtual spring. Controls acceleration towards the target.
- **Damping ($c$):** The friction of the system. Absorbs kinetic energy.
- **Initial Velocity ($v_0$):** Starting speed, crucial for smooth mid-gesture releases (e.g., swipe to close).

### 4.2 Damping Classification ($\zeta$)

The behavior of every spring is classified by its **damping ratio** $\zeta$:
$$\zeta = \frac{c}{2\sqrt{m \cdot k}}$$

1. **Underdamped ($\zeta < 1.0$):** Oscillates back and forth across the target before resting.
   - _Best for:_ Playful badges, celebratory toasts, tactile toggle snaps.
   - _Avoid on:_ Large modals, navigation drawers, dense data tables.
2. **Critically Damped ($\zeta = 1.0$):** The mathematical sweet spot. Reaches equilibrium in the shortest possible time with **zero overshoot**.
   - _Best for:_ High-frequency enterprise UI, command menus, professional mobile gestures (iOS standard).
3. **Overdamped ($\zeta > 1.0$):** Sluggish, non-oscillating return to rest.
   - _Best for:_ Heavy inertial trays, fluid drawers, calm reading interfaces.

### 4.3 Settling Time ($t_s$) vs. Perceptual Arrival ($t_{95}$)

- **$t\_{95}$:** Time required to reach 95% of target displacement (when the human eye perceives the action as "arrived").
- **$t_s$ (Settling Time):** Time until all oscillations remain within a tight 0.5% perceptual threshold.
- _Best practice:_ Keep the delta between $t_{95}$ and $t_s$ minimal (< 150ms). If a spring arrives at 200ms but continues imperceptible sub-pixel vibrations for 900ms, it drains device battery and locks CPU/GPU threads unnecessarily.

---

## 5. Chapter 4: UI Archetype Tutorial Guides

### 5.1 Dialogs & Modals

- **Role:** Focal Surface Lock.
- **Choreography:**
  - _Entrance:_ Scale ($0.95 \to 1.0$), Opacity ($0 \to 1$), subtle Y-translate ($16\text{px} \to 0\text{px}$). Duration: `220–320ms`. Easing: Decelerated cubic or critically damped spring ($\zeta \ge 0.85$).
  - _Exit:_ Swift acceleration clearing the screen. Duration: `160–220ms`. Easing: Steep cubic (`expo-in`).
  - _Backdrop:_ Gentle linear or cubic fade (`280–380ms`), zero bounce.

### 5.2 Navigation Drawers & Bottom Sheets

- **Role:** Edge Sheet Slide.
- **Choreography:**
  - High spatial travel ($300–500\text{px}$).
  - _Entrance:_ Long-arc deceleration (`300–450ms`) mimicking high physical inertia.
  - _Exit:_ Direct edge dismissal (`220–300ms`).
  - _Touch Gesture Rule:_ Bound to swipe velocity; release should inherit $v_0$ from the pointer.

### 5.3 Dropdown Menus & Popovers

- **Role:** Micro-Interaction.
- **Choreography:**
  - Small displacement ($8–24\text{px}$).
  - _Entrance:_ Fast arrival (`140–200ms`) with immediate visibility. Users click dropdowns to take immediate action; any delay feels obstructive.
  - _Exit:_ Near-instant dismissal (`100–160ms`).

### 5.4 Tactile Buttons & Toggles

- **Role:** Tactile Press.
- **Choreography:**
  - Scale compression on press ($1.0 \to 0.96$).
  - _Press down:_ `80–120ms` high-stiffness spring.
  - _Release up:_ `100–160ms` snappy recovery.

### 5.5 Toast Notifications

- **Role:** Ephemeral Alert.
- **Choreography:**
  - Entrance from edge with playful overshoot ($4\% - 8\%$).
  - Duration: `320–420ms`. Spring: `stiffness: 300, damping: 20` for a friendly, energetic bounce.

---

## 6. Chapter 5: CSS `linear()` & Modern Implementation Guide

### 6.1 Why CSS `linear()` Matters

Historically, if a designer wanted spring physics on the web, they had to pull in JavaScript animation libraries (Framer Motion, React Spring, GSAP).

The modern CSS `linear()` timing function solves this:

- It samples continuous spring differential equations into an optimized piecewise-linear curve.
- It executes **100% on the browser's compositor thread**.
- Zero JavaScript bundle overhead, zero hydration lag, 120fps smooth on mobile.

Ease automatically calculates the Ramer-Douglas-Peucker (RDP) quantized keypoints for any spring, outputting clean, copy-pasteable CSS.
