# ADR-0002: Customer-entered public Site payments

## Status

Accepted — 2026-08-23

## Context

Stripe Payment Links require a Product and Price. A custom-amount one-time Payment Link cannot calculate Sitterfolio's percentage application fee from the amount the customer eventually chooses. Asking each sitter to maintain Stripe catalog objects also exposes provider details that are unrelated to running their Site.

## Decision

- A Stripe-ready public Site renders a small dollar-amount form. The sitter does not configure a Product, Price, or Payment Link.
- The server validates amounts from $1 through $10,000, resolves the Site and connected account from the subdomain, rechecks `card_payments` readiness, calculates the existing 3% fee, and persists a `public_payment` before creating Stripe-hosted Checkout.
- Checkout uses inline `price_data` for one payment. Server-owned metadata identifies the durable public payment, and Stripe objects are created on the connected account as direct charges.
- Signed webhooks are the only source for paid, refund, dispute, and chargeback state. Redirect pages show pending until the durable record reflects Stripe confirmation.
- Public payments are attributed to their Site and included in generated revenue, but they do not create a Lead, book an inquiry, or masquerade as a Payment request.
- Public Checkout creation is IP-and-Site rate limited to reduce provider-object and database spam.

## Consequences

The `public_payment` table is a separate financial aggregate because no Lead exists for this flow. Refund and application-fee reconciliation follows the same proportional rules as inquiry Payment requests. The migration, connected-account webhook destination, isolated database, Stripe mode, and browser Checkout remain separate deployment gates.
