# Plan 005: Add an activation-first dashboard slice and browser proof

> **Executor instructions**: Keep this slice small. It should make the next
> useful action obvious for a solo sitter and prove the core browser journey;
> it must not become a generic dashboard redesign. Use the repository's
> `prototype` skill for UI work if available, and prefer Dia/browser tooling if
> exposed. Update `plans/README.md` when complete.

> **Drift check (run first)**: `git diff --stat c99d0e6..HEAD -- app/admin/dashboard.tsx app/admin/page.tsx 'app/s/[subdomain]/page.tsx' 'app/s/[subdomain]/lead-form.tsx' app/admin/lead-inbox.tsx app/admin/bookings.tsx components/launch-draft.tsx`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-repair-ai-review-service-editing.md`, `plans/002-patch-tailwind-build-dependency.md`
- **Category**: direction
- **Planned at**: commit `c99d0e6`, 2026-08-25

## Why this matters

The product research defines activation as a published site plus a real client
request/payment loop, not merely account creation. The current admin surface
offers Dashboard, Stats, Messages, Clients, and Bookings tabs, but it does not
make the next missing activation step explicit for a sitter. The public inquiry
form also asks for several details in one block. A small activation checklist
and browser-verified core flow will improve orientation and reveal conversion
friction without adding broad feature scope.

## Current state

- `app/admin/page.tsx:25-35` loads sites, leads, messages, clients, bookings,
  revenue, and payment setup before rendering the dashboard.
- `app/admin/dashboard.tsx:514-542` renders all five tabs and their primary
  actions; onboarding has a stepper, but the completed workspace has no
  explicit next-action surface.
- `app/s/[subdomain]/lead-form.tsx:19-35` presents name, email, service, dates,
  pet details, ZIP, and care details in one form. Only name and email are
  required by the browser, but the visual hierarchy does not distinguish the
  minimum request from helpful follow-up context.
- `docs/research/sitterfolio-solo-os-market-2026-08-23.md:47-71` defines the
  no-account client journey and the real activation loop; `:134-145` names
  operational metrics such as time to first live site, first client, and
  request-to-payment.
- `DESIGN.md` requires progressive disclosure, direct language, visible focus,
  touch-safe controls, and action-specific loading states.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused tests | `pnpm test -- app/admin/site-editing-model.test.ts app/admin/lead-inbox-model.test.ts 'app/s/[subdomain]/lead-form.test.tsx'` | All pass |
| Local checks | `pnpm lint && pnpm typecheck && pnpm test` | All pass |
| Production build | `pnpm build` | Exit 0 |
| Browser gate | Use Dia if exposed, otherwise the approved browser/Chrome tooling | Desktop and narrow viewport checklist passes; report separately from local checks |

## Scope

**In scope**:

- `app/admin/dashboard.tsx` and one small extracted activation component if
  needed
- `app/admin/page.tsx` only if the checklist needs an existing derived value
- `app/s/[subdomain]/lead-form.tsx` and its focused test if the minimum-first
  inquiry hierarchy is included
- Focused unit/component tests and a browser QA checklist in the plan/issue

**Out of scope**:

- New database tables, analytics vendor changes, pricing changes, full tab
  routing/data-loader refactors, or a visual redesign of every surface
- Required account creation for pet owners
- Changing Lead validation, Conversation tokens, payment settlement, or status
  transition authority

## Steps

### Step 1: Choose the smallest activation checklist contract

Derive read-only checklist states from existing data only. At minimum cover:
publish/setup complete, share site, connect Stripe when relevant, respond to a
new inquiry, save a qualified client, and create a first draft booking. Each
item must link to an existing route/tab/action and state why it matters. Hide
completed items or show them as complete; do not create fake progress or claim
that provider/deployment/payment proof exists merely because local data exists.

**Verify**: `pnpm test -- app/admin/site-editing-model.test.ts` → existing model
tests pass; add pure checklist tests if the derivation is extracted.

### Step 2: Implement the focused dashboard surface

Place the checklist near the top of the completed dashboard with plain copy,
one primary next action, and a compact “View all” treatment. Reuse current
tokens, cards, buttons, icons, focus behavior, and action-specific pending
states. Keep the existing tabs and data contracts intact. Do not add AI here;
the later inbox copilot should be evaluated separately.

**Verify**: `pnpm typecheck && pnpm lint` → exit 0.

### Step 3: Refine inquiry hierarchy only if browser evidence supports it

Use a small progressive-disclosure treatment in the public form: preserve the
minimum viable request (name, email, service/date context) while visually
grouping pet/care/ZIP details as helpful context. Preserve every existing form
name and server action contract. Do not make currently optional fields
required, and keep the privacy/no-account copy accurate.

**Verify**: `pnpm test -- 'app/s/[subdomain]/lead-form.test.tsx'` → all focused
tests pass; `pnpm typecheck` → exit 0.

### Step 4: Run the browser journey

Against an isolated local or approved preview environment, verify at desktop
and narrow widths: landing/build, authenticated setup, published Site,
public inquiry submission, confirmation/private conversation return, owner
inbox reply, Lead status transition, client promotion, draft booking, and
payment request presentation. Verify keyboard focus and action-specific
loading. Do not run real financial/provider mutations without the exact
approved isolated environment and release authorization.

**Verify**: Browser checklist records URLs/commit, viewport, observed result,
and any console/network error. This is browser proof, not a substitute for CI,
deployment, provider, or production proof.

## Test plan

- Add pure checklist derivation tests for empty, partially activated, and
  completed states.
- Preserve existing lead-form semantic tests; add assertions only for the
  progressive grouping and unchanged field names.
- Use the existing browser QA checklist conventions from `CONTEXT.md`; keep
  test data isolated and never use production payment or customer data.

## Done criteria

- [ ] A completed sitter can see one clear next activation action based on
      existing data.
- [ ] Existing routes, server actions, validation, and ownership boundaries are
      unchanged.
- [ ] Public inquiry still works without a pet-owner account and keeps its
      privacy copy accurate.
- [ ] Focused tests, lint, typecheck, full unit tests, and build pass.
- [ ] Desktop/narrow browser evidence is recorded separately from local/CI
      checks.

## STOP conditions

- The checklist needs new persistence or an analytics schema to be honest.
- A UI change requires making optional inquiry fields mandatory.
- Browser verification reaches a shared/production database or real money flow
  without explicit isolation and authorization.
- Dia/browser tooling is unavailable and no safe local/preview environment is
  available; record the gate as unverified rather than substituting screenshots
  or unit tests.

## Maintenance notes

Use activation evidence to decide what comes next: time to first live Site,
first real inquiry, request-to-acceptance, payment completion, repeat booking,
and retention. If the checklist grows beyond a handful of items, stop and
reconsider the product hierarchy instead of adding a larger dashboard project.
