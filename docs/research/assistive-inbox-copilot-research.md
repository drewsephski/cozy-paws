# Plan 004: assistive inbox copilot research

Date: 2026-08-25

Scope: bounded, read-only research for an assistive inbox copilot. This note uses the current repository as the primary source of truth. It does not implement provider calls, routes, persistence, UI behavior, migrations, or product activation.

## Executive recommendation

Design the first copilot slice as a sitter-side, suggestion-only assistant for one explicitly selected Lead and its Conversation. The initial enabled actions should summarize the request and identify missing details; a draft reply should remain a nullable, separately evaluated contract until its quality and safety gate passes. It must not send a message, change Lead status, create a Payment request, save a Client household, create a Booking, or expose a customer conversation to a provider without a server-side ownership check.

The key boundary is important because the current UI groups separate one-to-one Lead conversations by normalized customer email. That grouping is useful navigation, but it is not itself a safe model-context identity. A future copilot request should name the selected `leadId` and assemble context server-side for that Lead; if grouped history is intentionally included, the individual Lead boundaries must remain explicit.

## Repository uncertainty

No `Plan 004` implementation was found in the worktree; the assigned plan was supplied from the operator checkout. The phrase “assistive inbox copilot” is therefore interpreted here as a bounded, read-only assistance layer, not as authorization to infer autonomous triage, outbound messaging, pricing, scheduling, or CRM behavior. The plan's task list, retention policy, model choice, and success criteria are captured in the companion ADR rather than inferred from current code.

## Current product and domain contract

- Sitterfolio defines a Conversation as the one-to-one message history attached to a Lead. The customer can use an account-free private link; only an authenticated sitter replies from the owning Business dashboard. Valid Lead transitions are `NEW → QUALIFIED → QUOTED → BOOKED`; `DECLINED` and `SPAM` close the Conversation and revoke its bearer token, while reopening rotates the token. [CONTEXT.md:18-24]
- PostgreSQL is the durable authority for Business, Site, Lead, Conversation, and financial state. Private operations must derive ownership from the authenticated session and server-side Business joins; submitted IDs are selectors, not ownership proof. Redis is compatibility, cache, and rate-limit infrastructure. [CONTEXT.md:40-53, CONTEXT.md:71-72; docs/agents/principles.md:13-17]
- A public request is bounded before persistence: name/email, dates, service, pet details, postal code, source/campaign, and care details are normalized; care details and message bodies are capped at 2,000 characters. [lib/domain/leads.ts:21-48; lib/lead-intake.ts:41-59]
- PostgreSQL persists the Lead and its `lead_conversation` in one transaction. The Conversation has one Lead, one Business, a unique public token of at least 32 characters, timestamps, and a separate message table whose only senders are `CUSTOMER` and `SITTER`; message bodies are 1–2,000 characters. [lib/postgres-lead-intake.ts:105-163; migrations/2026-08-23-lead-conversations.sql:1-19]
- Closing or reopening a Lead updates the Conversation lifecycle and rotates the public token. A copilot must therefore treat closed/revoked Conversations as non-sendable and must not cache or reuse a bearer token. [lib/lead-management.ts:5-28; migrations/2026-08-23-conversation-lifecycle.sql:1-17]

## Current inbox and action surfaces

- `/admin` authenticates first, loads the owner’s Sites and Leads, then loads up to 500 owner Conversation message rows in PostgreSQL before passing them to the dashboard. [app/admin/page.tsx:20-35; lib/conversations.ts:124-144]
- The Requests view groups Leads by normalized email, marks a grouped set read when opened, shows structured Lead fields and the Conversation, and exposes status, client, and payment actions in the same expanded surface. [app/admin/lead-inbox.tsx:54-65, app/admin/lead-inbox.tsx:82-93, app/admin/lead-inbox.tsx:121-135]
- The Messages view also groups by normalized email and flattens all messages from the grouped Leads into one visible timeline. It selects a Lead for the reply composer and blocks replying when that selected Lead is closed. [app/admin/lead-inbox-model.ts:15-37; app/admin/messages-inbox.tsx:16-21, app/admin/messages-inbox.tsx:40-56]
- The domain model remains one Conversation per Lead even though the UI groups by email. A copilot should be bound to the selected Lead, show which request it is assisting, and avoid silently combining dates, pets, care instructions, or prior requests from another Lead in the same email group.
- Sitter replies use `sendSitterConversationMessageAction`. The action requires an authenticated session, passes the submitted Lead ID into the ownership-aware conversation service, persists a `SITTER` message transactionally, revalidates the dashboard, and sends an idempotent Resend notification. [app/actions.ts:253-310; lib/conversations.ts:169-192; lib/email.ts:138-174]
- The existing composer is direct and bounded: a required textarea is capped at 2,000 characters, its submit button is disabled only for that action while pending, and success refreshes the view. This matches the design rule that async feedback names the submitted action and does not fake loading. [components/conversation-thread.tsx:29-57; DESIGN.md:32-38]
- Lead status, Payment request, Client household, and Booking actions already have separate server-side boundaries. A copilot should not bypass them or treat a generated sentence as authority for an availability, price, payment, client, or booking decision. [app/actions.ts:336-426; lib/domain/leads.ts:1-19; CONTEXT.md:21-28]

