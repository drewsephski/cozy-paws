# Sitterfolio: agent handoff context

This document onboards coding agents to the current repository. Treat source code, migrations, and ADRs as authoritative when older prose disagrees. This is a single Next.js application, not the older DirectPaw/Sitterfolio checkout repository, although the current payment domain was ported from that work.

## Product and vocabulary

Sitterfolio gives an independent pet sitter a public website at an address such as `happy-tails.sitterfolio.com`. A sitter creates a profile, publishes services and contact details, receives availability inquiries, reviews and replies to them in a private dashboard, can turn a qualified inquiry into a payment request, and can plan dated Bookings for saved clients. It is a direct-business presence and solo-sitter operating tool, not a marketplace or staff scheduling system.

Use these domain terms: a **Site** is the public business profile; a **Profile** is its sitter identity and care details; a **Business** is the operating/legal pet-care business owned by one authenticated **User**; a **Lead** is an availability request; a **Conversation** is the one-to-one message history attached to a Lead, beginning with the original request; a **Client household** is the reusable owner/household record promoted from a qualified Lead; a **Pet profile** is reusable care information under a Client household; a **Booking** is dated care for one Client household and one or more of its Pet profiles, with an agreed integer-cent amount and its own lifecycle; a **Payment request** is a customer-facing fixed-cent amount associated with a Lead; **Generated revenue** is paid customer volume net of refunds; **Platform revenue** is money earned by Sitterfolio from subscriptions and application fees; a **Verified care review** is feedback submitted by a pet owner after a Lead-attributed payment has settled and its associated Booking has been completed; a **Self-published testimonial** is sitter-provided praise displayed with its source and the sitter's confirmation that they have permission to publish it, whose underlying care Sitterfolio does not verify. Avoid `tenant`, `contact record`, and `invoice` for these concepts.

An **Import draft** is a transient, sitter-reviewable set of proposed Profile
details derived from visible external profile content. It is not part of the
owned Site until the authenticated sitter explicitly applies it.

**Setup activation** occurs when a Business has a completed public Site and the
owner intentionally shares that Site. **Value activation** occurs when that
same Business receives a qualified Lead within 14 days after Setup activation.
Account creation and profile completion alone are not activation.

## User flow

1. `/` explains the product and collects a normalized Site address.
2. Site creation requires authentication; `/build` and `/launch` lead to `/admin`.
3. The dashboard saves sitter/business identity, tagline, service area, services, email, optional phone, optional personal LinkedIn profile, and optional profile image.
4. `/s/[subdomain]` renders the public Site and its availability form. The form records name, email, service, dates, pet details, postal code, care details, source, and campaign, then starts the Lead's Conversation.
5. The dashboard inbox lists Leads across the owner's Sites. Pet owners return to an open Conversation through a private account-free link; authenticated sitters reply from the owning Business dashboard. Valid lifecycle transitions are `NEW → QUALIFIED → QUOTED → BOOKED`, with decline/spam paths that close the Conversation and revoke its bearer token. A sitter may reopen a declined/spam Lead as `NEW`; reopening rotates the token again before messaging resumes.
6. A qualified or quoted Lead can receive one open Payment request after Stripe connected-account readiness is confirmed.
7. `/pay/[token]` creates or reuses an idempotent Stripe Checkout Session. A Stripe-ready public Site also lets a pet owner choose an amount for a direct public payment without the sitter creating a Product or Payment Link. Signed Stripe webhooks reconcile payment, refund, and dispute facts into PostgreSQL; only a successful Lead-attributed payment moves a quoted Lead to `BOOKED`.
8. A sitter can promote a qualified, quoted, or booked Lead into one reusable Client household with draft Pet profiles. This does not automatically create a Booking.
9. In the Clients view, a sitter can maintain household contact, postal, and care details; correct each Pet profile's name, type, and care notes; and add a Pet to an existing household. Pet edits preserve the profile ID used by existing Bookings.
10. From a saved Client household, a sitter can create a dated, priced draft Booking for one or more of that household's Pet profiles, then move it through `DRAFT → CONFIRMED → COMPLETED`; `DRAFT` or `CONFIRMED` may instead become `CANCELLED`.

Sitterfolio does not choose a sitter, allocate staff, optimize routes, track GPS, generate recurring series, provide general-purpose social chat, send autonomous campaigns, or replace the sitter's client relationship. Customer-entered public Site payments and internal Lead-attributed Payment requests remain separate from Booking status.

## Runtime and routes

This is Next.js 16 App Router with React 19, TypeScript, Tailwind CSS 4, and shared shadcn-style UI primitives. Server Components render most pages; client components handle onboarding, dashboard controls, dialogs, uploads, and inbox state. `proxy.ts` owns host routing.

