# Plan 003: Show AI import provenance without persisting provider artifacts

> **Executor instructions**: Follow this plan step by step. The current Rover
> POC privacy contract is binding: no screenshot, prompt, raw model response,
> provider key, authentication token, or durable raw artifact may be stored.
> Stop rather than relaxing that boundary. Update `plans/README.md` when done.

> **Drift check (run first)**: `git diff --stat c99d0e6..HEAD -- lib/profile-import/openrouter-vision.ts lib/profile-import/types.ts lib/profile-import/rover.ts app/admin/import/rover/rover-import-client.tsx app/admin/import/rover/review-store.ts lib/profile-import/openrouter-vision.test.ts app/admin/import/rover/review-store.test.ts lib/profile-import/rover.test.ts`
> Inspect the working-tree diff before touching `lib/profile-import/rover.ts`;
> the operator already has Rover-related changes there.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-repair-ai-review-service-editing.md`
- **Category**: direction
- **Planned at**: commit `c99d0e6`, 2026-08-25

## Why this matters

The vision prompt requires a short visible evidence snippet for every accepted
candidate, and the parser currently uses that evidence as a safety gate. It
then drops the snippet and returns only the value and confidence. The review
UI consequently tells the sitter “Check this” without showing what the model
saw, which makes correction slower and weakens trust in the import. This plan
adds bounded, plain-text provenance for the active review session only; refresh
restoration continues to recover fields but never stores provider artifacts.

## Current state

- `lib/profile-import/openrouter-vision.ts:7,9-23,56-59` requires
  `visibleEvidence`, but `usable` returns only `value` and `confidence`.
- `lib/profile-import/openrouter-vision.ts:85-123` builds the reviewed patch
  and confidence maps without any evidence map.
- `lib/profile-import/types.ts:40-45` exposes no evidence in
  `ProfileVisionResult`.
- `app/admin/import/rover/review-store.ts:8` explicitly forbids
  `visibleEvidence` in browser persistence; retain that protection.
- `app/admin/import/rover/rover-import-client.tsx:33-35,178-183,204-216`
  renders confidence labels and current-value hints, but no source evidence.
- The accepted Rover decisions require ephemeral provider artifacts and allow
  only normalized text candidates in the browser draft. Therefore evidence may
  live in React state during the active response/review, but must be removed
  before IndexedDB save and must not be sent back in the apply payload.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| AI parser tests | `pnpm test -- lib/profile-import/openrouter-vision.test.ts lib/profile-import/rover.test.ts` | All pass, including bounded evidence cases |
| Review-store tests | `pnpm test -- app/admin/import/rover/review-store.test.ts` | Persisted drafts containing provider evidence are rejected/omitted safely |
| Typecheck/lint | `pnpm typecheck && pnpm lint` | Exit 0 |
| Full suite | `pnpm test` | All tests pass |

## Scope

**In scope**:

- `lib/profile-import/openrouter-vision.ts`
- `lib/profile-import/types.ts`
- `lib/profile-import/rover.ts`
- `app/admin/import/rover/rover-import-client.tsx`
- `app/admin/import/rover/review-store.ts`
- the three focused test files named in the commands above

**Out of scope**:

- Screenshot storage, raw model response storage, prompt logging, durable
  import-job tables, or changing the provider privacy options
- Importing photos, reviews, badges, metrics, hidden content, or contact data
- Any profile apply/schema/migration change

## Steps

### Step 1: Define a separate ephemeral evidence shape

Add a bounded type for profile-field evidence and service-field evidence. Keep
it separate from `ReviewedProfilePatch`, `confidence`, and the persisted
`StoredRoverReview`. Evidence must be a short normalized string, capped at the
existing provider limit (or a smaller UI limit), and may be absent for fields
that were not accepted.

**Verify**: `pnpm typecheck` → exit 0 before behavior changes.

### Step 2: Preserve accepted evidence through the request boundary

When `usable` accepts a field, return its bounded evidence alongside the value
and confidence. Build evidence maps in `createOpenRouterVision`; carry them
through the transient `ProfileVisionResult`, `RoverReviewDraft`, and streaming
review event. Do not include evidence in `ApplyOwnedReviewInput`.

Add tests proving low-confidence or unevidenced output remains suppressed and
accepted profile/service evidence is present in the transient result.

**Verify**: `pnpm test -- lib/profile-import/openrouter-vision.test.ts lib/profile-import/rover.test.ts` → all pass.

### Step 3: Render provenance and strip it before persistence

In `RoverImportClient`, keep evidence in a separate active-review state. Render
an accessible, secondary “Visible source” disclosure beside accepted fields;
plain React text is sufficient and must not use an HTML sink. For missing
evidence, render no provenance claim. Before `saveReview`, remove evidence from
the object. Restored drafts should show a concise note that source snippets
are available only during the active import session, not pretend that the
source was retained.

Keep the existing “Your live profile has not changed yet” messaging and the
explicit apply action. The apply request must contain only the reviewed patch,
revision, subdomain, and idempotency fields already in the contract.

**Verify**: `pnpm test -- app/admin/import/rover/review-store.test.ts && pnpm typecheck && pnpm lint` → all pass; persistence tests prove evidence does not enter the stored draft.

### Step 4: Re-run the complete local gate

**Verify**: `pnpm test` → all tests pass. Browser QA of the active review and
refresh behavior remains a separate gate; do not claim it from unit tests.

## Test plan

- Add parser tests for accepted profile evidence, accepted service evidence,
  missing evidence, and low-confidence evidence.
- Add pipeline tests showing evidence reaches the transient draft but not the
  apply payload.
- Add persistence tests showing forbidden provider artifacts are never stored.
- Model assertions after existing profile-import tests; use no real provider
  calls or credentials.

## Done criteria

- [ ] Accepted candidates show bounded visible-source text during the active
      review session.
- [ ] Refresh restoration contains no evidence and no provider artifacts.
- [ ] Apply payload and PostgreSQL writes remain evidence-free.
- [ ] Existing privacy routing, review-before-apply, revision checks, and
      service normalization are unchanged.
- [ ] Focused tests, full tests, typecheck, and lint pass.

## STOP conditions

- A design requires storing screenshots, raw responses, prompts, or evidence in
  PostgreSQL, Blob, Redis, or long-lived browser storage.
- The provider or model contract cannot guarantee the current structured-output
  and privacy settings.
- The working-tree Rover changes conflict with the pipeline edits; report the
  exact conflict instead of overwriting them.

## Maintenance notes

If the import becomes public, re-evaluate evidence retention and source
attribution with the product/privacy owner. Keep provenance explicitly
ephemeral unless an accepted decision changes that boundary.
