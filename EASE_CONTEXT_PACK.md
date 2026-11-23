# Satisium Ease: Technical Context Pack & Onboarding Dossier

> **Document Type:** Principal Engineering & Architecture Onboarding Dossier  
> **Repository:** `satisium/ease` (`https://github.com/satisium/ease`)  
> **Master Brand / Holding:** `SATISIUM` | Part I: Satisium Design (`*.satisium.com`)  
> **Canonical Production URL:** `https://ease.satisium.com`  
> **Author:** Satishkumar (`@iamsatish4564`)  
> **Status:** Production-Ready (`0.12.0`) · 100% Test Pass Rate (39 test suites, 382 tests)

---

## 1. Project & Tech Stack Summary

Satisium Ease is an interactive, analytical motion curve workstation and spring physics instrument for design engineers and frontend developers. It allows users to visually craft, inspect, duel, and benchmark cubic Bézier curves and second-order analytical spring differential equations, exporting production-ready code to CSS (`cubic-bezier` and `linear()`), Tailwind CSS v4, Motion (Framer Motion), and GSAP.

### Exact Technology Stack & Versions

| Layer                   | Technology            | Exact Version                     | Description / Purpose                                                       |
| :---------------------- | :-------------------- | :-------------------------------- | :-------------------------------------------------------------------------- |
| **Framework**           | Next.js               | `16.3.0`                          | App Router, Turbopack (`next dev --turbo`), Standalone SSR/Edge             |
| **Language**            | TypeScript            | `^5.9.3`                          | Strict type checking (`strict: true`, `target: ES2017`)                     |
| **Runtime**             | Node.js               | `>=20.9` (CI: `22`)               | Modern ES modules (`"type": "module"`)                                      |
| **Package Manager**     | pnpm                  | `10.12.4`                         | Enforced lockfile, pnpm workspaces (`pnpm-workspace.yaml`)                  |
| **UI Library**          | React / React DOM     | `19.2.8`                          | React 19 Concurrent Root, Server Components & Client Slabs                  |
| **Styling**             | Tailwind CSS v4       | `^4.3.3`                          | `@tailwindcss/postcss`, `@tailwindcss/typography`, OKLCH design tokens      |
| **Animation Engine**    | Motion                | `^12.38.0`                        | Satisium UI slab transitions, spatial morphs, layout animations             |
| **Physics / GSAP**      | GSAP & `@gsap/react`  | `^3.15.0` / `^2.1.2`              | Native GSAP export compilation and runtime validation                       |
| **Client State**        | Zustand               | `^5.0.12`                         | 5-slice store architecture decoupled from React render loop                 |
| **Animation Clock**     | TrackConductor        | Custom (`core/clock/`)            | 120fps RAF imperative animation clock outside React                         |
| **UI Primitives**       | Radix UI / shadcn     | `^1.4.3` / `^4.1.2`               | Headless accessible primitives (Dialog, Tooltip, Select, Slider)            |
| **Iconography**         | Hugeicons             | `^4.1.1` (core), `^1.1.6` (react) | Unified Satisium icon kit (`@hugeicons/core-free-icons`)                    |
| **Auxiliary Icons**     | Lucide / Simple Icons | `^1.8.0` / `^13.15.1`             | Brand marks and supplemental interface glyphs                               |
| **Syntax Highlighting** | Shiki                 | `^4.0.2`                          | Syntax highlighting for code export presets                                 |
| **Animated Numbers**    | Number Flow           | `^0.6.2`                          | `@number-flow/react` for 120fps tabular kinetic telemetry counters          |
| **Schema Validation**   | Zod                   | `^4.3.6`                          | Schema parsing, curve serialization, and export validation                  |
| **Telemetry / Web**     | PostHog               | `^1.404.1`                        | Client telemetry proxied via Next.js rewrites (`/ingest/*`)                 |
| **Analytics**           | Vercel Analytics      | `^2.0.1`                          | Core Web Vitals and zero-config deployment telemetry                        |
| **Unit Testing**        | Vitest                | `^5.0.3`                          | In-source & integration test runner (`jsdom` 26.1.0, `@vitest/coverage-v8`) |
| **DOM Testing**         | Testing Library       | `^16.3.3`                         | `@testing-library/react`, `@testing-library/user-event` 14.6.7              |
| **E2E Testing**         | Playwright            | `^1.63.0`                         | End-to-end browser regression and `@axe-core/playwright` accessibility      |

### Umbrella & Monorepo Architecture