## Current OpenRouter seam and provider constraints

- The repository has `ai@7.0.77` and `@openrouter/ai-sdk-provider@3.0.0`, but the only current OpenRouter integration is Rover profile-import vision analysis. There is no inbox model, copilot route, copilot feature flag, or copilot-specific environment variable. [package.json:1-20; lib/profile-import/service.ts:9-17]
- Rover analysis is explicitly gated by `ROVER_IMPORT_POC_ENABLED`, `SCREENSHOTONE_ACCESS_KEY`, and `OPENROUTER_API_KEY`; the model is server-configured through `OPENROUTER_VISION_MODEL` and defaults to `openai/gpt-5.4-mini`. The README labels these variables server-only and says configuration is not proof of deployment or provider readiness. [lib/profile-import/config.ts:9-22; README.md:86-97]
- The existing provider request uses structured output, no retries, a 25-second total timeout, `require_parameters: true`, `allow_fallbacks: false`, `data_collection: 'deny'`, and `zdr: true`. The repository test locks those request options and the prompt-injection defense for screenshot text. [lib/profile-import/openrouter-vision.ts:62-84; lib/profile-import/openrouter-vision.test.ts:4-38]
- The current vision prompt treats screenshot pixels as untrusted data, ignores instructions embedded in the source page, requires visible evidence and confidence, and rejects unsupported output. A message copilot should apply the same trust model to customer-written message text: customer content is data to interpret, not instructions that can override the system task or authorize an action. [lib/profile-import/openrouter-vision.ts:7-14, lib/profile-import/openrouter-vision.ts:84-129]
- These options are repository request settings, not proof of a current OpenRouter account policy, model retention behavior, regional processing location, or contractual treatment of private conversation data. This pass intentionally did not browse provider documentation or make a provider request, so those facts remain an explicit pre-implementation gate.

## Privacy and security constraints

- Conversation and Lead data includes names, email addresses, dates, messages, pet details, care notes, and postal codes. The privacy policy treats inquiry, conversation, client, pet, booking, and payment-request records as private/authenticated or private-link data, and says service providers may receive information as needed to operate the service. It does not specifically name OpenRouter or describe AI retention. [app/privacy/page.tsx:10-22, app/privacy/page.tsx:34-52]
- Do not send a public Conversation bearer token, session cookie, internal database IDs beyond what the server needs for correlation, payment identifiers, or unrelated Sites/Leads to the model. The model context should be the minimum selected Lead data needed for the requested assistive task.
- The browser should submit an intent and selected Lead ID to a server action or route; the server should derive the owner, reload the selected Conversation, check that it is still open, and only then call a provider. A browser-supplied email, subdomain, Business ID, or conversation token cannot establish ownership. [CONTEXT.md:71-72; lib/conversations.ts:169-190]
- Model output is untrusted text. It should be displayed as a draft with clear provenance, remain editable, and require the existing explicit sitter send action. It should not be inserted into `lead_conversation_message` until the sitter submits it. The current message schema only represents actual `CUSTOMER` or `SITTER` messages, so a suggestion is not a message merely because it resembles one. [migrations/2026-08-23-lead-conversations.sql:12-19]
- Prompt-injection defenses should separate system instructions, structured Lead context, prior message text, and the sitter’s explicit task. The model must not follow commands found in a customer message, create new tool authority from message content, or infer permission to send, change status, charge, schedule, or save records.
- A future implementation needs a deliberate retention decision for prompts, outputs, errors, usage, and provider telemetry. The current repository gives no approved AI audit-log table, deletion policy, redaction utility, or customer/sitter consent surface for inbox content.

