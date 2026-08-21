# ADR-0001: One Postgres-backed inquiry-to-revenue domain

## Status

Accepted — 2026-08-21

## Context

Sitterfolio already persists Better Auth users and sessions in PostgreSQL, but Sites and Leads are held in Redis. The connected DirectPaw checkout contains the proven payment model described by the plan (the plan calls its older repository name `directpaw2`). Adding payments makes Site and Lead ownership financially significant.

## Decision

- Keep the existing Better Auth `user.id` as the canonical identity. Authentication is not replaced and no duplicate sitter identity is created.
- Use Sitterfolio's existing PostgreSQL database as the durable source of truth.
- Represent ownership as `User → Business → Site → Lead` and `Business → ConnectedAccount`. Existing users become Business owners during idempotent Redis migration. Multiple Sites per user remain supported; the migration creates one Business for each existing Site so no uniqueness assumption is imposed.
- Port the current DirectPaw payment domain into this repository as a modular-monolith module. It remains the only payment implementation after the slice; no network boundary or shared package is introduced.
- Stripe-hosted Checkout uses connected-account direct charges. The server derives the connected account through the authenticated Business, calculates and snapshots the 3% application fee, stores one canonical Checkout Session under a database lock, and accepts financial transitions only from signed Stripe webhooks.
- Stripe is authoritative for external payment facts. PostgreSQL is authoritative for the application's reconciled financial state and explicit `PaymentRequest → Lead → Site → Business` attribution.
- Acquisition source and campaign are immutable Lead snapshots. A generic attribution table is unnecessary for this milestone.
- Headline generated revenue is net paid volume: paid customer amount less refunds, excluding lost disputes/chargebacks. Gross paid volume is also queried separately. Platform-fee revenue is never presented as sitter revenue.

## Redis migration and rollback

The migration introduces tables first. Compatibility reads discover legacy owner subdomains, profiles, and leads, then backfill them idempotently while preserving subdomains, timestamps, and ownership. PostgreSQL is authoritative after a record is migrated; Redis remains only a compatibility source plus rate-limit/cache store. Conflicts resolve in favor of PostgreSQL. Migration retries use unique subdomains and stable legacy Lead IDs and never duplicate records.

Rollback before payment traffic may return reads to Redis because legacy data is not deleted. After payment traffic begins, PostgreSQL financial history must not be removed or trimmed; rollback disables new Checkout creation while reconciliation continues. Compatibility code may be removed only after production row counts and ownership relationships are verified.

## Consequences

Money-moving operations require server-derived ownership joins. Sites with financial history are soft-deleted. Preview, production, and local databases and Stripe modes remain separate release gates; this ADR does not establish that production configuration is ready.