- **Standalone Workstation Repository:** `ease` is maintained in a dedicated git repository (`satisium/ease`), maintaining independent CI/CD, deployment speed, and zero monolithic build friction.
- **Satisium Design Ecosystem Connection:** Under Satisium's strict parent architecture:
  - **Pillar:** Part I: Satisium Design (Developer tools and UI studios live exclusively on `*.satisium.com` subdomains).
  - **Cluster:** `polish` (Micro-interactions, kinetic physics, and motion grammar).
  - **Type:** `studio` (Interactive single-page design engineer workstation).
  - **Brand Alignment:** Satisium master tokens, single typography hierarchy (Plus Jakarta Sans + Inter + IBM Plex Mono + Nulshock Bold), and shared telemetry schema (`satisium` taxonomy).

---

## 2. Complete File Tree & Directory Roles

```
.
├── AGENTS.md                            # Next.js & Satisium build rules, immutable truths, protocol
├── CHANGELOG.md                         # Release history managed via Changesets
├── CLAUDE.md                            # Development instructions & guidelines
├── CODE_OF_CONDUCT.md                  # Contributor code of conduct
├── CONTRIBUTING.md                      # Contribution protocols & workflow
├── FEATURE_WORKFLOW.md                  # Strict zero-autonomous-git and QA workflow contract
├── LICENSE                              # MIT License
├── PRESETS.md                           # Motion preset catalog index & specifications
├── PRODUCT_SPEC.md                      # Approved product identity, taxonomy & feature spec
├── README.md                            # Public repository readme
├── SECURITY.md                          # Vulnerability reporting protocol
├── commitlint.config.mjs                # Conventional commits validation rules
├── eslint.config.mjs                    # ESLint 10 configuration extending next/core-web-vitals
├── knip.json                            # Unused export and dead-code detection configuration
├── lighthouserc.json                    # Lighthouse CI performance & accessibility thresholds
├── lint-staged.config.mjs               # Pre-commit hook tasks (prettier, eslint)
├── next-env.d.ts                        # Next.js generated type declarations
├── next.config.mjs                      # Next.js config (CSP headers, rewrites, bundle analyzer)
├── package.json                         # Project dependencies, scripts, and engine constraints
├── playwright.config.ts                 # Playwright E2E & visual accessibility configuration
├── pnpm-workspace.yaml                  # pnpm package isolation and built dependencies config
├── postcss.config.mjs                   # PostCSS config with @tailwindcss/postcss
├── tsconfig.json                        # TypeScript strict compiler options & path aliases
├── tsconfig.tsbuildinfo                 # Incremental TypeScript compilation cache
├── vitest.config.ts                     # Vitest configuration with tsconfig-paths & jsdom
├── vitest.setup.ts                      # Vitest global environment mocks (ResizeObserver, etc.)
│
├── app/                                 # Next.js 16 App Router surface
│   ├── (legal)/                         # Catch-all dynamic legal pages
│   │   └── [...slug]/page.tsx           # Server-rendered privacy, terms, cookies MDX reader
│   ├── api/                             # Edge & Node route handlers
│   │   ├── health/route.ts              # JSON liveness & integration status probe
│   │   └── og/route.tsx                 # Dynamic OpenGraph social banner generation (Edge)
│   ├── app/                             # Primary studio workstation route
│   │   ├── loading.tsx                  # Studio workstation skeleton transition
│   │   └── page.tsx                     # Studio workstation entry point (SSR + Client Shell)
│   ├── apple-icon.png                   # Apple touch icon asset
│   ├── error.tsx                        # Segment error boundary UI
│   ├── favicon.ico                      # Standard favicon
│   ├── global-error.tsx                 # Root layout fatal fallback boundary
│   ├── globals.css                      # Master CSS tokens, OKLCH theme ramps, Tailwind v4
│   ├── icon.svg                         # Vector favicon
│   ├── layout.tsx                       # Root layout (fonts, JSON-LD schemas, providers)
│   ├── manifest.ts                      # Web App Manifest generator
│   ├── not-found.tsx                    # Custom 404 page
│   ├── page.tsx                         # Root page (redirects directly to /app)
│   ├── robots.ts                        # Crawler control directive generator
│   └── sitemap.ts                       # Dynamic XML sitemap generator
│
├── components/                          # React UI & Studio components
│   ├── analytics-provider.tsx           # PostHog & Vercel telemetry contextualizer
│   ├── callout.tsx                      # Markdown warning & note callouts
│   ├── code-block/                      # Multi-tabbed Shiki syntax-highlighted code viewers
│   ├── command-block.tsx                # Terminal CLI execution block with copy action
│   ├── consent-banner.tsx               # Cookie consent bar with granular controls
│   ├── error-boundary.tsx               # Class-based React error boundary with error recovery
│   ├── google-analytics.tsx             # Script injector for Google Analytics 4
│   ├── icons.tsx                        # SVG icons, brand logos, and kinetic illustrations
│   ├── layout/                          # Global chrome wrappers (command menu, footer, skip link)
│   ├── mdx-components.tsx               # MDX element mapping overrides
│   ├── mdx/                             # Specialized MDX components (steps, file trees)
│   ├── posthog-pageview.tsx             # PostHog SPA route change listener
│   ├── previewer/                       # Canvas checkerboards and stage backdrops
│   ├── providers/                       # RootProviders wrapper (theme, tooltip, command)
│   ├── satisium-logo.tsx                # Satisium master brandmark & logotype
│   ├── studio/                          # Satisium Ease core studio interface
│   │   ├── common/                      # Shared studio primitives (BrandSlab, etc.)
│   │   ├── export-dialog.tsx            # Comprehensive multi-framework export modal (⌘E)
│   │   ├── habitats/                    # 21 interactive preview components across 5 categories
│   │   │   ├── controls/                # Buttons, inputs, switches, dynamic pills
│   │   │   ├── disclosure/              # Accordions, toast stacks, notifications
│   │   │   ├── habitat-stage.tsx        # Responsive viewport frame for habitats
│   │   │   ├── landing/                 # Hero reveal, flip words, bento cards
│   │   │   └── overlays/                # Dialogs, bottom sheets, drawers, command palettes
│   │   ├── modes/                       # The 3 in-place studio views
│   │   │   ├── audition/                # Mode 1: Component preview theater & advisor
│   │   │   ├── compare/                 # Mode 3: Side-by-side curve duel arena & benchmark
│   │   │   └── customize/               # Mode 2: Interactive Bézier & spring physics canvas
│   │   ├── studio-shell.tsx             # Master workstation orchestrator & hotkey router
│   │   └── studio-ui-context.tsx        # Low-frequency UI slab layout context
│   ├── theme-provider.tsx               # next-themes color-scheme provider
│   └── ui/                              # Primitive component kit (shadcn / Radix / Satisium)
│
├── config/                              # Configuration single source of truth
│   └── site.ts                          # Site URLs, metadata, sitelinks, FAQs, legal identity
│
├── content/                             # Static editorial & legal content
│   └── legal/                           # Privacy, Terms, Cookies markdown files
│
├── core/                                # Headless motion math, state, and clock engine
│   ├── clock/                           # 120fps requestAnimationFrame animation clock
│   │   └── track-conductor.ts           # Pub/sub clock engine with velocity interruption
│   ├── codec/                           # URL serialization & persistence encoding
│   │   ├── compilers.ts                 # Framework code compilers (CSS, Tailwind, Motion, GSAP)
│   │   ├── hash.ts                      # Lossless base64 URL hash state encoder/decoder
│   │   ├── parsers.ts                   # Motion string tokenizer (cubic-bezier, linear, springs)
│   │   ├── share-link.ts                # Deep-link generator for curve sharing
│   │   └── storage.ts                   # LocalStorage v3 serialization adapter & migrations
│   ├── math/                            # Pure analytical mathematics & physics solvers
│   │   ├── bezier.ts                    # Cubic Bézier solver (Newton-Raphson + Bisection)
│   │   ├── evaluator.ts                 # Multi-channel kinetic frame evaluation & compose
│   │   ├── spring-ode.ts                # Closed-form 2nd-order ODE analytical spring solver
│   │   └── telemetry.ts                 # Settling time (ts), t95, overshoot, peak velocity metrics
│   ├── presets/                         # Canonical motion curves library
│   │   ├── bezier-presets.ts            # CSS standard, Tailwind, Apple, and Material Béziers
│   │   └── spring-presets.ts            # Apple, Android, and design system physics springs
│   ├── registry/                        # Dynamic registries for components and exporters
│   │   ├── exporters.ts                 # Registry of code export targets & copy generators
│   │   ├── tracks.ts                    # Registry of 21 interactive component tracks
│   │   └── tracks/                      # Track definitions with property bindings & defaults
│   ├── schema.ts                        # TypeScript interfaces & types for headless core
│   ├── state/                           # Pure reducer functions for store mutation
│   │   ├── compare-reducers.ts          # Duel contender staging & comparison logic
│   │   ├── curve-tree-reducers.ts       # 2-tier Git-inspired working tree draft reducers
│   │   └── track-reducers.ts            # Channel property bindings & duration overrides
│   └── store/                           # Zustand client store slices
│       ├── create-ease-store.ts         # Store builder merging all slices with conductor
│       ├── slices/                      # Slice implementations (workspace, track, library, etc.)
│       └── types.ts                     # Complete Zustand store state contract
│
├── hooks/                               # Custom React hooks
│   ├── use-clock-ref.ts                 # Imperative high-frequency ref updater
│   ├── use-copy.ts                      # Clipboard copy handler with temporary success state
│   ├── use-ease-store.tsx               # React context provider & hooks for EaseStore
│   ├── use-hotkey.ts                    # Keyboard shortcut binder
│   ├── use-media-query.ts               # Responsive viewport listener
│   ├── use-mounted.ts                   # Hydration readiness flag hook
│   ├── use-paired-habitat.ts            # Habitat entrance/exit paired lifecycle controller
│   ├── use-scroll-spy.ts                # Intersection-observer table-of-contents spy
│   ├── use-track-event.ts               # Telemetry event dispatcher
│   └── use-transition-track.ts          # 120fps zero-re-render DOM style mutator hook
│
├── lib/                                 # Shared utilities, constants, and server helpers
│   ├── analytics.ts                     # Telemetry event firing & PostHog initialization
│   ├── config.ts                        # Re-export of config/site.ts
│   ├── consent-utils.ts                 # Cookie consent state validators
│   ├── consent.tsx                      # Consent context & provider
│   ├── csp.mjs                          # Content Security Policy generator
│   ├── env.ts                           # Environment variable schema & feature flags
│   ├── hotkeys.ts                       # Keyboard shortcut registry
│   ├── legal.ts                         # Legal constants & company metadata
│   ├── logger.ts                        # Structured console logging wrapper
│   ├── metadata.ts                      # Next.js Metadata and OpenGraph builder
│   ├── motion.ts                        # Satisium spring motion tokens & class generators
│   ├── nav.ts                           # Global navigation hierarchy & sitelinks
│   ├── pricing.ts                       # Pricing tier definitions (Open source $0)
│   ├── routes.ts                        # Centralized type-safe URL routing constants
│   ├── social-links.ts                  # Brand & author social links
│   ├── theme-transition.ts              # CSS view-transition theme switcher helper
│   ├── toast.ts                         # Sonner notification helper
│   └── utils.ts                         # cn() tailwind-merge helper
│
├── public/                              # Static public assets (fonts, images, icons, llms.txt)
├── scripts/                             # Utility & CI scripts
│   └── doctor.mjs                       # 15-point repository health & convention checker
│
├── store/                               # Secondary client stores
│   ├── index.ts                         # Barrel export for global UI stores
│   └── use-command-store.ts             # ⌘K Command Menu open/close modal store
│
└── __tests__/                           # Vitest unit & integration test suites (39 files, 382 tests)
```

