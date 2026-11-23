# Contributing to Satisium Ease

Thank you for your interest in contributing to **Satisium Ease**! This guide outlines our architectural standards, local development workflow, and pull request guidelines.

---

## Prerequisites & Setup

- **Node.js:** `>= 20.9` (Node 20+ LTS recommended)
- **Package Manager:** `pnpm` (`>= 10.0`)

```bash
# 1. Fork and clone the repository
git clone https://github.com/<your-username>/ease.git
cd ease

# 2. Install dependencies
pnpm install

# 3. Start the Turbopack local development server (Zero-Env: no .env needed!)
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the Ease Studio workstation (`/app`).

---

## Architectural Invariants

Every contribution must honor the following non-negotiable architectural rules:

1. **`core/` Is 100% Pure TypeScript:**
   - The `core/` package holds mathematics, ODE spring physics, Bézier solvers, code compilers, and state stores.
   - **Zero React or DOM imports** are allowed in `core/`. It must execute seamlessly in Node, Web Workers, and headless environments.
2. **120fps GPU-Accelerated Habitat Motion:**
   - All motion in the 21 UI audition habitats is coordinated by `TrackConductor` via direct GPU-accelerated CSS transforms (`transform`, `translate3d`, `opacity`).
   - Zero React state rerenders or component mounting during active tick playback.
3. **Satisium Design Tokens:**
   - **Tokens only.** Never use raw hex/rgb values or arbitrary tailwind colors.
   - **Zero opacity modifiers.** Do not append `/opacity` modifiers (e.g. `bg-secondary/70`). Use discrete semantic luminance tokens (`bg-muted`, `bg-secondary`, `bg-card`).
   - **Zero shadows & borders in docs.** Depth is established solely through OKLCH luminance steps.
4. **Iconography Discipline:**
   - Use exclusively `@hugeicons/react` (`strokeWidth={1.5}` or `2`).
5. **Route & Hotkey Discipline:**
   - Every internal path must come from `lib/routes.ts`. Never write literal strings like `href="/app"`.
   - All keyboard shortcuts must be registered in `lib/hotkeys.ts` first, then bound with `hooks/use-hotkey.ts`.

---

## Commit Conventions

We follow **[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)**:

```
<type>(<scope>): <short description>
```

### Allowed Types

- `feat`: A new capability, exporter, habitat, or preset
- `fix`: A bug fix or kinematic correction
- `docs`: Documentation updates, MDX additions, or AEO/GEO calibrations
- `refactor`: Structural code cleanup with no behavior change
- `perf`: Numerical solver or RAF tick loop performance optimizations
- `chore`: Tooling, dependencies, or CI updates

### Common Scopes

- `core`: Mathematical solvers, spring ODE kinematics, store, or compilers
- `studio`: Studio shell, modes (Audition, Customize, Compare), or slabs
- `habitats`: Habitat stages and track conductors
- `docs`: MDX guides, presets, and LLM surfaces
- `export`: Multi-framework code generators

---

## Pull Request Process

1. **Branching:** Create a descriptive branch from `main`:
   ```bash
   git checkout -b feat/linear-sampling-optimization
   ```
2. **Local Verification Checklist:**
   Before pushing, verify that all quality gates pass locally:
   ```bash
   pnpm typecheck    # fumadocs-mdx + tsc --noEmit
   pnpm lint         # ESLint checks
   pnpm test         # Vitest unit & integration suites
   pnpm doctor       # Satisium 14-contract architectural health check
   ```
3. **Changesets:**
   If your change impacts user-facing behavior, record a changeset:
   ```bash
   pnpm changeset
   ```
4. **Submit PR:** Open a clean pull request against `satisium/ease` `main`. Provide a concise summary of the changes and any visual proof (screenshots or clips for UI modifications).

---

## Community & Discussions

Have questions about contributing or need feedback on a pull request?

- Join the **[Satisium Discord](https://discord.gg/68UQV3qaG)**.
- Use **`#ease-support`** for developer support and setup questions.
- Use **`#ease-chat`** and **`#ease-requests`** for architectural discussions.
- Report issues or propose RFCs via [GitHub Issues](https://github.com/satisium/ease/issues).