Important routes: `/`, `/auth`, `/build`, `/launch`, `/admin`, `/admin/complete`, `/s/[subdomain]`, `/pay/[token]`, `/pay/[token]/success`, `/api/auth/[...all]`, `/api/upload`, `/api/locations/search`, `/api/pay/[token]/checkout`, and `/api/webhook`.

`proxy.ts` detects `subdomain.rootDomain` and rewrites only `/` to `/s/[subdomain]`; `/admin` on a Site host redirects home. Local development supports `foo.localhost:3000`; production supports the configured root domain and Vercel preview hostnames shaped like `site---branch.vercel.app`. `NEXT_PUBLIC_ROOT_DOMAIN` defaults to `localhost:3000` locally and `sitterfolio.com` in production. Keep it aligned with `BETTER_AUTH_URL`; local host success does not prove preview or production routing.

## Data architecture

PostgreSQL is the durable source of truth for Better Auth, migrated Sites, Leads, Businesses, connected Stripe accounts, Payment requests, Lead events, and processed Stripe webhook IDs. The ownership graph is:

```text
User → Business → Site → Lead → Payment request
              └── Connected Stripe account
              └── Client household → Pet profile
                                   └→ Booking ←┘
```

`migrations/manifest.json` is the canonical complete migration order; `migrations/README.md` documents prerequisites, guarded confirmation settings, and read-only verification. The sequence covers Better Auth and sessions, inquiry-to-revenue ownership, Payment-request delivery/retries, Conversations and lifecycle, Client households and Pet profiles, guarded Bookings, public Site payments, profile identity, LinkedIn profiles, staged and provider-verified immutable account snapshots for both payment aggregates, and Site availability/trust details. Historical payment accounts are never inferred from the mutable Business connection. There is no ORM migration runner; these are manually applied SQL migrations and no external environment is migrated without current authorization.

`lib/profiles.ts` exposes the ownership service. `lib/profile-ownership.ts` handles normalization and owner checks. `lib/postgres-profile-repository.ts` is active and joins through Business ownership. `lib/redis-profile-repository.ts` is legacy compatibility only. Each pre-cutover owner receives one bounded Redis Site/Lead discovery pass recorded in `legacy_profile_migration_state`; PostgreSQL is authoritative after that explicit boundary. A directly requested Site absent from PostgreSQL can still be lazily migrated with its Leads. Redis remains for compatibility, rate limits, and caches; new financial state must not be written there. Do not delete legacy Redis data casually.

Profile deletion is a PostgreSQL soft delete (`site.deleted_at`) so financial history remains. Composite Site/Business and Lead/Business foreign keys are deliberate ownership protections. Inspect current repository and migration state before changing deletion or compatibility behavior.

## Payments and financial invariants

- `lib/domain/payments.ts`: pure 3% fee, refund, lifecycle, and revenue rules.
- `lib/payment-requests.ts`: owner-authorized request creation and dashboard revenue queries.
- `lib/connected-accounts.ts`: connected-account creation, onboarding links, readiness refresh.
- `lib/checkout.ts`: locked, idempotent Checkout Session creation/reuse.
- `lib/stripe-webhooks.ts`: signed-event ownership classification, reconciliation, and event deduplication. Unrelated connected-account events are acknowledged; events claiming Sitterfolio metadata fail closed on any mismatch.

Amounts are integer cents, constrained to 100–1,000,000 cents. Stripe-hosted Checkout uses direct charges on the connected account with a server-derived 3% application fee. Each Payment request and public Site payment immutably snapshots that provider account so later refunds and disputes do not follow a changed Business connection. Clients never choose the account or fee. Stripe is authoritative for external payment facts; PostgreSQL is authoritative for reconciled application state and attribution. Webhooks are the only source for financial transitions. Refunds reconcile proportional application-fee refunds; lost disputes become `CHARGEBACK`; generated revenue excludes disputed/chargeback volume and subtracts refunds.

Read `docs/adr/0001-postgres-inquiry-to-revenue.md` before changing financial code. Confirm `DATABASE_URL` independently before running the guarded migration/backfill scripts; `CONFIRM_FINANCIAL_MIGRATION=yes` is a safety gate, not proof of isolation.

## Authentication and authorization

Better Auth (`lib/auth.ts`) uses email/password accounts plus credential-gated Google OAuth, automatic sign-in, no required email verification, an eight-character minimum password, database-backed sessions, and a 30-day session lifetime. Google OAuth uses `/api/auth/callback/google` and is enabled only when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured. Google is explicitly trusted for account linking, and its verified email may automatically link a matching legacy password account even when the local `emailVerified` flag is false. `/admin` redirects unauthenticated users to `/auth`.