### Directory Responsibilities

- **`app/`**: Next.js App Router root containing application routes, metadata generators, route handlers (`api/`), and global layout wrapping.
- **`app/api/`**: Serverless endpoints for uptime health probes and dynamic social card generation.
- **`app/app/`**: Main workstation destination rendering the interactive studio interface.
- **`components/`**: All presentational and interactive React components, organized into domain modules.
- **`components/studio/`**: The complete Satisium Ease studio interface, sub-divided into habitats, preview modes, and consoles.
- **`components/ui/`**: Strict atomic Satisium design system primitives built with Radix and Tailwind tokens.
- **`core/`**: 100% headless mathematical and state core with zero React or DOM dependencies.
- **`core/clock/`**: High-frequency 120fps animation driver driving DOM animations outside React's re-render cycle.
- **`core/math/`**: Exact analytical solvers for cubic Bézier curves and second-order ODE spring physics.
- **`core/store/`**: Sliced Zustand store architecture managing studio state, custom curve trees, and compare queues.
- **`hooks/`**: Custom hooks bridging the headless core, DOM elements, and React components.
- **`lib/`**: General-purpose cross-cutting helpers, including security headers, routing, analytics, and motion constants.
- **`public/`**: Publicly accessible web fonts (`Nulshock`, `Plus Jakarta Sans`), SVGs, social images, and `llms.txt`.
- **`scripts/`**: Automation scripts enforcing repository cleanliness, changeset syncing, and convention validation.
- **`store/`**: Lightweight Zustand stores for auxiliary UI state (e.g., Command Palette modal).
- **`__tests__/`**: 39 Vitest integration suites testing math precision, habitat lifecycles, and store operations.

