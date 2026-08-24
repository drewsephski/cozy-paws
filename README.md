# Sitterfolio

Sitterfolio gives independent pet sitters a professional public site and a simple place to run direct client work. A sitter can publish their services, receive availability inquiries, continue each conversation, save qualified clients and pets, plan bookings, and request payment through their own Stripe connected account.

Sitterfolio is a direct-business tool for solo sitters. It is not a marketplace, staff scheduler, route optimizer, or replacement for the sitter's relationship with their clients.

## Product flow

1. A sitter claims a memorable address such as `happy-tails.sitterfolio.com` and creates an account.
2. The guided dashboard collects the business name, introduction, service areas, services, contact details, and an optional profile image.
3. The public site presents that profile and lets a pet owner submit an availability inquiry.
4. The inquiry becomes a Lead and starts a private one-to-one Conversation. The pet owner can return through an account-free private link, while the sitter replies from the authenticated dashboard.
5. The sitter can qualify the Lead, send a fixed-amount Payment request, and promote the household and its pets into reusable client records.
6. A saved Client household can receive dated, priced Bookings that move from draft through confirmed and completed states.

Public Site payments are also available when the sitter's Stripe account is ready. These customer-entered payments are intentionally separate from Lead-attributed Payment requests and do not change a Booking or Lead status.

## Main surfaces

- **Product home:** explains Sitterfolio and starts Site creation.
- **Authentication:** email-and-password sign-up, sign-in, and password recovery through Better Auth.
- **Sitter dashboard:** edits the public Site, manages Leads and Conversations, connects Stripe, requests payment, maintains Clients and Pet profiles, and plans Bookings.
- **Public sitter Site:** a responsive subdomain with the sitter's profile, services, and availability form.
- **Pet-owner Conversation:** a private, account-free thread linked from an inquiry.
- **Hosted payment:** an idempotent Stripe Checkout flow for a Payment request or direct public Site payment.

## Technical foundation