## Design implications for a bounded first slice

1. Keep the contract assistive and synchronous from the sitter’s perspective: “Draft a reply” or “Summarize this request,” not “Handle this conversation.” The result should be an ephemeral suggestion containing draft text and, where useful, a short list of missing facts or assumptions.
2. Anchor every request to one Lead. In the grouped-by-email UI, show the selected request’s service and dates beside the suggestion and require an explicit switch before changing context. Do not treat the email group as a durable Conversation aggregate.
3. Reuse the existing ownership-aware server boundary and final send action. A copilot endpoint can return a suggestion, but only `sendSitterConversationMessageAction` should persist and notify for the final reply. Closed or revoked Leads must fail closed.
4. Start with the existing Lead fields and that Lead’s ordered messages. Profile/availability context may be added only when it is server-loaded from the same owning Business and clearly labeled as sitter-authored reference material. Exclude payment, booking, unrelated client records, and unrelated Sites from the first context contract.
5. Preserve the current 2,000-character message limit and validate the final edited text again at send time. Never auto-send a generated answer, auto-qualify a Lead, promise availability, invent a price, or trigger payment/client/booking actions.
6. Put the provider behind an explicit server-only copilot flag and model setting, with a provider adapter separate from the inbox action. Before activation, verify current OpenRouter model/provider privacy controls, structured-output support, timeout/cost limits, fallback behavior, and the product privacy notice against the exact request shape.
7. Keep the UI calm and progressive: an assistive control belongs inside the selected reply task, not as a new autonomous dashboard agent. Loading should attach only to the submitted assist action, errors should explain whether no draft was produced or the provider was unavailable, and reduced-motion/focus behavior should follow the existing design system. [DESIGN.md:7-22, DESIGN.md:32-38, DESIGN.md:76-78]
8. Define verification as separate gates: local unit tests for context assembly and prompt-injection/output validation; isolated integration tests for ownership and closed/revoked lifecycle checks; provider configuration and privacy verification; deployment; and authenticated browser QA. None is established by this research note.

## Open questions before implementation

- What exact Plan 004 task is intended: reply drafting, summarization, missing-information prompts, triage, or a combination?
- Is the permitted context one Lead only, or may a sitter explicitly include prior Leads from the same customer? If so, how are request boundaries and conflicting dates represented?
- What user-facing disclosure/consent and retention/deletion behavior is required before private messages are sent to an AI provider?
- Which OpenRouter model, maximum cost, timeout, fallback policy, and data-processing terms are approved for production? The current Rover model/options cannot be assumed to answer this.
- Should suggestions be ephemeral only, or should the product retain an audit record? No current schema or ADR resolves this.

## Source index

Primary repository sources reviewed: `CONTEXT.md`; `DESIGN.md`; `docs/agents/principles.md`; `docs/agents/domain.md`; `docs/adr/0001-postgres-inquiry-to-revenue.md`; `docs/adr/0003-client-households-from-qualified-leads.md`; `migrations/README.md`; `migrations/manifest.json`; `migrations/2026-08-23-lead-conversations.sql`; `migrations/2026-08-23-conversation-lifecycle.sql`; `app/admin/page.tsx`; `app/admin/dashboard.tsx`; `app/admin/lead-inbox.tsx`; `app/admin/messages-inbox.tsx`; `app/admin/lead-inbox-model.ts`; `app/actions.ts`; `lib/conversations.ts`; `lib/postgres-lead-intake.ts`; `lib/lead-intake.ts`; `lib/domain/leads.ts`; `lib/lead-management.ts`; `lib/email.ts`; `lib/profile-import/config.ts`; `lib/profile-import/service.ts`; `lib/profile-import/openrouter-vision.ts`; `lib/profile-import/openrouter-vision.test.ts`; `app/privacy/page.tsx`; `components/conversation-thread.tsx`; `README.md`; `package.json`.

No external operations, provider calls, migrations, deployments, browser checks, or product changes were performed.