---

## 3. Code Architecture & Data Flow (Engineer Perspective)

### Core Architectural Pattern

Satisium Ease implements an **Uncoupled 120fps Headless Core + Reactive React Shell** pattern.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 16 APP ROUTER                           │
│  app/layout.tsx (SEO, JSON-LD, Fonts) -> app/app/page.tsx (StudioShell)│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
┌───────────────────────────────┐       ┌────────────────────────────────┐
│   HEADLESS STATE & MATH       │       │       REACT UI WORKSTATION     │
│  - Zustand 5 (5 Slices)       │       │  - StudioShell / AuditionView  │
│  - TrackConductor (120fps RAF)│◄──────┤  - Left Flank (PresetCatalog)  │
│  - Spring ODE & Bézier Math   │Syncs  │  - Center Stage (Theaters)     │
│  - LocalStorage / Hash Codec  │       │  - Right Flank (Advisors)      │
└──────────────┬────────────────┘       │  - Master Timeline Console     │
               │                        └────────────────────────────────┘
               ▼                                         │
┌───────────────────────────────┐                        │
│   DIRECT DOM ELEMENT HOOKS    │                        │
│  - useTransitionTrack()       │◄───────────────────────┘
│  - Mutates styles directly    │  Bypasses React Render Cycle
│  - 0 React Component Rerenders│  Guarantees 120fps Fluidity
└───────────────────────────────┘
```

1. **Decoupled 120fps Clock:** High-frequency animation ticks run inside `TrackConductor` (`core/clock/track-conductor.ts`), a pure JavaScript pub/sub animation clock. It runs on `requestAnimationFrame` and never triggers React component renders.
2. **Imperative DOM Mutation:** The `useTransitionTrack` hook (`hooks/use-transition-track.ts`) subscribes directly to the `TrackConductor`. On each 120fps frame, it computes evaluated channel values using `evaluateTrackFrame` and imperatively mutates `element.style.transform`, `element.style.opacity`, and `element.style.clipPath`.
3. **Low-Frequency Reactive Shell:** Zustand handles structural changes: active curve selection, mode switches (`preview` ↔ `customize` ↔ `compare`), draft dirty states (`*`), and modal states.

### Core Data Models (`core/schema.ts`)

- **`EaseCurve`**: Atomic kinetic specification.
  ```ts
  interface EaseCurve {
    id: string
    name: string
    engine: "bezier" | "spring"
    bezier: { p1: Point2D; p2: Point2D }
    spring: {
      mass: number
      stiffness: number
      damping: number
      velocity: number
    }
    suggestedDurationMs: number
    isCustom?: boolean
    parentId?: string
  }
  ```
- **`ChannelBinding`**: Binds a kinetic curve to a concrete UI animatable property (`opacity`, `translateY`, `scale`, etc.).
  ```ts
  interface ChannelBinding {
    id: string
    label: string
    property: AnimatableProperty
    from: number
    to: number
    unit: ChannelUnit
    durationMs: number
    delayMs: number
    curve: EaseCurve
    springMode: "fit" | "natural"
  }
  ```
- **`TransitionTrackPlugin`**: A full choreographic unit coordinating multiple channels (e.g. `dialog:open` controls `translateY`, `scale`, and `backdrop`).
- **`DraftCurveState`**: Git-inspired working tree draft supporting uncommitted live modifications (`workingCurve` vs `parentCurve`, `isDirty: boolean`).
- **`CompareItem`**: Contender curve staged in the Duel arena for benchmark evaluations.

### End-to-End Traces

#### Trace 1: Scrubbing Timeline Slider

1. User drags `SatisSlider` in `TimelineConsole` (`components/studio/modes/audition/center-stage/timeline-console.tsx`).
2. Event calls `store.getState().seekScoped(targetMs)`.
3. Conductor sets `playbackState = "scrubbing"` and updates `elapsedMs`.
4. `useTransitionTrack` receives synchronous tick callback.
5. Computes evaluated values via `evaluateTrackFrame()`. If `isScrubAllChannels === true`, all component channels animate together; if `false`, non-focused channels lock at rest.
6. Values applied directly to DOM node refs via `applyFrameToElement()`. Zero React components re-render.

#### Trace 2: Modifying Curve & Committing to Working Tree

1. User moves control handle in `CurveEditorCanvas` (`components/studio/modes/customize/curve-editor-canvas.tsx`).
2. Canvas dispatches `updateDraft({ bezier: { p1, p2 } })`.
3. `curve-tree-reducers.ts` updates `workingCurve`, sets `isDirty: true`, and computes live analytical diff telemetry (`t95DeltaMs`, `overshootDeltaPercent`, `peakVelocityDelta`).
4. User clicks "Commit" or presses ⌘S.
5. Store calls `commitActiveDraft()`. Draft is committed to `customCurves` root or variant tree in Zustand.
6. `persistence-slice.ts` serializes state to LocalStorage (`satisium-ease-v3`) and compact URL hash (`#c=...`).