- [Next.js](https://nextjs.org/) 16 App Router, React 19, and TypeScript
- Tailwind CSS 4 and shared shadcn-style UI primitives
- Better Auth with database-backed sessions
- PostgreSQL for accounts, ownership, Sites, Leads, Conversations, Clients, Pets, Bookings, connected accounts, Payment requests, and reconciled webhook state
- Upstash Redis for legacy profile compatibility, rate limits, and caches
- Stripe Connect and hosted Checkout for sitter-owned payments
- Resend for transactional notifications
- Vercel Blob for profile images
- OpenStreetMap Nominatim for cached, rate-limited service-area suggestions
- Vercel Analytics and Speed Insights

The durable ownership graph is:

```text
User -> Business -> Site -> Lead -> Payment request
                 \-> Connected Stripe account
                 \-> Client household -> Pet profile
                                      \-> Booking <-/
```

Private operations derive ownership from the authenticated User and server-side Business relationships. Stripe webhooks own financial transitions; a success page is not payment proof.

## Local development

This repository requires pnpm and uses the version declared in `package.json`.

```bash
pnpm install
pnpm dev
```

Create `.env.local` with the services needed for the flow you are running:

```dotenv
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=generate-a-random-secret-of-at-least-32-characters
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
BLOB_READ_WRITE_TOKEN=vercel_blob_...

RESEND_API_KEY=re_...
SITTERFOLIO_FROM_EMAIL="Sitterfolio <notifications@example.com>"

STRIPE_SECRET_KEY=sk_test_or_restricted_key
STRIPE_WEBHOOK_SECRET=whsec_payment_event_destination
STRIPE_ACCOUNT_WEBHOOK_SECRET=whsec_accounts_v2_thin_event_destination
```

Generate a local Better Auth secret with `openssl rand -base64 32`. Never commit credentials. Keep local, preview, and production databases and Stripe modes isolated.

### Rover profile import

The Rover profile import is controlled by an explicit environment flag. Configure these **server-only** variables in each environment where the import should be available (never use a `NEXT_PUBLIC_` prefix):

```dotenv
ROVER_IMPORT_POC_ENABLED=true
SCREENSHOTONE_ACCESS_KEY=...
OPENROUTER_API_KEY=...
OPENROUTER_VISION_MODEL=openai/gpt-5.4-mini
```

The feature fails closed unless the explicit flag is true and the credentials required by the requested operation exist. Existing database, Redis, Blob, auth, and application-origin variables remain required at their normal seams. Scope the flag and credentials deliberately per Vercel environment; configuration alone is not deployment, migration, provider, browser, or production proof.

Google sign-in is enabled only when both Google OAuth values are configured. Create a Web application OAuth client in Google Cloud and authorize `http://localhost:3000/api/auth/callback/google` locally and `https://sitterfolio.com/api/auth/callback/google` in production. Use separate credentials for preview environments when their callback origins differ.

Local subdomains use addresses such as `happy-tails.localhost:3000`. Keep `NEXT_PUBLIC_ROOT_DOMAIN` aligned with `BETTER_AUTH_URL`; successful localhost routing does not prove preview or production host configuration.

## Database setup and migrations

SQL migrations in `migrations/` are applied manually; there is no ORM migration runner. [`migrations/manifest.json`](migrations/manifest.json) is the complete canonical order for every migration. Follow the identity checks, guarded settings, deployment order, and read-only verification queries in [`migrations/README.md`](migrations/README.md). Do not apply application migrations from CI.

The inquiry-to-revenue migration and Redis backfill have guarded scripts:

```bash
CONFIRM_FINANCIAL_MIGRATION=yes pnpm db:migrate:revenue
CONFIRM_FINANCIAL_MIGRATION=yes pnpm db:backfill:revenue
```

Before running either command, independently confirm that `DATABASE_URL` points to the intended isolated environment. The confirmation variable is only a safety gate; it is not proof of database identity or isolation. Read [`docs/adr/0001-postgres-inquiry-to-revenue.md`](docs/adr/0001-postgres-inquiry-to-revenue.md) before changing or migrating financial data.

PostgreSQL is authoritative for current business and financial state. Redis remains a compatibility source for legacy profiles plus cache and rate-limit infrastructure; do not delete legacy Redis data until migration completeness has been established for every environment.

## Stripe event destinations

Stripe uses two signed event destinations with distinct secrets:

- `/api/webhook` reconciles connected-account Checkout, payment, refund, and dispute events.
- `/api/stripe/account-events` receives Accounts v2 thin events for account requirements and merchant capability status.

Use test-mode credentials locally and keep preview and production destinations isolated. Provider configuration, signed webhook delivery, account readiness, and a real completed Checkout are separate verification gates.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
TEST_DATABASE_URL=postgresql://localhost/sitterfolio_test pnpm test:integration
pnpm build
```

Fast unit tests remain the local default. The PostgreSQL integration command refuses remote databases and requires an unmistakably test-only local database; CI provides a disposable PostgreSQL service. Run focused tests for changed domain or ownership behavior before the full checks. Browser QA, provider configuration, deployment health, signed webhook delivery, and real customer/device behavior are separate gates; green CI or a green build does not establish them.

The repository intentionally does not install the Vercel CLI as an application dependency. Use the approved external deployment environment or an explicitly reviewed one-off development tool; no package script relies on `pnpm vercel`.

## Architecture and contributor guidance

- [`CONTEXT.md`](CONTEXT.md) is the current coding-agent handoff and domain map.
- [`docs/adr/`](docs/adr/) records decisions for payments, public Site payments, Client households, and Bookings.
- `app/` contains routes, Server Components, Server Actions, and API handlers.
- `lib/` contains domain rules, ownership-aware services, persistence, and external integrations.
- `migrations/` contains manually applied SQL migrations.
- Fast unit/component tests are colocated with source as `*.test.ts` or `*.test.tsx`; `tests/support/` contains shared fixtures and `tests/integration/` contains the isolated PostgreSQL suite.

Start a change at its route or action, trace it through the owning service and domain module, then inspect the repository, migration, and tests. Keep framework code thin, preserve server-derived ownership, and add new business rules to testable domain code.
