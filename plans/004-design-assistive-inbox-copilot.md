# Plan 004: Design an assistive inbox copilot

> **Executor instructions**: This is a design/spike plan, not permission to
> ship autonomous messaging. Produce the design artifacts and stop before
> implementing provider calls unless the maintainer separately approves the
> implementation. Update `plans/README.md` when complete.

> **Drift check (run first)**: `git diff --stat c99d0e6..HEAD -- app/admin/lead-inbox.tsx app/admin/messages-inbox.tsx components/conversation-thread.tsx app/actions.ts lib/conversations.ts package.json`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/002-patch-tailwind-build-dependency.md`, `plans/003-ai-import-provenance-ux.md`
- **Category**: direction
- **Planned at**: commit `c99d0e6`, 2026-08-25

## Why this matters

Sitterfolio's durable product loop is a public inquiry becoming a human-reviewed
conversation, qualified client, booking, and payment. The repository already
has the lead facts, conversation history, status transitions, and a sitter
reply composer, but AI is currently confined to profile import. An on-demand,
human-in-the-loop inbox assistant can reduce response time without replacing
the sitter's relationship. The spike must define a narrow, privacy-aware
contract before any model is connected to customer PII.

## Current state

- `CONTEXT.md` defines Leads, Conversations, Client households, and Bookings as
  the operating loop and explicitly excludes autonomous campaigns, general
  social chat, and replacing the sitter's client relationship.
- `lib/conversations.ts:124-144` loads owner conversation messages and
  `lib/conversations.ts:169-191` sends a sitter-authored message after owner
  authorization.
- `app/admin/lead-inbox.tsx:125-137` presents inquiry facts, status actions,
  client promotion, payment requests, and the reply form together.
- `app/admin/messages-inbox.tsx` is a compact conversation-focused surface.
- `app/actions.ts:284-310` sends the final sitter message and notification;
  this boundary must remain the only send path.
- `package.json:15,24` already contains the OpenRouter AI SDK provider and AI
  SDK used by the Rover vision seam; do not duplicate provider wrappers.
- Existing accepted privacy behavior requires explicit provider settings,
  structured output, no silent fallbacks, and no raw model-output logging.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Read current contracts | `rg -n "Conversation|LeadStatus|sendSitter|transitionOwnedLead|OpenRouter|data_collection|zdr" app lib CONTEXT.md` | All cited seams are found and reviewed |
| Existing verification | `pnpm lint && pnpm typecheck && pnpm test` | All pass before/after documentation-only work |
| Diff check | `git diff --check` | No whitespace errors |

## Scope

**In scope**:

- A proposed design/ADR under `docs/adr/` or a focused research note under
  `docs/research/`, following the repository's existing document style
- A redacted fixture contract and evaluation rubric described in that artifact
- Updated `plans/README.md` status

**Out of scope**:

- Sending messages, automatic status transitions, quote/payment creation,
  customer-facing chatbot behavior, autonomous campaigns, or model calls
- Persisting raw transcripts, prompts, raw model responses, or PII-bearing AI
  history without a separately accepted data-retention decision
- Marketplace matching, Rover-message import, or staff workflows

## Steps

### Step 1: Trace and freeze the user-owned boundaries

Document the exact owner-derived query and action path from the selected Lead
through its Conversation messages to the existing reply composer. Define that
copilot requests must require the authenticated sitter, derive Business/Site/
Lead ownership server-side, and never trust a client-supplied owner or account
identifier. Record that the existing send action remains the final explicit
human action.

**Verify**: `rg -n "ownerUserId|ownerId|owner_user_id|sendSitterConversationMessage|transitionOwnedLead" app lib` → the design cites the actual owner checks and no new bypass is proposed.

### Step 2: Specify the smallest useful output

Define one structured response with these advisory sections:

- concise conversation summary;
- extracted known facts: service, dates, pet types/count, postal code, and
  care details, each with a source message reference;
- missing details that block a useful reply;
- an optional suggested Lead status, clearly labeled advisory and never applied
  automatically;
- an editable draft reply that may be inserted into the existing composer but
  is never sent by the model.

Set hard output limits, unknown/null behavior, “do not invent” rules, and
  prompt-injection handling for customer-authored text. Explicitly prohibit
  unsupported pricing, availability, guarantees, medical advice, or claims
  about the sitter. Decide whether the first slice supports only “summarize,”
  “find missing details,” or both; defer draft reply if evaluation quality is
  not sufficient.

**Verify**: `git diff --check` → no whitespace errors; the design contains a
  versioned schema, max lengths, failure states, and the prohibited actions.

### Step 3: Define privacy, cost, and failure behavior

Reuse the existing OpenRouter structured-output privacy contract only if it is
valid for conversation PII. Specify no provider fallback, explicit model
configuration, bounded timeout, one user action per request, no raw output
logging, and ephemeral result handling. Document what is sent, what is not
stored, how a provider failure is rendered, and an operator-visible cost/quota
cap before any production enablement.

**Verify**: `rg -n "data_collection|zdr|allow_fallbacks|maxRetries|timeout|console\." lib` → the design references the existing safe patterns and identifies every new decision that still needs approval.

### Step 4: Design the review-first UX and evaluation set

Use the existing card, status, focus, reduced-motion, and responsive patterns in
`DESIGN.md`. Place actions near an expanded inbox conversation: “Summarize,”
“What is missing?”, and—only if approved by the evaluation—“Draft reply.” Show
loading only on the clicked action, make each result dismissible, let the sitter
edit any draft, and keep status/payment/client actions separate. On narrow
screens, keep the composer and human send action primary.

Create a redacted evaluation set from representative inquiry shapes: complete
request, missing dates, multiple pets, ambiguous care details, hostile
prompt-like text, stale/closed conversation, and a request that must not be
answered with a price. Score field grounding, unsupported claims, omission of
important facts, draft editability, latency, and cost. Set a go/no-go threshold
before implementation.

**Verify**: the design artifact contains at least eight redacted cases, a
  rubric with pass/fail thresholds, and a browser checklist for owner isolation
  and human-only send.

## Done criteria

- [ ] Proposed design/ADR uses Sitterfolio vocabulary and cites current files.
- [ ] No autonomous send, status, booking, or payment behavior is specified.
- [ ] Ownership, privacy, prompt-injection, retention, cost, and failure rules
      are explicit.
- [ ] The UX keeps the existing reply action as the only send boundary.
- [ ] Redacted evaluation fixtures and go/no-go thresholds exist before code.
- [ ] Local lint, typecheck, and tests remain green.

## STOP conditions

- The desired behavior requires a customer chatbot, mass outreach, or automatic
  client/status/payment mutation.
- The provider cannot offer a privacy and fallback contract suitable for PII.
- A required result cannot be grounded in a specific conversation message or
  sitter-authored profile value.
- The design needs a new durable AI-history table before product value is
  proven.

## Maintenance notes

Treat the evaluation set as a release artifact. Any model, prompt, provider, or
output-schema change must rerun it and review false-positive suggestions, not
only happy-path summaries.
