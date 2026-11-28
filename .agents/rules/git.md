---
trigger: always_on
---

# Satisium Git & PR Governance Law

All repositories in the `satisium` GitHub organization follow strict **Trunk-Based Development**.

1. **Zero Autonomous Git Writes:** Never run `git commit`, `git push`, `git tag`, `git merge`, `gh pr create`, or `gh pr merge` unless explicitly instructed in the current prompt.
2. **Never Commit or Push Directly to `main`:** `main` maps 1:1 to production. Even when explicitly instructed to commit or push, check the current branch first (`git rev-parse --abbrev-ref HEAD`). If on `main` or `master`, create a short-lived branch first before committing.
3. **Mandatory Branch Prefixes:** Every branch MUST use one of:
   - `feat/<short-slug>` — new capability
   - `fix/<short-slug>` — bug fix
   - `chore/<short-slug>` — maintenance, deps, or Spine sync
   - `docs/<short-slug>` — documentation only
   - `refactor/<short-slug>` — internal restructuring with no behavior change
4. **Conventional Commits & PR Titles:** Every commit message and PR title MUST follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `ci:`, `test:`), because all repos use **Squash and Merge** and `release-please` derives SemVer bumps and changelogs from PR titles.
5. **Never Bypass Guardrails or Merge Autonomously:** Never pass `--no-verify`, `--force`, or `ALLOW_MAIN_PUSH=1`. Never merge a PR autonomously (even when CI is green)—merging to `main` is strictly a human action.
