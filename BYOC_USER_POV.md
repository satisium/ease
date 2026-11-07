# Satisium Ease: Bring Your Own Component (BYOC) & Kinetic Architecture

> **Document Reference:** `BYOC_USER_POV.md`  
> **Status:** Living Master Specification & North Star Blueprint  
> **Parent Umbrella:** The Satisium Umbrella (`satisium`)  
> **Author & Design Director:** Satishkumar (`@iamsatish4564`)  
> **Core Tenet:** _"Everything is Code. Context is Premium. Educate, Don't Dictate."_

---

## Table of Contents

1. **Chapter 1: Executive Vision & Core Thesis**
2. **Chapter 2: User Persona & Environmental Context**
3. **Chapter 3: Act I — The Pain of the Status Quo (Today's Reality)**
4. **Chapter 4: Act II — The Complete Satisium Ease Experience (The Target State)**
5. **Chapter 5: Architectural Gap Analysis (Current Codebase vs. Target State)**
6. **Chapter 6: The 5-Phase Engineering Implementation Roadmap**
7. **Chapter 7: Definition of Done & Quality Acceptance Criteria**

---

## Chapter 1: Executive Vision & Core Thesis

### 1.1 The Incumbent Failure: The 2011 Relic Crisis

Every modern digital product is judged by the fluid physics of its motion. Yet, when designers and frontend engineers need to craft, tune, or inspect motion curves, they are forced to use web tools conceived more than a decade ago:

- **`cubic-bezier.com` (circa 2011):** An isolated playground that animates a solitary pink box across a 300px track. It has no concept of modern screen densities, layout reflow, spring dynamics, or component choreography.
- **`easing.net`:** A static reference dictionary of mathematical curves visualized on microscopic 20px dots. It offers no interactive auditioning on real layout structures.
- **Chrome DevTools Animation Drawer:** A cramped, fragile inspection panel buried three layers deep in browser style inspectors that resets on page refresh and cannot simulate spring physics.

These legacy tools suffer from a fatal assumption: **they treat animation as an isolated mathematical curve running on an abstract geometric shape.**

In modern production software, motion never runs on an isolated pink square. Motion runs on **complex, multi-layered UI systems**—modals with backdrop blurs, navigation drawers with nested list items, sticky headers, interactive carousels, and high-density data dashboards. When motion is evaluated outside of its real contextual environment, human perception is deceived. A curve that looks snappy on a 50px dot feels jarring and violent on a 400px navigation drawer.

---

### 1.2 The UX Moat: Craft in the Age of AI

We have entered an era where generative AI models can generate 500 lines of functional React, Tailwind, or CSS boilerplate in seconds. Code generation has become a commodity.

Therefore, **user experience (UX), micro-tactile feel, and emotional polish are the definitive moats of modern software.**

An AI model cannot _feel_ whether a sheet arrives with 2% too much bounce. An AI model cannot judge whether a drawer dismisses quickly enough to yield focus back to a work surface without visual lingering.

Satisium Ease is designed to be the high-precision instrument where human taste, kinetic physics, and software engineering converge. It does not replace the designer’s taste; it equips them with a surgical, 60fps tactile workstation to master it.

---

### 1.3 The Core Satisium Philosophy

Satisium Ease is built on three unshakeable laws:

1. **"Everything is Code":** Motion is not an abstract video export from After Effects. Motion in Ease is mathematical truth—executable cubic-bezier vectors and analytical differential spring equations ($m \cdot x'' + c \cdot x' + k \cdot x = 0$) that translate 1:1 into production code.
2. **"Context is Premium":** Evaluating a curve in a vacuum is useless. Motion must be auditioned inside its natural habitat—tested on real component archetypes, with real typography, realistic dimensions, responsive viewports, and live user interactions.
3. **"Educate, Don't Dictate":** The studio must never impose artificial dogmatic constraints. We group curves educationally (e.g. _Recommended Entrance_ vs. _Recommended Exit_ with target duration sweet-spots) to build kinetic intuition, but we grant designers complete liberal freedom to cross-pollinate, override, and experiment with any curve in any slot.

---

### 1.4 The Universal Bind Protocol Defined

To bridge the chasm between abstract mathematical curves and living production code, Satisium Ease introduces the **Universal Bind Protocol (BYOC: Bring Your Own Component)**.

Instead of forcing users to squeeze multi-file repositories into an in-browser code editor, Ease operates on the universal substrate of the web: **The Live DOM via CSS Custom Properties and Data Attributes.**

The protocol follows five effortless gestures:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      THE UNIVERSAL BIND PROTOCOL                       │
├────────────────────────────────────────────────────────────────────────┤
│  1. POINT   ──► Click the ⌖ crosshair on any element in your app.      │
│  2. BIND    ──► Name the motion track (e.g., `sidebar`, `bell`).       │
│  3. AUDITION──► Test presets, adjust physics, and scrub in slow-mo.    │
│  4. DUEL    ──► Benchmark 2–3 curves side-by-side on your live UI.     │
│  5. EXPORT  ──► 1-click copy clean tokens (Tailwind, CSS, Framer, GSAP)│
└────────────────────────────────────────────────────────────────────────┘
```

By decoupling the kinetic engine from specific framework implementations, Satisium Ease works natively with **any web framework** (React, Vue, Svelte, Tailwind, Framer Motion, GSAP, or plain HTML).

It elevates Satisium Ease from a simple curve visualizer into the industry-standard **Motion Design Workstation**.

---

### 1.5 The Reverse-Engineering & Discovery Loop: "The Shazam for Motion"

Motion tools cannot merely be export engines; they must be **two-way diagnostic and discovery instruments**.

1. **The Smart Ease Importer ("Paste to Reverse-Engineer"):**  
   Developers constantly encounter curves already running in production—legacy CSS strings, Framer Motion transition objects, or Figma bezier coordinates. Ease provides an intelligent auto-detecting parser that ingests any raw code format, reverse-engineers its differential velocity slope $f'(t)$, computes its settle time, and instantly visualizes it on live components.
2. **The Motion Eyedropper (Web Extraction):**  
   Just as designers use _ColorZilla_ to sample colors from any website or _WhatFont_ to identify typography, Satisium Ease introduces the **Motion Eyedropper**. Users can point to any animated dropdown, modal, or drawer on the open web (Stripe, Apple, Linear, Raycast), extract its exact cubic-bezier timing function and duration in one click, and import it directly into Ease to audition, benchmark, and adopt into their own design system.

The complete kinetic loop is established:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   THE COMPLETE KINETIC LIFECYCLE                       │
├────────────────────────────────────────────────────────────────────────┤
│  1. DISCOVER / STEAL  ──► Reverse-engineer any curve from the live web │
│  2. IMPORT / PASTE    ──► Parse raw CSS, Framer, Spring, or Tailwind   │
│  3. AUDITION & TWEAK  ──► Test on Archetypes or your own Dashboard     │
│  4. DUEL BENCHMARK    ──► A/B test 3 curves side-by-side in parallel   │
│  5. PRODUCTION EXPORT ──► 1-click copy clean tokens for your team      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Chapter 2: User Persona & Environmental Context

### 2.1 The Persona: Maya, Lead Design Technologist

To design a professional tool, we must anchor our architecture in the daily habits, cognitive load, and frustrations of an elite practitioner.

- **Name:** Maya Lin
- **Title:** Lead Design Technologist / Staff Frontend Engineer at an enterprise SaaS company (_PulseHQ_).
- **Role & Responsibility:** Maya owns the design system implementation. She bridges the gap between the Product Design team (working in Figma) and the Core Engineering team (shipping production Next.js/TypeScript code). She is the gatekeeper of perceived performance, tactile feel, and kinetic brand identity.
- **Psychographic Profile:**
  - **Obsessed with Frame Budgets:** She refuses to tolerate layout stutter, jank, or Cumulative Layout Shift (CLS). She measures transitions in milliseconds.
  - **Anti-Gimmick:** She despises gratuitous, flashy bounces that slow users down. She values invisible, purposeful motion that directs focus and conveys spatial orientation.
  - **Tooling Cynic:** She is exhausted by "developer tools" that require complex CLIs, heavy npm dependencies, or proprietary config files just to test a simple design tweak.

---

### 2.2 The Professional Workspace Setup

Maya's physical and digital workstation represents the modern high-performance engineering environment:

```
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│     MONITOR 1 (LEFT)    │  │    MONITOR 2 (CENTER)   │  │   MONITOR 3 (RIGHT)     │
│       Figma Canvas      │  │      VS Code / Cursor   │  │   Satisium Ease Studio  │
│                         │  │                         │  │                         │
│  • Brand motion spec    │  │  • Multi-file codebase  │  │  • The kinetic motion   │
│  • Target durations     │  │  • `pnpm dev` running   │  │    laboratory running   │
│  • Wireframe prototypes │  │    on `localhost:5173`  │  │    at 60fps             │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
```

1. **Monitor 1 (Left): Figma Design System & Prototype.**  
   Displays the product specs, user journeys, brand guidelines, and design tokens defined by her design director.
2. **Monitor 2 (Center): VS Code with Production Codebase.**  
   Her local development server running Next.js, Tailwind CSS v4, TypeScript, and Framer Motion at `http://localhost:5173/dashboard`. The code is spread across dozens of modular directories (`components/ui/*`, `components/dashboard/*`, `hooks/*`, `lib/*`).
3. **Monitor 3 (Right): Satisium Ease Studio.**  
   Her active motion laboratory running at `http://localhost:3000/app`. This is where she tests, tunes, visualizes, and stress-tests curves before committing them to the design system.

---

### 2.3 The Target Project: The Enterprise Analytics Dashboard

Maya is not building a toy demo. She is responsible for the motion architecture of a high-density, multi-surface enterprise analytics dashboard (_PulseHQ_).

The dashboard is composed of more than 20 modular files and contains **12 distinct, concurrent animation instances**:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PULSEHQ ENTERPRISE DASHBOARD                          │
├───────────────────┬─────────────────────────────────────────────────────────────┤
│ 1. SIDEBAR        │ 2. HEADER: [3. ⌘K Search] [4. Bell 🔔] [5. Profile Menu ⌄]   │
│    Collapse/Expand│    Backdrop & Scale        Wiggle Pop     Origin Scale Drop │
│    Width transit  ├─────────────────────────────────────────────────────────────┤
│                   │ 6. STATS ROW: [Metric Card 1] [Metric Card 2] [Metric Card 3]│
│                   │    Hover Lift + Border Glow + Number Counter Spring         │
│                   ├─────────────────────────────────────────────────────────────┤
│                   │ 7. ANALYTICS CHART: SVG Trendline Path Draw-in              │
│                   │    Dynamic Stroke Dashoffset Sweep                          │
│                   ├─────────────────────────────────────────────────────────────┤
│                   │ 8. DATA TABLE: [Row 1] [Row 2] [Row 3]                      │
│                   │    Row Hover Slide-in Action Badges                         │
│                   ├─────────────────────────────────────────────────────────────┤
│                   │ 9. ACTIONS: [Delete Modal]  [10. Filter Sheet] [11. Toggle] │
│                   │    Asymmetric Arrival/Exit    Right Edge Slide    Thumb Flip│
│                   │                                                             │
│                   │ 12. TOAST CONTAINER: Top-Right Notification Snap + Settle   │
└───────────────────┴─────────────────────────────────────────────────────────────┘
```

#### Detailed Breakdown of the 12 Kinetic Instances:

1. **Sidebar Collapse / Expand:** A 280px horizontal width translation coupled with label cross-fades. Must feel rigid and critically damped against the left edge.
2. **Notification Bell Indicator:** An alert badge pop and subtle rotational wiggle when new metrics arrive.
3. **Command Palette (⌘K) Window:** A center-anchored dialog requiring an immediate backdrop fade and smooth scale deceleration ($0.96 \to 1.0$).
4. **Command Palette Search Results:** A 16ms staggered cascade entrance for search result items.
5. **User Profile Dropdown Menu:** A rapid popover expanding from its anchor button top-right origin ($<180\text{ms}$).
6. **Key Metric Cards:** Micro-tactile elevation on hover (translate-Y $-2\text{px}$ + shadow expansion).
7. **Interactive Chart Trendline:** An SVG path stroke draw-in executing an ease-in-out curve over 600ms on first load.
8. **Data Table Action Pills:** Slide-in quick actions on row hover that must not cause table layout reflow.
9. **Delete Confirmation Dialog:** An asymmetric lifecycle component: progressive scale deceleration on arrival, explosive acceleration on dismissal.
10. **Advanced Filter Sheet:** A 420px drawer sliding in from the right viewport boundary with zero border overshoot.
11. **Dark/Light Theme Toggle:** A tactile mechanical toggle switch thumb sliding between detents.
12. **Feedback Toast Banner:** An edge drop ($Y$) with slight friendly underdamped rebound ($\le 3\%$) that settles into the top-right stack.

---

### 2.4 The Challenge Maya Faces

Maya’s challenge is **systemic harmony**.

Each of these 12 animation moments cannot exist in isolation. If the sidebar uses a sluggish 400ms ease, while the dropdown uses a manic 120ms snap, the product feels disjointed and cheap.

She needs a tool that lets her inspect **individual tracks with surgical precision**, while simultaneously allowing her to **observe and benchmark how all 12 animations feel together on her real, living dashboard.**

---

## Chapter 3: Act I — The Pain of the Status Quo (Today's Reality)

To understand why the "Universal Bind Protocol" is necessary, we must walk through Maya’s actual Tuesday afternoon attempting to calibrate the motion of PulseHQ’s dashboard using today’s state-of-the-art tools.

---

### 3.1 The Generic Sandbox Trap: The Disconnect from Real Mass

Maya sits at her desk trying to tune the **Sidebar Collapse** (Track #1). She opens a motion curve tool.

Immediately, she encounters the first wall:

- The tool presents her with a single generic **Modal Dialog** (or worse, a 50px pink square or bouncing dot).
- Maya plays with cubic bezier handles: `cubic-bezier(0.16, 1, 0.3, 1)`.
- On the mock modal, the curve looks great. It scales up from the center, decelerates smoothly, and settles.
- **The Cognitive Illusion:** The mock modal is an isolated, center-anchored square floating on an empty canvas. It has no parent layout constraints, no flexbox siblings, and no real-world spatial gravity.
- Maya has no way to know whether this curve will look right when applied to a **280px vertical sidebar full of text, navigation links, and icons sliding horizontally against the left boundary of a high-density dashboard**.

---

### 3.2 The Mental Translation Tax: The Invisible Numbers

Because she cannot audition on her actual sidebar, Maya is forced to pay the **Mental Translation Tax**:

- She stares at mathematical coordinate strings: `cubic-bezier(0.25, 0.1, 0.25, 1.0)`.
- She tries to mentally extrapolate: _“If this curve takes 240ms on a scale transition, what happens when it drives a horizontal translate-X of 280px across 12 items? Will the icon labels blur during transit? Will the easing tail feel like it's dragging in mud?”_
- The human brain cannot mentally render differential calculus equations. She is operating completely blind, guessing at numerical strings.

---

### 3.3 The 20-Step Trial-and-Error Loop: Death by Context Switching

Without the ability to audition curves on her living code, Maya is forced into the exhausting **20-Step Loop**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   THE 20-STEP TRIAL-AND-ERROR LOOP                     │
├────────────────────────────────────────────────────────────────────────┤
│  1. Adjust handles in browser curve tool                               │
│  2. Click 'Copy CSS' (e.g. `cubic-bezier(0.16, 1, 0.3, 1)`)            │
│  3. Alt-Tab / Cmd-Tab to VS Code                                       │
│  4. Search `components/dashboard/sidebar.tsx`                          │
│  5. Paste curve into Tailwind utility: `ease-[cubic-bezier(...)]`      │
│  6. Save file (`Cmd+S`)                                                │
│  7. Wait for Vite / Next.js Fast Refresh to compile                    │
│  8. Alt-Tab to Chrome tab running `localhost:5173/dashboard`           │
│  9. Click the Sidebar toggle button                                    │
│  10. Observe motion: "Ugh, the deceleration tail feels too sluggish."  │
│  11. Alt-Tab back to curve tool                                        │
│  12. Nudge P2 coordinate from 0.3 to 0.4                               │
│  13. Copy new string                                                   │
│  14. Alt-Tab to VS Code                                                │
│  15. Paste over previous string                                        │
│  16. Save file                                                         │
│  17. Alt-Tab to browser                                                │
│  18. Click toggle button again                                         │
│  19. Realize the duration is also wrong (needs 280ms instead of 320ms) │
│  20. Repeat for the next 45 minutes... for ONE single component.       │
└────────────────────────────────────────────────────────────────────────┘
```

By the time she finishes tuning the sidebar, Maya is cognitively depleted. She still has **11 more animation instances** to calibrate across the dashboard.

---

### 3.4 The Rushed Playback Flaw: Whiplash and Snapping

When Maya tries using modern prototype tools with timeline scrubbers, she hits another severe engineering flaw: **the rushed playback loop**.

- In current studio tools, the timeline scrubber is mathematically mapped to a linear 0% $\to$ 100% time ramp.
- When she presses Play to test an entrance, the tool plays the arrival curve, waits a blunt 600ms, and then **immediately triggers the exit curve or snaps closed back to 0%**.
- **Why this is catastrophic for inspection:**
  - When tuning an entrance, Maya needs to inspect the **settling behavior**: _Does the sidebar coast smoothly to its final resting pixel? Does the text reflow cleanly?_
  - Instead, she gets visual whiplash: the element enters, flashes for a split second, and vanishes.
  - She cannot leave the component in its **settled, open state** to inspect typography and alignment without the animation snapping shut the instant scrub reaches 100%.

---

### 3.5 The Blind Duel: The Inability to A/B Test Real UI

Later that afternoon, Maya’s Product Designer asks:

> _“Should the Notification Drawer enter with an Apple-style Fluid Spring (`stiffness: 380, damping: 30`) or a Material 3 Deceleration cubic (`cubic-bezier(0.05, 0.7, 0.1, 1.0)`)?”_

Maya wants to compare them. How does she do it today?

- She cannot view both side-by-side on PulseHQ’s actual drawer.
- Her only option is a messy workaround:
  1. She codes Variant A in a temporary git branch, records a 5-second video on Loom.
  2. She stashes her changes, codes Variant B, and records a second Loom.
  3. She posts both video links in Slack or flips between browser tabs.
- **The Failure:** Video recordings run at variable 30fps compression. They cannot convey tactile feel. Neither Maya nor her designer can interact with the drawer, test rapid double-clicks, or feel the responsiveness under their own mouse and keyboard.

---

### 3.6 The Handoff Chasm: Designer Intent vs. Production Reality

At the end of the sprint, the team ships the dashboard.

The result is the dreaded **Handoff Chasm**:

- The Product Designer complains: _“The dashboard feels stiff and clunky compared to my Figma prototype.”_
- The Frontend Engineers complain: _“Framer Motion springs are impossible to match to Figma Smart Animate curves, and we don't have time to guess numbers all day.”_
- The Product Manager complains: _“The animations feel inconsistent—the sidebar feels slow, but the modal feels like it's jumping in.”_

**The Root Cause:** The entire team lacked a single, unified, high-precision workstation that connects **real living code** to **real kinetic physics** with zero guesswork.

---

## Chapter 4: Act II — The Complete Satisium Ease Experience (The Target State)

Now, we observe Maya two months later. Satisium Ease has reached its full architectural maturity with the **Universal Bind Protocol**.

Maya sits at her desk to calibrate PulseHQ's dashboard. Her experience is transformed from an exhausting trial-and-error chore into an effortless, flow-state masterclass in craft.

---

### 4.1 Studio Boot & Environment: Zero-FOUC Quiet Substrate

Maya opens `http://localhost:3000/app` on her right monitor:

- **Instant Session Hydration:** The studio boots in under 120 milliseconds with zero Flash of Unstyled Content (FOUC). Her previous curve selections, custom presets, viewport preferences, and active tracks are seamlessly hydrated from session cookies (`satisium-ease-session`).
- **The 3-Flank Architecture:** She is greeted by the balanced, quiet Satisium workstation:
  - **Left Flank:** The 56+ Curated Preset Catalog and Custom Curve Manager.
  - **Center Stage:** The Resizable Preview Theater, Floating Audition Toolbar, and Precision Timeline Dock.
  - **Right Flank:** The Educational Motion Guide, Compare Queue Slab, and Production Export Slab.
- **Tokens-Only Surface:** Pure semantic substrate tokens (`bg-background`, `bg-card`, `bg-muted`, `border-border`) with zero opacity hacks, rendering discrete, razor-sharp squircle boundaries.

---

### 4.2 The Curated Preset Catalog (Left Flank)

On her left, Maya has immediate access to the definitive dictionary of digital motion:

- **The Two Physics Engines:** Seamless toggle between **Bezier Curves (31 Presets)** and **Spring Physics (25 Presets)**.
- **Curated Families:** Organized by kinetic intent: _Popular Eases_, _Standard Decelerations_, _Anticipation Pullbacks_, _High-Frequency Mobile Springs_, and _Fluid Overdamped Glides_.
- **Micro-Telemetry Thumbnails:** Each card features a live SVG path visualization, launch velocity slope, settle time readout (`280ms settle`), and mathematical anchor coordinates ($P1, P2$).
- **Custom Curve Lifecycle (CRUD):**
  - Maya can click **`+ Fork`** on any existing curve to branch a peer variant (e.g. _Pulse-Sidebar-Spring-v2_).
  - She can rename curves inline, delete outdated drafts, and promote production-ready curves to the master library.
- **Instant Command Palette (`⌘K`):** Typing `⌘K` opens the instant filter dialog, allowing her to search by curve name, keyword (e.g. `"modal"`, `"bouncy"`, `"linear"`), or engine type without touching the mouse.

---

### 4.2.1 The Smart Curve Importer ("Smart Paste" Reverse-Engineering)

Maya doesn't always start from scratch. Often, she needs to diagnose an existing curve from her codebase.

In the Preset Catalog header (or directly into the `⌘K` command bar), Maya pastes a raw snippet copied from an old CSS file:
`transition-timing-function: cubic-bezier(0.7, 0, 0.84, 0);`

- **Instant Syntax Auto-Detection:** The Ease ingestion engine parses the string automatically, recognizing any of the following formats without requiring dropdown selections:
  - CSS / Tailwind: `cubic-bezier(0.7, 0, 0.84, 0)` or `ease-[cubic-bezier(...)]`
  - Framer Motion: `[0.7, 0, 0.84, 0]` or `{ type: "spring", stiffness: 350, damping: 28 }`
  - SwiftUI: `Animation.timingCurve(0.7, 0, 0.84, 0)`
  - GSAP / Web Animations: `CustomEase.create(...)`
- **Real-time Diagnostic Intelligence:** Instantly, Satisium Ease creates a custom curve card named _Imported Curve (0.7, 0)_ and calculates its kinetic telemetry:
  - Launch Velocity: `Extreme Acceleration (Slope 0.0 → 4.2)`
  - Settle Character: `Abrupt Impact (Hard Stop)`
  - Recommendation: `⚠️ Warning: High initial lag followed by violent arrival. Not recommended for modals or large surfaces.`
- **1-Click Audition:** Maya hits Enter. Her active scenario (or live dashboard) immediately animates with the imported curve. In 2 seconds, she visually confirms why the production team was complaining about that transition.

---

### 4.3 The 3 Modes of Satisium Ease

Maya can navigate between three specialized studio stages depending on her task:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THE 3 MODES OF THE STUDIO                       │
├────────────────────────────────────────────────────────────────────────┤
│  STAGE 1: AUDITION THEATER (`mode: "audition"`)                        │
│  • Single-component deep evaluation on archetypes or live bound targets│
│  • Viewport presets: Desktop (100%), Tablet (768px), Mobile (375px)    │
│  • Asymmetric kinetic slot choreography (In vs. Out)                   │
├────────────────────────────────────────────────────────────────────────┤
│  STAGE 2: THE CUSTOMIZATION LAB (`mode: "customize"`)                  │
│  • Interactive 2D Bezier canvas with draggable tangent control handles │
│  • Spring Physics Lab: Sliders for Mass ($m$), Stiffness ($k$),        │
│    Damping ($c$), and Initial Velocity ($v_0$)                         │
│  • Live Velocity Curve $f'(t)$, overshoot warning, settle time ($t_s$) │
├────────────────────────────────────────────────────────────────────────┤
│  STAGE 3: THE SYNCHRONIZED DUEL STAGE (`mode: "compare"`)              │
│  • Multi-tile side-by-side benchmark canvas (2-way and 3-way split)    │
│  • Synchronized Spacebar trigger firing all tiles simultaneously       │
│  • Ghost Curve Overlays: Visual mathematical comparison of curves      │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4.4 The Master Precision Timeline Dock

At the bottom of the center stage, Maya commands the **Master Precision Timeline Dock** (toggled instantly with `T`):

- **Satisium Precision Slider:** A full-width custom track offering sub-pixel scrubbing resolution (step `0.1`).
- **Transport Cluster:** Play / Pause (`Space`), Instant Replay from zero (`R`), and Loop toggle.
- **Time Dilation Engine:** One-click toggling between **`1x` (Real-Time)**, **`0.5x` (Half-Speed)**, and **`0.1x` (Ultra Slow-Motion)**. Maya uses 0.1x to inspect sub-frame antialiasing and text reflow during the deceleration phase.
- **Sharp Numeric Readouts:** Synchronized dual-readout displaying exact elapsed time and total duration (`240ms / 320ms · 75%`).
- **Accessibility Simulator (Reduced Motion Toggle):** An accessible eye icon toggling `prefers-reduced-motion` simulation. In one click, Maya verifies that her component gracefully degrades to an instant cross-fade for users with vestibular sensitivities, ensuring WCAG 2.1 compliance.

---

### 4.5 The Educational Motion Guide & Advisor (Right Flank)

On the right flank, the **Motion Guide** acts as her kinetic copilot:

- **Zero Clutter:** Free of redundant badges and cramped nested boxes. It features clean typography synced to the page design rhythm (`text-xs leading-relaxed text-muted-foreground`).
- **Contextual Target Sweet-Spots:** Clearly declares the physiological human perception guidelines directly in the headers:
  - _Recommended Entrance_ $\to$ `220–320ms`
  - _Recommended Exit_ $\to$ `160–220ms`
  - _Bounce Target_ $\to$ `Minimal (≤ 2%)`
- **Curated Recommendations:** Chips styled as elevated pills (`h-8 font-sans text-xs`) equipped with rich physics tooltips explaining the scientific _why_ behind each curve.
- **Liberal Slot Arming:** Clicking _any curve_ in either recommendation group immediately arms whichever kinetic slot Maya is currently focusing on, granting total creative freedom to cross-pollinate curves without artificial system lock-in.

---

### 4.6 The Climax: The Universal BYOC Journey (Live Dashboard Ingestion)

Now, Maya initiates the game-changing workflow. She does not want to test on mock components—**she wants to tune PulseHQ's actual live dashboard.**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        SATISIUM EASE: THE LIVE BYOC STAGE                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Top Bar: [ URL: http://localhost:5173/dashboard ⟳ ]  [ ⌖ Bind Active ]         │
│  Track:   [ ✦ Sidebar Collapse (Spring 380, 30) ⌄ ] (12 Bound Tracks)          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                 PULSEHQ ENTERPRISE DASHBOARD (LIVE IFRAME)              │   │
│   │                                                                         │   │
│   │   [ ⌖ 1. Sidebar ]    [ ⌖ 3. Search ]  [ ⌖ 4. Bell ]  [ ⌖ 5. Profile ]  │   │
│   │                                                                         │   │
│   │   [ ⌖ 6. Metric Cards ]             [ ⌖ 7. SVG Chart Path Draw ]        │   │
│   │                                                                         │   │
│   │   [ ⌖ 8. Table Actions ]            [ ⌖ 10. Filter Sheet Drawer ]       │   │
│   │                                                                         │   │
│   │   • Real Next.js codebase, real Tailwind, real data, live at 60fps.     │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Bottom: [ Scrub: 0% ═══════●═══════ 100% ]  [ 0.1x Slow-Mo ]  [ Duel (3) ]     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Step 1: Connecting the Dashboard (Zero Code Copying)

1. Maya clicks the scenario dropdown in the Audition Toolbar and selects **"Connect Live Dashboard"**.
2. She enters her local dev URL: `http://localhost:5173/dashboard`.
3. In under 200ms, PulseHQ's real dashboard loads inside the Preview Theater iframe substrate. Every route, every TanStack table, every Recharts SVG, and every Tailwind class works natively.

#### Step 2: The "Point & Bind" Ritual (10 Seconds)

1. Maya clicks the **⌖ Bind Crosshair** in the toolbar.
2. She hovers over her dashboard:
   - She clicks the **Sidebar** $\to$ inputs name: `sidebar`.
   - She clicks the **Notification Bell** $\to$ inputs name: `bell`.
   - She clicks the **Filter Drawer** $\to$ inputs name: `drawer`.
   - She clicks the **Metric Card** $\to$ inputs name: `card-lift`.
3. The Audition Toolbar dynamically populates her **Bound Track Directory** (`12 Tracks Active`).

#### Step 3: Surgical, Phase-Isolated Audition on Real UI

1. Maya selects `sidebar` from the Track Selector.
2. She clicks `Fluid (iOS)` in the Preset Catalog.
3. She drags the timeline scrubber from 0% to 100%:
   - Her **actual production sidebar** expands smoothly across her dashboard layout.
   - She observes the flexbox reflow of neighboring cards in real time.
   - When the scrubber reaches 100%, **the sidebar remains settled open.** It does not snap shut. She can leisurely inspect icon alignment, font weights, and spacing.
4. She clicks `0.1x` slow-motion and presses Spacebar:
   - The sidebar glides open at 10% speed, allowing her to catch a micro-jitter in the SVG icon alignment that she would have never noticed at full speed.

#### Step 4: The 3-Way Live Dashboard Duel (The Definitive Benchmark)

Maya wants to prove to her Product Designer which curve feels best for the **Filter Drawer**:

1. She focuses on the `drawer` track.
2. She queues 3 curve candidates into the Compare Queue:
   - **Candidate 1:** `Fluid (iOS)` spring (`stiffness: 380, damping: 30`)
   - **Candidate 2:** `Power3 Out` cubic (`cubic-bezier(0.16, 1, 0.3, 1)`)
   - **Candidate 3:** `Material Emphasized` (`cubic-bezier(0.05, 0.7, 0.1, 1.0)`)
3. She hits **Duel** (or press hotkey `C` $\to$ Enter).
4. The Preview Theater reflows into a **3-column split-screen**:
   - Column 1: PulseHQ Dashboard with Drawer on Candidate 1.
   - Column 2: PulseHQ Dashboard with Drawer on Candidate 2.
   - Column 3: PulseHQ Dashboard with Drawer on Candidate 3.
5. Maya presses **Spacebar**.
   - **All three live dashboards open their filter drawers in parallel.**
   - In Tile 1, the spring coasts in with physical inertia and a gentle, satisfying settle.
   - In Tile 2, the cubic arrives fast but feels sterile.
   - In Tile 3, the material decel feels heavy and enterprise-like.
6. She calls her designer over to her desk. In 5 seconds, they both agree: _“Candidate 1 is undeniably the brand feel we want.”_

#### Step 5: The "Motion Eyedropper" (Stealing & Reverse-Engineering Live Web Eases)

Later that week, Maya is browsing the redesigned Linear or Stripe website. She notices their new floating command bar drops with breathtaking kinetic grace.

Instead of guessing or digging through minified bundle code:

1. She triggers the **Satisium Motion Eyedropper** (via the Ease browser extension or the Preview Theater URL proxy).
2. She hovers over the Linear command bar and clicks it.
3. The eyedropper sniffs the browser's computed style and WAAPI runtime:
   - `✦ Sniffed: cubic-bezier(0.2, 0.9, 0.2, 1) · 240ms · Linear Command Drop`
4. She clicks **"↗ Send to Satisium Ease"**.
5. Instantly, Ease opens with that exact curve saved to her custom catalog.
6. She immediately binds it to PulseHQ's own ⌘K search bar and audits it on her live dashboard.

What used to take 2 hours of reverse-engineering and guesswork took **under 10 seconds**.

---

### 4.7 Universal Multi-Platform Export (`⌘E`)

With her curves tuned to perfection, Maya presses **`⌘E`**.

The **Export Slab** opens. Satisium Ease does not output generic mathematical gibberish; it outputs clean, production-ready code mapped directly to her bound tracks:

```tsx
// Exported from Satisium Ease for PulseHQ Design System
// Target: `sidebar` (Fluid iOS Spring) & `drawer` (Power3 Out)

// 1. Tailwind CSS v4 Theme Tokens:
@theme {
  --ease-sidebar: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-drawer: cubic-bezier(0.05, 0.7, 0.1, 1.0);
  --duration-sidebar: 320ms;
  --duration-drawer: 280ms;
}

// 2. Framer Motion Transition Props:
export const sidebarTransition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
  mass: 1,
};

// 3. Native CSS Root Custom Properties:
:root {
  --ease-sidebar: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-sidebar: 320ms;
}
```

Maya clicks **"Copy Tokens"**. She pastes them into `styles/globals.css`.

Her entire dashboard's motion is now production-ready, mathematically verified, and accessible. **Total time elapsed: 8 minutes.**

---

### 4.8 The Keyboard-First Ergonomic Flow Summary

Throughout this entire session, Maya barely touched her trackpad. The entire Satisium workstation answered to her fingertips:

| Keybinding      | Studio Action                                                         |
| :-------------- | :-------------------------------------------------------------------- |
| `Space`         | Play / Pause active animation track                                   |
| `R`             | Instant replay from $t=0$                                             |
| `C`             | Stash active curve into Compare Queue                                 |
| `T`             | Toggle Master Precision Timeline Console dock                         |
| `1` / `2` / `3` | Instant viewport jump: Desktop (100%), Tablet (768px), Mobile (375px) |
| `[` / `]`       | Step backward / forward through curve catalog presets                 |
| `Esc`           | Step up navigation hierarchy (Variant $\to$ Curve $\to$ Root)         |
| `⌘K`            | Instant Preset Search & Filter Palette                                |
| `⌘E`            | Open Multi-Platform Production Export Modal                           |

---

## Chapter 5: Architectural Gap Analysis (Current Codebase vs. Target State)

To bridge the gap between Maya’s current frustrating reality (Chapter 3) and her flow-state target experience (Chapter 4), we must conduct a line-by-line architectural comparison of our existing codebase against the target state.

---

### 5.1 Subsystem Comparison Matrix

| Subsystem               | Current Codebase (`v0.1.0`)                            | Target BYOC State (`v1.0.0`)                                       | Architectural Gap Severity                    |
| :---------------------- | :----------------------------------------------------- | :----------------------------------------------------------------- | :-------------------------------------------- |
| **1. Canvas Host**      | Hardcoded `<ModalScenario />` in `preview-theater.tsx` | Dynamic Manifest Registry & Iframe Host                            | 🔴 **Critical Blocker** (Hardcoded canvas)    |
| **2. State Machine**    | Hardcoded `{ enterId, exitId }` in `useStudioStore.ts` | Universal Track Registry: `Record<scenario, Record<slot, curve>>`  | 🔴 **Critical Blocker** (Binary slot ceiling) |
| **3. Audition Toolbar** | Hardcoded `isLifecycleComponent` boolean checks        | Adaptive Slot Pills & Track Selector Dropdown                      | 🟠 **High** (Rigid UI assumption)             |
| **4. Timeline Engine**  | Linear 0–100% loop with instant snap closed            | Phase-Isolated State Settle & Time Dilation                        | 🟠 **High** (Inspection whiplash)             |
| **5. Compare Engine**   | Flat array of curve IDs (`compareQueue: string[]`)     | Track-Targeted Multi-Instance Duel with Ghost Overlays             | 🟠 **High** (No multi-instance canvas)        |
| **6. The Live Bridge**  | Does not exist                                         | Universal Bind Protocol via CSS Custom Properties & DOM Attributes | 🟡 **Feature Addition** (New capability)      |

---

### 5.2 Deep-Dive Gap Analysis by Component

#### A. The Canvas Host: `preview-theater.tsx`

- **Current Code (Line 99):**
  ```tsx
  // components/studio/modes/audition/center-stage/preview-theater.tsx
  <ScrollArea key={animKey} className="...">
    <ModalScenario /> {/* ◄◄ HARDCODED TO MODAL SCENARIO */}
  </ScrollArea>
  ```
- **Why it fails:** The Preview Theater has zero concept of dynamic archetype switching. Selecting "Carousel", "Button", or "Connect Dashboard" in the UI does nothing because `<ModalScenario />` is hardwired into the JSX.
- **Target Architecture:**
  ```tsx
  // Dynamic Canvas Host
  const manifest = ARCHETYPE_REGISTRY[activeScenarioKey]
  return (
    <ScrollArea key={animKey} className="...">
      {manifest.type === "iframe" ? (
        <IframeLiveCanvas
          url={manifest.targetUrl}
          boundTracks={manifest.tracks}
        />
      ) : (
        <manifest.Component context={scenarioContext} />
      )}
    </ScrollArea>
  )
  ```

---

#### B. The State Machine & Storage: `useStudioStore.ts`

- **Current Code (Lines 50 & 301):**
  ```typescript
  // store/useStudioStore.ts
  scenarioSlots: Record<string, { enterId?: string; exitId?: string }>
  activeSlot: "enter" | "exit"

  assignCurveToSlot: (curveId: string, slot: "enter" | "exit", scenarioKey?: ArchetypeKey) => void
  ```
- **Why it fails:** The state is typed strictly to binary `enterId` and `exitId`. It cannot store a 1-slot Carousel, a 1-slot Button, or a 12-slot Dashboard.
- **Target Architecture:**
  ```typescript
  // Universal Multi-Track Schema
  scenarioSlots: Record<string, Record<string, string>> // scenarioId -> (slotId -> curveId)
  activeSlotId: string // e.g. "enter", "exit", "slide", "sidebar", "bell"

  assignCurveToSlot: (curveId: string, slotId: string, scenarioKey?: string) => void
  ```

---

#### C. The Audition Toolbar: `audition-toolbar.tsx`

- **Current Code (Line 165):**
  ```tsx
  // components/studio/modes/audition/center-stage/audition-toolbar.tsx
  const isLifecycleComponent =
    activeScenarioKey === "modal" ||
    activeScenarioKey === "sheet" ||
    activeScenarioKey === "toast"

  {
    isLifecycleComponent ? (
      <div className="relative flex items-center rounded-[10px] bg-muted p-0.5">
        {/* Explicitly hardcoded Entrance (In) and Exit (Out) buttons */}
      </div>
    ) : null
  }
  ```
- **Why it fails:** The toolbar explicitly checks if the component is a Modal or Sheet, and hardcodes two buttons. It cannot render 1 slot for a Carousel or 12 tracks for a live dashboard.
- **Target Architecture:**
  ```tsx
  // Adaptive Kinetic Slot Renderer
  const activeManifest = ARCHETYPE_REGISTRY[activeScenarioKey]
  const slots = activeManifest.slots

  {
    slots.length === 1 && <SingleSlotPill slot={slots[0]} />
  }
  {
    slots.length === 2 && (
      <SegmentedDualSlotPills slots={slots} activeSlotId={activeSlotId} />
    )
  }
  {
    slots.length > 2 && (
      <TrackSelectorDropdown tracks={slots} activeSlotId={activeSlotId} />
    )
  }
  ```

---

#### D. The Timeline Playback Engine: `timeline-console.tsx` & `studio-shell.tsx`

- **Current Code (Lines 56–78 of `studio-shell.tsx`):**
  ```typescript
  // Central RAF loop
  if (elapsed < totalDuration) {
    setScrubProgress((elapsed / totalDuration) * 100)
  } else if (isLooping) {
    // Waits 600ms and abruptly resets or loops
  } else {
    setScrubProgress(100)
    setIsPlaying(false) // ◄◄ Instantly drops isOpen to false, snapping modal shut!
  }
  ```
- **Why it fails:** Playback lacks a dedicated **Settle State**. Reaching 100% arrival causes the component to vanish because `isOpen` is tied directly to `isPlaying`.
- **Target Architecture:**
  - **Phase-Isolated Scrubbing:** Scrubbing strictly drives the active track.
  - **Resting Settle:** Reaching 100% arrival transitions the component to `settled: true`, keeping it visible, open, and interactive.
  - **Dedicated Lifecycle Cycle Action:** Spacebar triggers the active track; hotkey `Shift+Space` or a "Cycle" button triggers the full real-world lifecycle (`Arrival → 1.2s Settle Hold → Dismissal`).

---

#### E. The Comparison & Duel Engine: `compare-queue-slab.tsx` & `stage-3`

- **Current Code:**
  ```typescript
  // store/useStudioStore.ts
  compareQueue: string[] // e.g. ["power2-out", "expo-in", "modal-sheet"]
  ```
- **Why it fails:** The compare queue stores flat curve IDs. In a multi-slot component (or a live dashboard), the app has no idea which track those curves should be applied to. Furthermore, the 3-column Duel view (`stage-3`) is not yet wired to clone component instances.
- **Target Architecture:**
  - **Track-Targeted Compare:** When in Duel mode for a specific track (e.g. `sidebar` or `modal.enter`), each duel column clones the component/dashboard and assigns one curve from the queue to that target track, keeping all other tracks identical.
  - **Ghost Overlays:** The Duel stage overlays the SVG trajectory curves with semi-transparent traces so designers can visually see the mathematical velocity difference.

---

#### F. The Live Bridge: `BindProtocol`

- **Current Code:** Completely absent.
- **Target Architecture:**
  - A host iframe loader embedded in the Preview Theater.
  - A lightweight host-to-guest communication bus (`postMessage`):
    ```typescript
    interface EaseBridgeMessage {
      type:
        "EASE_INJECT_VARIABLE" | "EASE_QUERY_TRACKS" | "EASE_CROSSHAIR_ACTIVE"
      payload: {
        trackName: string
        cssVariable: string
        curveValue: string
        durationMs: number
      }
    }
    ```
  - Injects CSS custom properties directly into `:root` and updates target elements with zero page refresh.

---

#### G. Curve Ingestion & Reverse-Engineering Engine: Importer & Sniffer

- **Current Code:** Only export slabs exist (`export-slab.tsx`). The app has no input parser to reverse-engineer pasted CSS/Framer strings or sniff curves from external websites.
- **Target Architecture:**
  - **The Smart Ingestion Parser (`parseImportedCurve`):** A multi-format regex parser that accepts raw CSS `cubic-bezier()`, Framer arrays `[x1, y1, x2, y2]`, Spring config objects `{ stiffness, damping }`, Tailwind classes, or SwiftUI syntax, parses them into canonical coordinate representations, derives kinetic telemetry, and stores them in `customCurves`.
  - **The Motion Eyedropper Bridge:** Browser extension / WAAPI sniffer that extracts `getComputedStyle(el).transitionTimingFunction` and duration from any live webpage and deep-links it into Satisium Ease.

---

## Chapter 6: The 5-Phase Engineering Implementation Roadmap

To systematically transform our codebase from its current state (`v0.1.0`) into the fully realized BYOC workstation (`v1.0.0`) without breaking existing functionality, we execute a linear 5-phase engineering roadmap.

Each phase is strictly **gated, atomic, and test-verified** before moving to the next.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        5-PHASE ROADMAP SEQUENCE                        │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE 1: Universal Dynamic Slot Schema (Store Decoupling)             │
│  • Change `{ enterId, exitId }` to universal `Record<slotId, curveId>` │
│  • Generalize `activeSlotId: string` and slot assignment actions       │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE 2: Dynamic Component Manifest Contract (`ArchetypeManifest`)    │
│  • Define manifest contract (`id`, `slots[]`, `render()`)             │
│  • Refactor Modal, add Carousel and Button as first-class manifests    │
│  • Update `PreviewTheater` to dynamically host the active manifest    │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE 3: Phase-Isolated Playback & Settle State Machine               │
│  • Fix timeline scrubber to scrub active slot without snapping         │
│  • Introduce resting `settled: true` state on 100% arrival             │
│  • Implement dedicated Lifecycle Cycle player (In → Dwell → Out)       │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE 4: Track-Targeted Multi-Instance Duel Canvas                    │
│  • Wire Stage 3 / Compare mode into a true 2/3-column parallel grid    │
│  • Synchronized Spacebar trigger firing all tiles in parallel          │
│  • Render ghost curve overlays directly on comparison cards            │
├────────────────────────────────────────────────────────────────────────┤
│  PHASE 5: The Live Bridge & Universal "Point & Bind" Engine            │
│  • Implement `IframeLiveCanvas` for `localhost:5173` dashboard loading │
│  • Build the **⌖ Bind Crosshair** element picker and track assigner    │
│  • Establish bidirectional `postMessage` CSS variable injection bus    │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 1: Universal Dynamic Slot Schema (Store Decoupling)

- **Goal:** Eliminate the binary `{ enterId, exitId }` and `"enter" | "exit"` ceiling from the core state store.
- **Affected Files:**
  - `components/studio/domain/studio-types.ts`
  - `store/useStudioStore.ts`
  - `components/studio/domain/use-scenario-choreography.ts`
  - `__tests__/studio-store.test.ts`
- **Concrete Deliverables:**
  1. Define universal `ScenarioSlots` type: `Record<string, Record<string, string>>` (scenarioId $\to$ slotId $\to$ curveId).
  2. Update `activeSlotId: string` to support any track identifier (`"enter"`, `"exit"`, `"slide"`, `"press"`, `"sidebar"`, etc.).
  3. Generalize `assignCurveToSlot(curveId: string, slotId: string, scenarioKey?: string)`.
  4. Preserve full backward compatibility so existing modal tests pass with zero regressions.
- **Verification Gate:**
  - `pnpm test` (all store tests pass).
  - `pnpm typecheck && pnpm lint` (zero TypeScript or ESLint errors).

---

### Phase 2: Dynamic Component Manifest Contract

- **Goal:** Transform the Preview Theater into a decoupled, pluggable host that can render any component without hardcoded `if/else` checks.
- **Affected Files:**
  - `components/studio/domain/archetype-registry.ts` (New file)
  - `components/studio/modes/audition/center-stage/preview-theater.tsx`
  - `components/studio/modes/audition/center-stage/audition-toolbar.tsx`
  - `components/studio/modes/audition/right-flank/archetype-advisor-slab.tsx`
  - Scenarios: `modal-scenario.tsx`, `carousel-scenario.tsx` (New), `button-scenario.tsx` (New)
- **Concrete Deliverables:**
  1. Define the formal `MotionComponentManifest` interface.
  2. Package **Modal** as Manifest #1 (2 slots: `enter`, `exit`).
  3. Implement **Carousel** as Manifest #2 (1 symmetric slot: `slide`).
  4. Implement **Button** as Manifest #3 (1 tactile slot: `press`).
  5. Refactor `PreviewTheater` line 99: replace `<ModalScenario />` with dynamic `activeManifest.render(context)`.
  6. Refactor `AuditionToolbar`: render 1 pill, 2 pills, or track dropdown dynamically based on `activeManifest.slots`.
  7. Refactor `ArchetypeAdvisorSlab`: display recommendations based on the active manifest slot.
  8. Implement the **Smart Curve Importer ("Smart Paste")**: multi-syntax regex parser for CSS, Framer, Spring, Tailwind, and Swift strings directly in `⌘K` and the catalog header.
- **Verification Gate:**
  - Switching between Modal, Carousel, and Button in the dropdown updates the toolbar, canvas, and advisor instantly.
  - Browser Playwright visual test confirms smooth carousel slide and button press mechanics.

---

### Phase 3: Phase-Isolated Playback & Settle State Machine

- **Goal:** Eliminate the frantic ping-pong loop and snapping behavior. Allow components to settle open at 100% arrival for peaceful inspection.
- **Affected Files:**
  - `components/studio/studio-shell.tsx` (RAF playback engine)
  - `components/studio/modes/audition/center-stage/timeline-console.tsx`
  - `store/useStudioStore.ts`
- **Concrete Deliverables:**
  1. Decouple `isOpen` from `isPlaying`. When an arrival animation reaches 100%, the component transitions to `isSettled: true` and **stays open**.
  2. Implement **Phase-Isolated Scrubbing**: dragging the slider strictly drives the active track from 0% to 100%.
  3. Add a dedicated **"Cycle Full Flow"** transport action (`Shift+Space` or button): executes Entrance $\to$ 1.2s Settle Hold $\to$ Dismissal for true real-world lifecycle evaluation.
  4. Wire the **Reduced Motion Toggle** to clamp durations to 0ms or smooth crossfades.
- **Verification Gate:**
  - Scrubbing to 100% leaves the modal/carousel open with zero snapping.
  - Loop mode includes a comfortable, user-configured dwell pause (1.2s).

---

### Phase 4: Track-Targeted Multi-Instance Duel Canvas

- **Goal:** Transform Stage 3 (`mode: "compare"`) into a synchronized 2-column or 3-column live A/B benchmarking canvas.
- **Affected Files:**
  - `components/studio/modes/compare/compare-stage.tsx` (New file)
  - `components/studio/studio-shell.tsx` (Mode router)
  - `components/studio/modes/audition/right-flank/compare-queue-slab.tsx`
- **Concrete Deliverables:**
  1. When clicking **"Duel"**, route to the Compare Stage.
  2. Read the active component and active track from the store.
  3. Render 2 or 3 parallel tiles of that exact component side-by-side.
  4. Assign one queued curve candidate to the active track of each tile, keeping all other tracks identical.
  5. Bind global `Spacebar` to trigger all comparison tiles simultaneously.
  6. Render SVG ghost curve overlays above or beside each tile for visual mathematical verification.
- **Verification Gate:**
  - Launching Duel with 3 queued curves renders 3 identical components.
  - Hitting Spacebar triggers synchronized, parallel motion across all 3 tiles.

---

### Phase 5: The Live Bridge & Universal "Point & Bind" Engine

- **Goal:** Deliver the full BYOC vision—allowing users to connect external web applications (e.g. `localhost:5173/dashboard`) and tune their motion live.
- **Affected Files:**
  - `components/studio/bridge/iframe-live-canvas.tsx` (New file)
  - `components/studio/bridge/bind-crosshair.tsx` (New file)
  - `components/studio/bridge/ease-bridge-bus.ts` (New file)
  - `components/studio/modes/audition/center-stage/export-slab.tsx`
- **Concrete Deliverables:**
  1. Add a special manifest: **"Connected App (Live Bridge)"**.
  2. Render an isolated `<iframe>` in the Preview Theater pointing to the user's input URL.
  3. Implement the **⌖ Bind Crosshair**: clicking elements in the iframe attaches `data-ease-bind="<name>"` and registers the track.
  4. Establish the `postMessage` protocol: updates to curves in Ease immediately push CSS custom properties (`--ease-<name>`, `--duration-<name>`) into the guest application.
  5. Multi-Platform Export Modal (`⌘E`): generate Tailwind v4 `@theme`, CSS variables, Framer Motion transitions, GSAP strings, and SwiftUI code for all bound tracks.
  6. Implement the **Motion Eyedropper & Web Reverse-Engineering Engine**: sniffer tool extracting `getComputedStyle` timing functions and durations from live web targets into Ease.
- **Verification Gate:**
  - Loading a local demo dashboard in the iframe allows clicking the sidebar, binding a curve, and watching the live sidebar animate with the new curve at 60fps.
  - Clicking Export produces clean, ready-to-paste code.

---

## Chapter 7: Definition of Done & Quality Acceptance Criteria

To ensure that the Satisium brand standard of uncompromising craft is maintained across all phases of implementation, every deliverable must pass through this dual technical and human verification gate before it is marked complete.

---

### 7.1 Satisium Architectural Non-Negotiables

All code written for Satisium Ease must strictly comply with the **Satisium Build Contract**:

1. **Tokens Only (Zero Arbitrary Hex/RGB):**  
   All colors, borders, and backgrounds must read from discrete semantic tokens (`bg-background`, `bg-card`, `bg-muted`, `bg-secondary`, `text-foreground`, `text-muted-foreground`, `border-border`). No inline hex or arbitrary Tailwind color values (`text-gray-500`, `#1a1a1a`).
2. **Zero Opacity Modifiers on Semantic Colors:**  
   Never use Tailwind opacity modifier hacks (e.g. `bg-secondary/70`, `text-muted-foreground/80`, `bg-foreground/20`). Opacity hacks cause unpredictable substrate bleed, luminosity shifts, and color mismatches in dark mode. Always use discrete, dedicated semantic tokens directly.
3. **Strict Route & Navigation Decoupling:**  
   Every URL path must come from `lib/routes.ts`. Every navigation link must read from `lib/nav.ts`. No raw hardcoded `href="/..."` strings anywhere in the application.
4. **Motion Engine Centralization:**  
   All springs and transitions driving studio UI containers (such as the timeline dock reveal or viewport resizing) must come from `lib/motion.ts`. No arbitrary inlined `stiffness` or `damping` numbers in layout components.
5. **The Zero-Key Rule:**  
   The application must boot, build, test, and run with an empty `.env.local`. No external API keys or cloud credentials may be required for local development or production verification.
6. **Zero Autonomous Git Actions:**  
   Strictly respect `FEATURE_WORKFLOW.md`. Never run `git commit`, `git push`, or `gh pr create` without an explicit instruction from the Founder. Always pause in the working tree for interactive browser QA.

---

### 7.2 Performance & Technical Benchmarks

Every phase must satisfy these quantifiable performance metrics:

- **Frame Budget:** 60fps (16.6ms per frame) during active timeline scrubbing, with zero dropped frames.
- **Zero Cumulative Layout Shift (CLS 0):** Viewport resizing, timeline dock expansion, and mode switches must animate without causing document jumps or unexpected reflows.
- **Zero Flash of Unstyled Content (FOUC):** Initial page loads and client rehydrations must mount smoothly without layout snapping or flash of default curves, guaranteed by `<AnimatePresence initial={false}>` and server-side cookie hydration.
- **Sub-120ms Session Boot:** The studio must read and apply previous curve states and viewport preferences in under 120ms on desktop browsers.

---

### 7.3 The Human UX Acceptance Criteria ("The Maya Benchmark")

Technical tests alone do not guarantee a great product. The ultimate test of Satisium Ease is the **Maya Benchmark**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THE MAYA BENCHMARK                              │
├────────────────────────────────────────────────────────────────────────┤
│  Can a design technologist connect an enterprise dashboard,           │
│  bind 3 distinct animation tracks, audition them frame-by-frame,       │
│  run a 3-way synchronized duel, and export clean production tokens     │
│  in UNDER 5 MINUTES without opening Chrome DevTools or reading a manual?│
└────────────────────────────────────────────────────────────────────────┘
```

#### Specific Usability Checks:

- **The Settle Test:** When Maya scrubs to 100% of an arrival transition, the component must **remain settled open and fully interactive**. It must never snap shut automatically.
- **The Crosshair Intuition:** Clicking the **⌖ Bind** tool must feel as natural as the Chrome DevTools element picker. Hovering over DOM elements highlights them with a clean, discrete ring; clicking them instantly registers the track name.
- **The Keyboard Flow:** Maya must be able to trigger, replay, slow down, queue, duel, and export curves using only hotkeys (`Space`, `R`, `C`, `T`, `1/2/3`, `⌘K`, `⌘E`) without taking her hands off the keyboard.
- **The 1-Click Code Handoff:** Copying tokens from the export slab must produce code that drops directly into a Tailwind CSS, Framer Motion, or native CSS project with **zero syntax errors or manual editing required**.

---

### 7.4 The Verification Gate (Command Checklist)

Before any phase is submitted to the Founder for QA approval:

1. `pnpm test` $\to$ **All vitest suites pass (100% green)**.
2. `pnpm typecheck` $\to$ **0 TypeScript errors (`tsc --noEmit`)**.
3. `pnpm lint` $\to$ **0 ESLint warnings or errors**.
4. `pnpm doctor` $\to$ **All 15 environment and configuration checks pass**.
5. **Interactive Browser QA:** The feature must be tested live in the browser at `http://localhost:3000/app` across Desktop (1440px), Tablet (768px), and Mobile (375px) viewports before requesting git commit approval.

---

_End of Specification — `BYOC_USER_POV.md`_