#### Trace 3: Code Export (⌘E)

1. User hits ⌘E or clicks "Export". `ExportDialog` opens.
2. User selects framework target: `CSS`, `Tailwind v4`, `Motion`, or `GSAP`.
3. `core/codec/compilers.ts` compiles the active curve:
   - Bézier: Formats `cubic-bezier(x1, y1, x2, y2)`.
   - Spring to CSS: Runs analytical ODE solver across 100 sample points and generates exact `linear(...)` approximation string.
   - Spring to Motion: Emits native `type: "spring", stiffness, damping, mass`.
4. User clicks "Copy Code". `navigator.clipboard.writeText()` is invoked, a Sonner toast notification appears, and an anonymous metric increments via `/api/telemetry`.

### State Management & Caching

- **Client State:** Zustand 5 with 5 slices:
  - `workspace-slice`: Mode (`preview`/`customize`/`compare`), viewport, transport, playback.
  - `track-slice`: Active component track, channel bindings, solo/pin status, scrub scope toggle.
  - `library-slice`: Preset library, custom curves tree, working tree draft state.
  - `compare-slice`: Compare queue, duel contenders, global/per-tile overrides.
  - `persistence-slice`: LocalStorage adapter & URL hash synchronization.
- **Server State / API:** Zero server-side state; 100% client-side execution with edge probes (`/api/health`, `/api/og`).
- **Cache Persistence:** LocalStorage v3 under key `satisium-ease-v3` with backwards migration support for v2 formats. URL hash encoding (`#c=...`) enables deep linking.

