#!/usr/bin/env node
import { execSync } from "node:child_process";

if (process.env.ALLOW_MAIN_PUSH === "1" || process.env.CI === "true") {
  process.exit(0);
}

let branch = "";
try {
  branch = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {
  process.exit(0);
}

if (branch === "main" || branch === "master") {
  console.error(
    [
      "",
      `[satisium-guard] Blocked: direct commits/pushes to "${branch}" are not allowed.`,
      "Create a prefixed branch first:",
      "  git checkout -b feat/<slug>   (or fix/, chore/, docs/, refactor/)",
      "Emergency human override only: ALLOW_MAIN_PUSH=1 <command>",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
