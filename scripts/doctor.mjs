#!/usr/bin/env node
/**
 * pnpm doctor — pre-flight checks for a Satisium product.
 * Real problems exit 1; warnings never fail the run.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const problems = []
const warnings = []
const passed = []

const abs = (p) => path.join(ROOT, p)
const exists = (p) => fs.existsSync(abs(p))
const read = (p) => fs.readFileSync(abs(p), "utf-8")

// 1 — runtime
const major = Number(process.versions.node.split(".")[0])
if (major >= 20) passed.push(`Node ${process.versions.node}`)
else problems.push(`Node ${process.versions.node} — need >= 20`)

// 2 — env parity: .env.example <-> lib/env.ts
if (!exists(".env.example")) problems.push(".env.example is missing")
else if (!exists("lib/env.ts")) warnings.push("lib/env.ts missing — cannot check env parity")
else {
  const exampleKeys = new Set(
    read(".env.example")
      .split("\n")
      .map((line) => line.match(/^([A-Z0-9_]+)=/)?.[1])
      .filter(Boolean)
  )
  const codeKeys = new Set(
    Array.from(read("lib/env.ts").matchAll(/([A-Z][A-Z0-9_]{3,})\s*:/g), (m) => m[1])
  )
  const onlyExample = [...exampleKeys].filter((key) => !codeKeys.has(key))
  const onlyCode = [...codeKeys].filter((key) => !exampleKeys.has(key))

  if (onlyExample.length)
    warnings.push(`In .env.example but not parsed in lib/env.ts: ${onlyExample.join(", ")}`)
  if (onlyCode.length)
    warnings.push(`Parsed in lib/env.ts but missing from .env.example: ${onlyCode.join(", ")}`)
  if (!onlyExample.length && !onlyCode.length) passed.push(`env parity (${exampleKeys.size} vars)`)
}

// 3 — required assets
const requiredAssets = [
  "public/PlusJakartaSans-Bold.ttf",
  "public/og-bg-optimized.jpg",
  "app/icon.svg",
  "app/favicon.ico",
]
const missingAssets = requiredAssets.filter((asset) => !exists(asset))
if (missingAssets.length) problems.push(`Missing assets: ${missingAssets.join(", ")}`)
else passed.push("brand + OG assets present")

// 4 — Satisium Ease Core & Studio Integrity
const EASE_CORE_STUDIO_FILES = [
  "core/index.ts",
  "core/store/create-ease-store.ts",
  "core/registry/tracks/index.ts",
  "components/studio/studio-shell.tsx",
  "components/studio/habitats/habitat-stage.tsx",
]
const missingEaseFiles = EASE_CORE_STUDIO_FILES.filter((p) => !exists(p))
if (missingEaseFiles.length === 0) {
  passed.push(
    `Satisium Ease core & studio integrity (${EASE_CORE_STUDIO_FILES.length} modules intact)`
  )
} else {
  problems.push(
    `Ease integrity violation: missing core/studio modules: ${missingEaseFiles.join(
      ", "
    )}`
  )
}

// 5 — llms artifacts
if (!exists("public/llms.txt")) problems.push("public/llms.txt missing")
else passed.push("llms artifact present")

// 6 — route discipline: literal hrefs inside components/
const offenders = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(abs(dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) walk(rel)
    else if (rel.endsWith(".tsx")) {
      const hits = [...read(rel).matchAll(/href="(\/[a-z0-9-\/\[\]]*)"/g)].map((m) => m[1])
      if (hits.length) offenders.push(`${rel}: ${[...new Set(hits)].join(", ")}`)
    }
  }
}
if (exists("components")) walk("components")
if (offenders.length)
  warnings.push(`Literal routes in components (use lib/routes.ts):\n    ${offenders.join("\n    ")}`)
else passed.push("no literal routes in components")

// 7 — accessibility floor: icon-only buttons carry a label
const unlabelled = []
const scanButtons = (dir) => {
  for (const entry of fs.readdirSync(abs(dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) scanButtons(rel)
    else if (rel.endsWith(".tsx")) {
      const source = read(rel)
      const bareIcons = source.match(/<button(?![^>]*aria-label)[^>]*>\s*<(HugeiconsIcon|\.\.\.)/g)
      if (bareIcons) unlabelled.push(rel)
    }
  }
}
if (exists("components")) scanButtons("components")
if (unlabelled.length) warnings.push(`Buttons possibly missing aria-label: ${unlabelled.join(", ")}`)
else passed.push("button labels look good")

// 8 — domain discipline: strictly satisium.com (zero tolerance for .dev or other TLD assumptions)
const FORBIDDEN_DOMAINS = [/satisium\.dev/g, /satisium\.io/g, /satisium\.app/g]
const domainOffenders = []
const scanForBadDomains = (dir, extFilter = /\.(tsx?|mjs|mdx?|json)$/) => {
  if (!exists(dir)) return
  for (const entry of fs.readdirSync(abs(dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      if (
        entry.name !== "node_modules" &&
        entry.name !== ".next" &&
        entry.name !== ".git"
      ) {
        scanForBadDomains(rel, extFilter)
      }
    } else if (extFilter.test(entry.name)) {
      const content = read(rel)
      for (const pattern of FORBIDDEN_DOMAINS) {
        if (pattern.test(content)) {
          domainOffenders.push(`${rel} matches ${pattern}`)
          break
        }
      }
    }
  }
}

for (const dir of ["config", "components", "app", "lib", "content", "scripts"]) {
  scanForBadDomains(dir)
}
if (domainOffenders.length === 0)
  passed.push("domain discipline (strictly satisium.com)")
else {
  problems.push(
    `Forbidden domain detected (Satisium is strictly 'satisium.com'):\n    ${domainOffenders.join("\n    ")}`
  )
}


// report
console.log("\n🩺  Satisium doctor\n")
for (const line of passed) console.log(`  ✅ ${line}`)
for (const line of warnings) console.log(`  ⚠️  ${line}`)
for (const line of problems) console.log(`  ❌ ${line}`)
console.log(`\n  ${passed.length} passed · ${warnings.length} warnings · ${problems.length} problems\n`)

if (problems.length) process.exit(1)