### Auth & Permissions

- **Zero Credentials:** Ease is 100% open-source (MIT). No user authentication, sessions, logins, or JWTs exist.
- **Route Protection:** None required; all workstation features are immediately accessible client-side.

---

## 4. UI, Design System & Aesthetics (Designer Perspective)

### Styling Setup

- **Framework:** Tailwind CSS v4 using modern `@import "tailwindcss";` and `@plugin "@tailwindcss/typography";` directives.
- **Color Space:** Native OKLCH color primaries throughout `app/globals.css`.
- **Theme Support:** Dark and light modes orchestrated via `next-themes` using `.dark` class attribute.

### Design Tokens

#### 1. Color Palette (OKLCH)

| Token Name              | Light Value                    | Dark Value                     | Purpose                               |
| :---------------------- | :----------------------------- | :----------------------------- | :------------------------------------ |
| `--background`          | `oklch(1 0 0)`                 | `oklch(0.14 0 0)`              | Canvas substrate                      |
| `--foreground`          | `oklch(0.14 0 0)`              | `oklch(0.98 0 0)`              | Primary text & high-contrast elements |
| `--muted`               | `oklch(0.96 0 0)`              | `oklch(0.20 0 0)`              | Slab backgrounds, secondary panels    |
| `--muted-foreground`    | `oklch(0.55 0 0)`              | `oklch(0.65 0 0)`              | Secondary labels, timestamps, units   |
| `--secondary`           | `oklch(0.96 0 0)`              | `oklch(0.22 0 0)`              | Interactive button backgrounds, chips |
| `--primary` / `--brand` | `oklch(0.6404 0.2153 35.9003)` | `oklch(0.6404 0.2153 35.9003)` | Satisium Vermillion Orange            |
| `--border` / `--input`  | `oklch(0.92 0 0)`              | `oklch(0.24 0 0)`              | Subtle dividers and outlines          |
| `--destructive`         | `oklch(0.6 0.18 25)`           | `oklch(0.65 0.2 25)`           | Error states, revert warnings         |

#### 2. Elevation & Border Rules (The Zero-Shadow Protocol)

- **Zero Borders & Shadows:** As mandated by Satisium's design protocol, all drop shadows are neutralized (`--shadow-*: none`).
- **Depth via Luminance:** Elevation is communicated purely through luminance shifts between slabs:
  - Sunken / Inset: `bg-muted`
  - Base / Substrate: `bg-background`
  - Raised / Floating: `bg-card` or `bg-secondary`
- **Squircle Radii:** Satisium squircle geometry:
  - Outer Slabs: `rounded-[20px]`
  - Medium Modules / Dialogs: `rounded-[14px]` or `rounded-[12px]`
  - Buttons / Chips: `rounded-[8px]` or `rounded-[10px]`
  - Base `--radius`: `1.4rem`

#### 3. Typography Hierarchy

| Font Family           | CSS Variable       | Fallback / Sourced                      | Usage                                          |
| :-------------------- | :----------------- | :-------------------------------------- | :--------------------------------------------- |
| **Plus Jakarta Sans** | `--font-heading`   | Next Google Font                        | Component titles, slab headers, modal headings |
| **Inter**             | `--font-body`      | Next Google Font                        | General UI text, descriptions, tooltips        |
| **IBM Plex Mono**     | `--font-code`      | Next Google Font                        | Code export, coordinates, formula syntax       |
| **Nulshock Bold**     | `--font-brand`     | Local Font (`public/nulshock.bold.otf`) | Satisium master logotype                       |
| **Newsreader**        | `--font-editorial` | Next Google Font                        | Editorial callouts and quotes                  |
| **Caveat**            | `--font-caveat`    | Next Google Font                        | Hand-drawn diagram annotations                 |

### Component Architecture

