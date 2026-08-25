# Plan 001: Repair service-list editing in AI review drafts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the STOP conditions occurs, stop and report—do not
> improvise. When done, update the status row for this plan in
> `plans/README.md`.

> **Drift check (run first)**: `git diff --stat c99d0e6..HEAD -- app/admin/import/rover/rover-import-client.tsx app/admin/import/rover/review-store.ts app/admin/import/rover/review-store.test.ts`
> Also inspect the current working-tree diff. The existing changes to
> `lib/profile-import/rover.ts`, `lib/profile-import/portrait*`, and
> `lib/profile-import/screenshot-slices*` belong to the operator and must not
> be overwritten.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c99d0e6`, 2026-08-25

## Why this matters

The AI review lets a sitter edit the imported service list, but it leaves
service details and confidence entries keyed by removed or renamed services.
The later browser-draft normalizer rejects any detail whose key is not in the
current service list, so a normal edit can strand the sitter's work and make
the draft impossible to apply. The fix must make service-list edits safe while
preserving the existing review-before-apply and server-side normalization
contracts.

## Current state

- `app/admin/import/rover/rover-import-client.tsx:135-137` updates
  `reviewed.services` but does not synchronize `reviewed.serviceDetails` or
  `serviceConfidence` when services are removed or renamed.
- `app/admin/import/rover/review-store.ts:84-103` requires every
  `serviceDetails` key to exist in `reviewed.services` and rejects the whole
  draft otherwise.
- `app/admin/import/rover/rover-import-client.tsx:141-151` runs that same
  normalizer immediately before apply, so this is not only a refresh problem.
- The repository uses pure normalization tests in
  `app/admin/import/rover/review-store.test.ts`; keep the UI thin and put the
  synchronization rule in a pure helper that can be tested without a browser.
- A changed service name has no safe identity mapping. Preserve details only
  for unchanged names; remove stale details/confidence for names no longer in
  the edited list and let the sitter re-enter details for a renamed service.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused regression tests | `pnpm test -- app/admin/import/rover/review-store.test.ts` | All review-store tests pass, including the stale-service case |
| Typecheck | `pnpm typecheck` | Exit 0, no TypeScript errors |
| Lint | `pnpm lint` | Exit 0; existing image warnings may remain |
| Full unit suite | `pnpm test` | All tests pass |

## Scope

**In scope**:

- `app/admin/import/rover/rover-import-client.tsx`
- `app/admin/import/rover/review-store.ts`
- `app/admin/import/rover/review-store.test.ts`

**Out of scope**:

- `lib/profile-import/rover.ts` and all portrait/screenshot files currently
  modified in the user's working tree
- AI prompts, provider configuration, database schema, and profile apply rules
- Silent transfer of details from an old service name to a newly typed name

## Steps

### Step 1: Add the failing regression case

Add a pure test fixture with valid review metadata, two services, details for
both services, and confidence for both. Pass an edited service list containing
only one original service through the helper/normalization path and assert that
the result is restorable and contains no removed service detail or confidence.
Also cover renaming one service: the renamed service must remain in the list,
but the old keyed detail must not survive under the wrong name.

**Verify**: `pnpm test -- app/admin/import/rover/review-store.test.ts` → the new
regression test fails against the current implementation for the stale-key
case, confirming it exercises the bug.

### Step 2: Implement one synchronization helper

Add a small pure helper beside the review-store normalization code that accepts
the next service-name array plus the existing `serviceDetails` and
`serviceConfidence` maps, retains entries whose exact service name remains,
and drops all other keys. Use it from `updateServices` in the client. Keep the
existing eight-service limit and value trimming behavior. Do not weaken
`normalizeRestorableRoverReview`; invalid persisted data must still be
discarded safely.

**Verify**: `pnpm test -- app/admin/import/rover/review-store.test.ts` → all
tests pass, including removal and rename cases.

### Step 3: Prove same-tab apply behavior

Ensure the edited `Review` passed to `normalizeRestorableRoverReview` after a
service removal is accepted and that `updateServiceDetail` still writes only
to a currently selected service. If a helper is exported solely for testing,
keep its interface domain-specific and document why exact-name retention is
intentional.

**Verify**: `pnpm typecheck && pnpm lint` → both commands exit 0.

## Test plan

- Model tests after the existing review-store tests.
- Cover removing a service with details, renaming a service, editing details
  for a retained service, and an unchanged multi-service review.
- Confirm the persisted draft contains no stale service keys and remains
  accepted by `normalizeRestorableRoverReview`.

## Done criteria

- [ ] Service removal or rename cannot make a review draft unappliable.
- [ ] Removed/renamed service details and confidence are discarded rather than
      silently attributed to another service.
- [ ] `pnpm test -- app/admin/import/rover/review-store.test.ts` passes.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass.
- [ ] No files outside the in-scope list are modified, apart from the required
      `plans/README.md` status update.

## STOP conditions

- The current `updateServices` or normalizer no longer matches the excerpts.
- The fix appears to require changing server-side profile merge or migration
  behavior.
- A proposed solution transfers details across renamed services by position or
  fuzzy matching.
- Any existing dirty Rover portrait/screenshot file would need to be reset or
  overwritten.

## Maintenance notes

If service identity later gains stable IDs, revisit exact-name retention and
consider a migration of detail keys. Reviewers should verify that this client
helper cannot bypass the server's final `normalizeReviewedProfilePatch` gate.
