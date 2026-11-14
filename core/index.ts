/**
 * @file core/index.ts
 * @description Master public barrel export for Satisium Ease Headless Core.
 *
 * Guaranteed Invariants:
 * - 100% pure TypeScript. Zero React or DOM dependencies.
 * - Single entry point for all math solvers, compilers, presets, registries, state reducers, codecs, and headless store.
 */

// 1. Canonical Schema & Domain Types
export * from "./schema"

// 2. Pure Mathematical Solvers & Compilers
export * from "./math/bezier"
export * from "./math/spring-ode"
export * from "./math/spring-compilers"
export * from "./math/parser"
export * from "./math/telemetry"
export * from "./math/evaluator"

// 3. Canonical Built-in Presets & Starter Customs
export * from "./presets/index"

// 4. Extensible Registries (Plugins, Solvers, Tracks, Exporters)
export * from "./registry/plugin-registry"
export * from "./registry/solvers"
export * from "./registry/tracks"
export * from "./registry/exporters"

// 5. 120fps Track Conductor State Machine
export * from "./clock/track-conductor"

// 6. Pure Functional State Reducers
export * from "./state/curve-tree-reducers"
export * from "./state/track-reducers"
export * from "./state/compare-reducers"

// 7. Codecs, Serialization & Command Search
export * from "./codec/url-hash"
export * from "./codec/storage"
export * from "./codec/search"

// 8. Framework-Agnostic Headless Store
export * from "./store/create-ease-store"