- **UI Primitives (`components/ui/*`):** Radix-backed primitives wrapped in Satisium styling tokens:
  - `button.tsx`: Squircle buttons with press compression (`SATISIUM_PRESS_CLASS`).
  - `dialog.tsx`: Modals with pure luminance elevation.
  - `slider.tsx`: Custom precision sliders (`SatisSlider` 120fps imperative driver).
  - `select.tsx`, `tabs.tsx`, `tooltip.tsx`, `kbd.tsx`, `badge.tsx`.
- **Interactive Component Habitats (`components/studio/habitats/*`):** 21 real-world UI components used to test motion curves live:
  - **Overlays:** `DialogHabitat`, `BottomSheetHabitat`, `DrawerHabitat`, `CommandPaletteHabitat`, `DropdownHabitat`, `HoverCardHabitat`.
  - **Controls:** `MorphButtonHabitat`, `DynamicPillHabitat`, `SegmentedSwitchHabitat`, `FloatingInputHabitat`, `ToggleSwitchHabitat`.
  - **Disclosure:** `AccordionTreeHabitat`, `CollapsiblePanelHabitat`, `ToastStackHabitat`, `NotificationCenterHabitat`.
  - **Landing:** `HeroRevealHabitat`, `FlipWordsHabitat`, `BentoCardHabitat`, `PricingCardHabitat`.
  - **Lab:** `PrimitivesXRay` (4-card simultaneous testbed for Position, Scale, Rotation, Opacity).

### Screen & Route Inventory

| Route         | View Component                        | Description                                                                   |
| :------------ | :------------------------------------ | :---------------------------------------------------------------------------- |
| `/`           | `app/page.tsx`                        | Permanent 308 redirect to `/app`.                                             |
| `/app`        | `StudioShell` (`app/app/page.tsx`)    | The complete Satisium Ease Studio Workstation (Audition, Customize, Compare). |
| `/privacy`    | `LegalPage` (`app/(legal)/[...slug]`) | Satisium Privacy Policy & local-first commitment.                             |
| `/terms`      | `LegalPage` (`app/(legal)/[...slug]`) | MIT open-source terms and usage agreement.                                    |
| `/cookies`    | `LegalPage` (`app/(legal)/[...slug]`) | Cookie usage and telemetry disclosure.                                        |
| `/api/health` | Route Handler (`api/health/route.ts`) | JSON liveness probe reporting uptime, version, and active features.           |
| `/api/og`     | Route Handler (`api/og/route.tsx`)    | Generates 1200x630 dynamic OpenGraph social preview images.                   |

---

## 5. Build, Infrastructure & Deployment (Deployer Perspective)

### CI/CD Pipeline (`.github/workflows`)

- **`ci.yml` (Runs on PR and Push to `main`):**
  - **Quality Job:** Runs `pnpm lint`, `pnpm typecheck`, and `pnpm doctor` (15-point repository validator).
  - **Unit Job:** Runs `pnpm test:coverage` on Node 22, uploading code coverage artifacts.
  - **Build Job:** Validates Next.js production build (`pnpm build`).
- **`release.yml` (Runs on Push to `main`):**
  - Automates package versioning and changelog publishing via `@changesets/cli`.

### NPM Scripts Reference

```bash
pnpm dev              # Starts Next.js with Turbopack (http://localhost:3000)
pnpm build            # Generates optimized production build
pnpm start            # Runs production standalone Next.js server
pnpm lint             # Executes ESLint check
pnpm typecheck        # Executes TypeScript validation (tsc --noEmit)
pnpm doctor           # Runs 15-point Satisium repository health & convention checker
pnpm test             # Runs all Vitest suites once (vitest run)
pnpm test:watch       # Runs Vitest in interactive watch mode
pnpm test:coverage    # Runs Vitest with V8 code coverage report
pnpm e2e              # Runs Playwright browser regression & accessibility tests
pnpm verify           # Complete pre-commit gate (lint + typecheck + test + build)
pnpm changeset        # Creates a new Changeset entry for release notes
```

### Environment Variables

#### Public (Client-Side, Prefix `NEXT_PUBLIC_`)

