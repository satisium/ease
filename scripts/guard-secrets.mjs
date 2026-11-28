#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const RULES = [
  { name: "GitHub Classic Token", regex: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  {
    name: "GitHub Fine-Grained Token",
    regex: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g,
  },
  { name: "AWS Access Key ID", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Stripe Live Key", regex: /\b[rs]k_live_[A-Za-z0-9]{20,}\b/g },
  { name: "PostHog Personal API Key", regex: /\bphx_[A-Za-z0-9]{20,}\b/g },
  {
    name: "Private Key Block",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
  },
];

let files = [];
try {
  const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  files = output ? output.split("\n").filter(Boolean) : [];
} catch {
  process.exit(0);
}

const findings = [];

for (const rel of files) {
  if (rel === "scripts/guard-secrets.mjs") continue;
  const abs = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;

  const buf = fs.readFileSync(abs);
  if (buf.includes(0)) continue; // skip binary files

  const text = buf.toString("utf8");
  for (const rule of RULES) {
    rule.regex.lastIndex = 0;
    if (rule.regex.test(text)) {
      findings.push(`${rel}: potential ${rule.name}`);
    }
  }
}

if (findings.length > 0) {
  console.error(
    "\n[satisium-guard] Potential secret(s) detected in staged files:",
  );
  for (const f of findings) console.error(`  ✗ ${f}`);
  console.error("Remove the secret(s) before committing.\n");
  process.exit(1);
}
