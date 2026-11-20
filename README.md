# Satisium Ease

<div align="center">

**Interactive Cubic-Bézier curve editor and analytical ODE spring physics studio for design engineers.**

[![CI](https://github.com/satisium/ease/actions/workflows/ci.yml/badge.svg)](https://github.com/satisium/ease/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live App](https://img.shields.io/badge/Live_App-ease.satisium.com-000000)](https://ease.satisium.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black)](https://nextjs.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com/)

[ease.satisium.com](https://ease.satisium.com) · [Documentation](https://ease.satisium.com/docs) · [Presets](https://ease.satisium.com/docs/presets) · [Springs](https://ease.satisium.com/docs/springs) · [Exports](https://ease.satisium.com/docs/exports)

</div>

---

## Overview

> _"Everything is Code. Context is Premium."_

**Satisium Ease** bridges the gap between mathematical motion curves and real-world UI engineering. Design, fine-tune, and benchmark both parametric Cubic-Bézier vectors and closed-form analytical ODE spring physics ($m, k, c, v_0$), auditioning kinetics live at 120fps across 21 production UI habitats (`Overlays`, `Controls`, `Disclosure`, `Landing`, and the default 4-track `Primitives X-Ray`).

### Key Features

- **Dual Physics Engines:**
  - **Cubic-Bézier Solver:** Precision numerical root-finding using Newton-Raphson with De Casteljau subdivision fallback ($[0, 1] \to [0, 1]$ parameter space).
  - **Closed-Form Analytical ODE Springs:** Exact analytical solutions for second-order harmonic oscillator kinematics ($m \ddot{x} + c \dot{x} + k x = 0$) across underdamped, critically damped, and overdamped regimes with initial velocity $v_0$.
- **Duration Integrity Law:** Bézier curves strictly preserve user-specified durations, whereas spring physics analytically determine their true settling time based on a resting threshold ($\epsilon = 0.001$). Switching engines cleanly transitions between fixed durations and physics-derived settling kinetics.
- **Scoped 120fps `TrackConductor`:** Decoupled RAF loop driving DOM elements directly via GPU-accelerated CSS transforms, with live mid-flight velocity interruption (`I` shortcut).
- **2-Tier Git Curve Branching:** Branch curves non-destructively (`Root -> Variants[]`), preview uncommitted `Draft *` edits, and roll back or promote variants effortlessly.
- **Side-by-Side Compare Duels:** Benchmark two curves in real time across any habitat to validate perceived latency, overshoot, and settling feel.
- **4 Production Exporters:**
  - CSS `cubic-bezier()` & CSS `linear()` sampled keyframes
  - Tailwind CSS v4 `@utility` declarations
  - Motion (Framer Motion) transition syntax
  - GSAP `CustomEase` curves
  - Lossless compressed `#hash` Share URLs for zero-database collaboration.

---

## Architecture Blueprint

```
ease/
├── core/                  # 100% pure headless TypeScript (zero React/DOM imports)
│   ├── bezier/            # De Casteljau solver & Newton-Raphson root finder
│   ├── spring/            # Analytical ODE solver & settling time calculation
│   ├── compilers/         # Multi-target code generators (CSS, Tailwind, Motion, GSAP)
│   ├── evaluators/        # Interpolation engines & trajectory samplers
│   ├── registry/          # 21 habitat track conductor definitions & curve presets
│   └── store/             # Zustand state stores & curve tree mutation engines
├── hooks/                 # 120fps DOM binders (useTrackConductor, useHotkeys)
├── components/studio/     # Satisium UI Studio workstation
│   ├── habitats/          # 21 interactive UI audition habitats
│   ├── modes/             # Audition (Preview), Customize (Canvas), Compare (Duel)
│   └── export-dialog.tsx  # Production code generator modal
├── content/docs/          # Fumadocs MDX documentation (AEO/GEO machine discovery)
└── public/                # Static assets, llms.txt, and llms-full.txt
```

---

## Quick Start (Zero-Env Setup)

Satisium Ease enforces the **Zero-Key Rule**: the entire application boots, builds, and passes all tests without requiring any `.env` configuration.

```bash
# 1. Clone the repository
git clone https://github.com/satisium/ease.git
cd ease

# 2. Install dependencies (requires Node >= 20.9, pnpm 10+)
pnpm install

# 3. Start the Turbopack development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The root route automatically redirects to `/app` (the Ease Studio Workstation). Documentation is accessible at `/docs`.

---

## Scripts

| Command          | Description                                                              |
| :--------------- | :----------------------------------------------------------------------- |
| `pnpm dev`       | Start Next.js development server with Turbopack                          |
| `pnpm lint`      | Run ESLint validation                                                    |
| `pnpm typecheck` | Run Fumadocs MDX checks and TypeScript compiler (`tsc --noEmit`)         |
| `pnpm test`      | Run complete unit and integration test suite via Vitest                  |
| `pnpm doctor`    | Audit 14 architectural contracts and domain rules (`scripts/doctor.mjs`) |
| `pnpm build`     | Generate LLM discovery surfaces and compile production build             |
| `pnpm e2e`       | Run Playwright smoke and accessibility test suite                        |

---

## Keyboard Shortcuts

| Shortcut        | Action                                              |
| :-------------- | :-------------------------------------------------- |
| `Space`         | Play / Pause active animation loop                  |
| `R`             | Reset playback to start ($t = 0$)                   |
| `I`             | Trigger mid-flight velocity interruption            |
| `1`             | Switch to **Preview Mode** (Habitat Audition)       |
| `2`             | Switch to **Customize Mode** (Curve Editing Canvas) |
| `3`             | Switch to **Compare Mode** (Side-by-Side Duel)      |
| `⌘E` / `Ctrl+E` | Open **Export Motion Kinetics** dialog              |
| `⌘K` / `Ctrl+K` | Open Satisium Command Palette                       |
| `Esc`           | Close active dialog or clear selection              |

---

## Community & Support

Join the [Satisium Discord](https://discord.gg/xQ5cPHmT7) community to connect with other builders and contributors:

- **`#ease-chat`**: General discussions, motion design, and showcase.
- **`#ease-support`**: Community support and troubleshooting forum.
- **`#ease-requests`**: Feature ideas, habitat requests, and kinetic explorations.

For bugs and technical issues, please open a [GitHub Issue](https://github.com/satisium/ease/issues).

---

## Contributing

We welcome contributions from design engineers and developers! Please read our [Contributing Guide](CONTRIBUTING.md) for architectural invariants, coding guidelines, and commit standards before opening a pull request.

Please review our [Code of Conduct](CODE_OF_CONDUCT.md) to maintain a respectful and welcoming community.

---

## Security

For vulnerability disclosures and security policies, please consult [SECURITY.md](SECURITY.md).

---

## License

Released under the [MIT License](LICENSE). Built by [Satishkumar](https://github.com/satishkumarsajjan) for [Satisium](https://satisium.com).