- `NEXT_PUBLIC_SITE_URL`: Canonical URL origin (e.g., `https://ease.satisium.com`).
- `NEXT_PUBLIC_DOCS_LAYOUT`: Active docs shell (`spatial` vs `three-pane`).
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`: PostHog analytics project token (optional).
- `NEXT_PUBLIC_POSTHOG_HOST`: PostHog endpoint host (defaults to `https://us.i.posthog.com`).
- `NEXT_PUBLIC_GA_ID`: Google Analytics 4 Measurement ID (optional).
- `NEXT_PUBLIC_SENTRY_DSN`: Sentry client error monitoring DSN (optional).
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`: Google Search Console verification token.
- `NEXT_PUBLIC_BING_SITE_VERIFICATION`: Bing Webmaster verification token.
- `NEXT_PUBLIC_APP_VERSION`: Current deployment version string.

#### Private (Server-Side Only)

- `NODE_ENV`: Runtime environment (`development`, `production`, `test`).
- `SENTRY_DSN`: Sentry backend error monitoring DSN.
- `GIT_TOKEN`: GitHub personal access token for repository data queries.
- `ANALYZE`: Set to `true` to build with `@next/bundle-analyzer`.

> [!IMPORTANT]
> **The Zero-Key Rule:** Satisium Ease strictly enforces the Zero-Key Rule. The entire app will boot, build, run, and pass all 39 test suites with an empty `.env.local`. All external services (PostHog, Sentry, GA) fail gracefully to local in-memory fallbacks or silent no-ops.

### External Services & Integrations

- **Hosting:** Vercel (Edge network, global CDN, serverless functions).
- **Analytics & Telemetry:** PostHog (self-hosted or cloud proxy via `/ingest/*` rewrites).
- **Security:** Strict Content Security Policy (CSP) headers generated in `lib/csp.mjs`.

---

## 6. Code Quality, Conventions & Tech Debt (Maintainer Perspective)

### Linters, Formatters & Typecheck Strictness

- **TypeScript (`tsconfig.json`):** `strict: true`, `noEmit: true`, `target: ES2017`, `moduleResolution: bundler`. Path aliases `@/*` and `collections/*`.
- **ESLint (`eslint.config.mjs`):** Extends `eslint-config-next` with zero warnings allowed in CI.
- **Prettier (`.prettierrc`):** 2 spaces, semi-colons omitted where standard, single quotes where appropriate, `prettier-plugin-tailwindcss` enabled.
- **Commitlint:** Conventional Commits enforced on all commits via Husky pre-commit hooks (`feat:`, `fix:`, `chore:`, etc.).
- **Doctor Check (`scripts/doctor.mjs`):** Evaluates 15 custom Satisium rules before any code is committed.

### File & Component Naming Conventions

- **Files:** Strictly `kebab-case.tsx` or `kebab-case.ts` (e.g. `curve-editor-canvas.tsx`, `spring-ode.ts`).
- **Components:** `PascalCase` exported named functions (e.g., `export function StudioShell()`).
- **Hooks:** Prefixed with `use-` in `kebab-case.ts` (e.g. `use-transition-track.ts`).
- **Constants:** `UPPER_SNAKE_CASE` for immutable primitives (e.g. `SATISIUM_SPRING_PILL`).

### Error Handling & Telemetry Patterns

- **UI Errors:** Wrapped with `ErrorBoundary` (`components/error-boundary.tsx`), surfacing an actionable reset button without crashing the studio shell.
- **Fatal App Errors:** `app/global-error.tsx` provides root-level recovery.
- **Logging:** Structured logging routed through `lib/logger.ts` (`logger.info`, `logger.warn`, `logger.error`), never bare `console.log`.

### Current Test Coverage & Health

- **Unit & Integration:** Vitest 5.0.3 (`pnpm test`): **39 test files passed, 382 tests passed (100% success rate)**.
- **E2E Smoke Tests:** Playwright (`pnpm e2e`): Verifies workstation load, 120fps slider interaction, and Axe accessibility compliance.

### Technical Debt & High-Complexity Areas

1. **Monolithic Canvas Component (`curve-editor-canvas.tsx` — 1,415 lines):**
   - _Nature:_ Hosts SVG canvas drawing, drag interactions for Bézier control handles, spring curve waveform plotting, velocity vector overlays, and velocity derivative graphs.
   - _Recommendation:_ Future refactoring should extract the SVG grid renderer and velocity graphs into dedicated sub-components (`canvas-grid.tsx`, `velocity-graph.tsx`).
2. **State Serialization (`core/codec/storage.ts` — 846 lines):**
   - _Nature:_ Implements custom compression, base64 URL hash encoding, and migration logic between v1/v2 and v3 storage schemas.
   - _Status:_ Thoroughly covered by unit tests (`codec.test.ts`, `persistence-v3.test.ts`), but complex to modify.
3. **Analytical Spring ODE Mathematics (`core/math/spring-ode.ts` — 421 lines):**
   - _Nature:_ Solves underdamped ($c^2 < 4mk$), critically damped ($c^2 = 4mk$), and overdamped ($c^2 > 4mk$) differential equations with velocity continuity.
   - _Status:_ High-value intellectual property; mathematical invariants are locked with rigorous test coverage.
4. **TODO / FIXME Inventory:**
   - Scan found exactly **1 minor TODO** in the codebase:
     - `components/icons.tsx:183`: `// TODO Don't forget to add credits to streamline.hq`
   - Zero `FIXME` or `HACK` comments exist in the active codebase.

---

_This document was generated via direct inspection of all source code, manifests, and test suites in `satisium/ease` on November 22, 2026._
