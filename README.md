# Sitterfolio

## Inquiry-to-revenue database migration

Site, Lead, connected-account, and payment records are stored in PostgreSQL. After independently confirming that `DATABASE_URL` targets the intended environment, apply the idempotent schema migration with:

```bash
CONFIRM_FINANCIAL_MIGRATION=yes pnpm db:migrate:revenue
CONFIRM_FINANCIAL_MIGRATION=yes pnpm db:backfill:revenue
```

Do not run it against preview or production until database isolation and the rollback expectations in `docs/adr/0001-postgres-inquiry-to-revenue.md` are verified. Existing Redis Site and Lead records are backfilled lazily and remain available as a temporary compatibility source.

Sitterfolio is a simple, shareable online home for independent pet sitters. It helps a sitter turn the essentials of their business—who they are, where they work, what they offer, and how to reach them—into one polished page they can send to pet owners.

The product is designed for the moment when a sitter needs a professional web presence without spending time designing or maintaining a full website. A sitter chooses a memorable address, adds their profile details and photo, and gets a public page where prospective clients can learn about their care and ask about availability.

## How Sitterfolio works

### 1. Claim a memorable site address

The home page lets a sitter choose a unique site name, such as `happy-tails`. That name becomes a shareable address in the form `happy-tails.<root-domain>`. Each site also starts with a pet icon that represents the business and can later be complemented by a profile photo.

Site names are normalized and validated before they are created. They use lowercase letters, numbers, and hyphens, must be between 3 and 30 characters, and cannot already belong to another site.

### 2. Build the profile in a guided flow

The dashboard walks the sitter through a short onboarding sequence. It collects:

- Business name
- A one-sentence introduction
- Service areas
- Services offered
- Contact email
- Optional phone number
- Optional profile photo

The profile is saved as the sitter moves through the flow, and a live preview shows how the public page is taking shape. Service areas can be searched and selected from location suggestions, while services can be selected from common options or entered by the sitter. Up to five service areas and eight services can be displayed.

When onboarding is complete, the sitter can open the live page or return to the dashboard to make changes.

### 3. Give pet owners one clear place to learn more

Each public Sitterfolio page presents the sitter’s profile in a focused, mobile-friendly layout. It can show:

- Profile photo or pet icon
- Business name
- Service area
- Short introduction
- Services offered
- A direct availability request form

Pet owners can send their name, email address, dates they need care, and a description of their pet or care request. The request is associated with the specific Sitterfolio page they used.

Sitterfolio connects pet owners with sitters; it does not book, schedule, or confirm care on a sitter’s behalf.

### 4. Review inquiries and share the site

The sitter dashboard displays recent messages submitted through the public page, including the sender’s contact information, requested dates, and care details. The sitter can open the live site, copy or share its link, and keep the profile current as their business changes.

Profile photos are uploaded through the product and displayed on both the dashboard preview and the public page. A sitter can also delete a site from the dashboard.

## Product surfaces

- **Public home page:** Explains the product and starts site creation.
- **Authentication:** Email and password sign-up and sign-in for sitters.
- **Sitter dashboard:** Guides profile creation, previews changes, edits profile information, shares the site, and shows recent inquiries.
- **Public sitter page:** A dedicated subdomain for the sitter’s business and its availability request form.
- **Location search:** Helps sitters find and select the cities, neighborhoods, or areas they serve.
- **Responsive presentation:** Public pages and dashboard screens adapt to smaller screens and support light and dark themes.

## Technical foundation

Sitterfolio is a Next.js application built with the App Router and React. The main technical pieces are:

- **Next.js 16** for the application, server-rendered pages, server actions, API routes, and subdomain routing through `proxy.ts`.
- **React 19** for interactive onboarding, profile editing, sharing controls, image upload, dialogs, and form states.
- **TypeScript** for application and data-model typing.
- **Tailwind CSS 4** and **shadcn/ui-style components** for the responsive visual system and accessible UI primitives.
- **Better Auth** with PostgreSQL for email-and-password accounts.
- **PostgreSQL** for Better Auth, businesses, sites, leads, connected Stripe accounts, payment requests, and reconciled webhook state.
- **Upstash Redis** for legacy profile compatibility, cached location results, and rate limits.
- **Vercel Blob** for profile-image uploads, restricted to common web image formats and a 5 MB maximum upload size.
- **OpenStreetMap Nominatim** for location search suggestions. Results are normalized, cached in Redis, and rate-limited before external lookup.
- **Vercel Analytics and Speed Insights** for product usage and performance visibility.

## Local configuration

Use pnpm for this repository. Install dependencies with `pnpm install`, then configure these values in `.env.local`:

```dotenv
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=generate-a-random-secret-of-at-least-32-characters
BETTER_AUTH_URL=http://localhost:3000
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
RESEND_API_KEY=re_...
SITTERFOLIO_FROM_EMAIL="Sitterfolio <notifications@example.com>"
STRIPE_SECRET_KEY=sk_test_or_restricted_key
STRIPE_WEBHOOK_SECRET=whsec_payment_event_destination
STRIPE_ACCOUNT_WEBHOOK_SECRET=whsec_accounts_v2_thin_event_destination
```

Generate a local secret with `openssl rand -base64 32`. Do not commit it. Before starting the app for the first time, apply [`migrations/auth.sql`](migrations/auth.sql) to the PostgreSQL database. Production must use its canonical HTTPS root URL for `BETTER_AUTH_URL` and its own secret and database credentials.

Stripe uses separate signed event destinations: `/api/webhook` receives connected-account payment snapshot events (including `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, refund, and dispute events), while `/api/stripe/account-events` receives Accounts v2 thin events for `v2.core.account[requirements].updated` and `v2.core.account[configuration.merchant].capability_status_updated`. Use distinct signing secrets and isolated Stripe credentials and databases for Sandbox/preview and live production.

## Feature behavior in the application

### Subdomain-based sites

The proxy identifies a sitter’s subdomain and rewrites its root URL to the corresponding public profile. The same behavior supports local hostnames, production domains, and Vercel preview-style hostnames. The root domain remains the product home and dashboard surface, while each sitter’s subdomain acts as their public site.

### Profile and inquiry data

Site, profile, and availability-request data is stored in PostgreSQL. Legacy Redis profile records can be migrated lazily for compatibility. Profile updates preserve existing fields and revalidate the public page after saving.

### Image handling

Profile images are uploaded to Vercel Blob using a server-authorized upload route. The application accepts JPEG, PNG, and WebP images, adds a random suffix to uploaded paths, and stores the resulting HTTPS URL with the sitter’s profile.

### Location suggestions

The dashboard’s service-area picker calls the application’s location API rather than contacting the geocoder directly from the browser. The API validates the query length, caches repeated searches for 30 days, limits request frequency, and converts geocoder results into concise place-and-region labels for the profile.

### Authentication boundary

Sitterfolio includes Better Auth routes and session-aware navigation so signed-in users can access the sitter experience. The dashboard and site actions are the current product surfaces for managing profiles and inquiries.

## Product scope

Sitterfolio is intentionally focused: it creates a trustworthy presence, helps a pet owner start a conversation, and lets an independent sitter send a Lead-attributed payment request through their own Stripe connected account. It is not a marketplace, calendar, booking engine, or replacement for the sitter’s own client relationship.
