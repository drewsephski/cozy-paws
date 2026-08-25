# Plan 002: Patch the vulnerable Tailwind build dependency

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. Stop and report if a dependency update expands beyond the stated
> Tailwind build chain. Update `plans/README.md` when complete.

> **Drift check (run first)**: `git diff --stat c99d0e6..HEAD -- package.json pnpm-lock.yaml`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c99d0e6`, 2026-08-25

## Why this matters

The current lockfile resolves `tar@7.4.3` through
`@tailwindcss/postcss@4.1.6` → `@tailwindcss/oxide@4.1.6`. `pnpm audit
--audit-level high` reports critical/high decompression DoS and archive
path/symlink traversal advisories for that package. This is a development and
CI build path rather than application request code, but it is still a
reachable distribution/build supply-chain risk and CI currently installs it
from the lockfile.

## Current state

- `package.json:45-53` declares Tailwind 4 packages with caret ranges.
- `pnpm why tar` shows the vulnerable path through the Tailwind build tools.
- `.github/workflows/ci.yml:45-50` runs a frozen install and build on every
  pull request and `main` push.
- The repository uses pnpm 10.12.4; do not switch package managers or hand-edit
  the lockfile.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Baseline audit | `pnpm audit --audit-level high` | Reproduces the current high/critical `tar` findings before the change |
| Inspect dependency | `pnpm why tar --recursive` | Shows only the intended build-chain path |
| Frozen install | `pnpm install --frozen-lockfile` | Exit 0 |
| Audit after update | `pnpm audit --audit-level high` | Exit 0, or only findings proven unrelated and documented for the maintainer |
| Verification | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` | All commands exit 0 |

## Scope

**In scope**:

- `package.json`
- `pnpm-lock.yaml`

**Out of scope**:

- Application source, Tailwind class rewrites, Next.js upgrades, and unrelated
  dependency refreshes
- Suppressing audit output, adding an ignore rule, or relying on a non-frozen
  local install

## Steps

### Step 1: Identify the smallest patched resolution

Use the audit output and current package metadata to determine whether a
patched `@tailwindcss/postcss`/`@tailwindcss/oxide` release resolves `tar` to
`>=7.5.19`. Prefer the smallest compatible direct-package update. Only use a
pnpm override if the upstream package still resolves a vulnerable tar and the
override is compatible with the Tailwind toolchain; record that reason in the
package manifest comment or plan handoff if an override is necessary.

**Verify**: `pnpm why tar --recursive` → the resolved version is patched and
the path remains the Tailwind build chain.

### Step 2: Update with pnpm and review the lockfile

Run the appropriate pnpm update command for the selected direct package(s),
then inspect `git diff -- package.json pnpm-lock.yaml`. Keep the diff limited to
the intended package and transitive resolution changes. Do not update Next,
React, AI SDK, or provider packages in the same change.

**Verify**: `pnpm install --frozen-lockfile` → exit 0; `git diff --check` → no
whitespace errors.

### Step 3: Run the complete local build gate

Run the repository's lint, typecheck, unit tests, and production build. If the
Tailwind upgrade causes a class-generation or build error, stop after one
focused compatibility check and report instead of broadening the upgrade.

**Verify**: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` → all exit 0.

## Done criteria

- [ ] `tar` resolves to a patched version through the Tailwind path.
- [ ] `pnpm audit --audit-level high` no longer reports the current high/critical
      `tar` advisories, or a remaining advisory has a documented maintainer
      decision outside this plan.
- [ ] Frozen install, lint, typecheck, tests, and build pass.
- [ ] Only `package.json`, `pnpm-lock.yaml`, and the plan status changed.

## STOP conditions

- The patched resolution requires an unrelated major framework upgrade.
- The audit reports a reachable production dependency vulnerability that this
  narrow update cannot address; report it separately.
- The lockfile diff includes broad unrelated package churn.
- The build fails and cannot be isolated to the intended Tailwind update.

## Maintenance notes

Keep the audit command in release hygiene. The CI workflow should continue to
use frozen installs; never treat a clean developer install without a committed
lockfile diff as a security fix.