Every private operation must derive ownership from the authenticated user and server-side Business joins. Never trust a submitted subdomain, Lead ID, Business ID, Stripe account ID, or Payment token as ownership proof. Public Lead intake is unauthenticated, so preserve input bounds, validation, and rate limiting. Upload authorization must validate the authenticated owner and Site before issuing a Blob token.

The repository is transitioning from Redis ownership sets to PostgreSQL Business/Site ownership. Do not infer complete isolation merely because a query includes a user ID; inspect joins and add cross-Site tests when changing this boundary.

## External services and environment

Use pnpm (`pnpm@10.12.4`). Relevant variables are:

```text
DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, BETTER_AUTH_TRUSTED_ORIGINS, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
NEXT_PUBLIC_ROOT_DOMAIN, KV_REST_API_URL, KV_REST_API_TOKEN, BLOB_READ_WRITE_TOKEN
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_ACCOUNT_WEBHOOK_SECRET
SITTERFOLIO_GROWTH_OPERATOR_USER_ID
```

Upstash Redis backs compatibility, rate limiting, and location caching. Vercel Blob stores profile-image bytes; PostgreSQL stores the resulting URL. Nominatim is reached through the validated, cached, throttled application API. Stripe handles connected accounts and Checkout. Never print or commit credentials. Keep local, preview, and production databases and Stripe modes separate.

## Code map

`app/` contains routes, Server Components, Server Actions, API routes, and route-local clients. `components/` contains shared UI. `lib/` contains auth, sessions, persistence, domain rules, external integrations, and ownership services. Fast tests are colocated with their source; `tests/support/` contains repositories/fixtures and `tests/integration/` contains the isolated PostgreSQL suite. `migrations/` contains manually applied SQL, `scripts/` contains guarded revenue migration/backfill, and `docs/adr/` contains decisions; read the relevant ADR first.

For a feature, start at its route/action, trace into the domain/service module, then the repository and migration. Keep framework code thin and business rules testable in `lib/domain`. Lead status changes should go through `transitionOwnedLead`; do not bypass its transition and event rules with direct updates.

`lib/bookings.ts` is the ownership-aware Booking module. Call `createOwnedBooking`, `listOwnerBookings`, and `transitionOwnedBooking`; do not write Booking state directly from actions or conflate Booking transitions with Lead or Payment-request transitions.

`lib/client-households.ts` owns Client-household and Pet-profile persistence. Its edit and add operations validate input and derive ownership through the authenticated User's Business; Pet edits update the existing row so Booking references remain stable.

## Development and verification

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration # only with a local, unmistakably test-only TEST_DATABASE_URL
pnpm build
```

Run focused tests for changed domain/security behavior, then the relevant full checks. Browser QA is a separate gate: test root/subdomain rendering, auth, ownership, upload, Lead intake, inbox transitions, and payment redirect/webhook behavior with isolated data. A green build does not prove provider configuration, deployment health, real Stripe acceptance, or customer/device behavior.

For financial or destructive browser tests, stop unless the exact commit/preview and database isolation are proven. Never fixture shared or production Neon. For webhook tests, use signed Stripe test-mode events and verify the database transition, not only the success page.

## Current risks and handoff notes

- Fast unit tests do not require PostgreSQL. The isolated integration suite applies the canonical manifest and tests database-enforced ownership, constraints, transactions, deduplication, and both payment settlement aggregates.
- Migration/backfill is not evidence that every environment is migrated. Check row counts, ownership relationships, and the active database before removing Redis compatibility.
- Public Site payments and internal Lead-attributed Payment requests are separate financial aggregates; never book a Lead from an unattributed public payment.
- Webhook handling is metadata-, connected-account-, amount-, currency-, Checkout Session-, and Charge-sensitive. Preserve those checks.
- Do not add unauthenticated admin/Business operations. Do not silently deploy production, submit provider verification, send external email, or run financial migrations; these are approval/release gates.

## Agent workflow

1. Read this file and the relevant ADR.
2. Inspect `git status`, current commit, route, owning service/domain module, tests, and migration state. Preserve unrelated dirty-worktree edits.
3. State the contract and identify auth, ownership, persistence, provider, and migration side effects.
4. Make the smallest coherent change and add focused tests for domain/security-sensitive behavior.
5. Run applicable pnpm checks and distinguish focused proof from unrelated existing failures.
6. Report changed files, exact checks, remaining provider/deployment/device gates, and uncertainty. Completion requires implementation plus recorded relevant evidence.
