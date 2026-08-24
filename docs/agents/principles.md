version: 1

# Project principles

These are the standing engineering rules checked before `implement`.

## Preserve behavior and boundaries

- Follow current repository conventions and preserve working behavior. Prefer focused changes over speculative rewrites.
- Keep server actions thin. Put validation, domain transitions, persistence, and external-service coordination behind composable `lib/` boundaries.
- Prefer strict TypeScript, small interfaces, server components where appropriate, and isolated client components.

## Protect authority and ownership

- PostgreSQL is authoritative for business, ownership, and financial state. Redis is compatibility and cache infrastructure.
- Derive private-operation ownership from the authenticated server session. Use ownership-aware domain and repository interfaces.
- Validate and normalize external input. Fail explicitly and preserve actionable error information.

## Make financial changes safe

- Persist canonical payment state before external redirects. Signed webhooks own settlement truth.
- Treat migrations as explicit, guarded operations. Confirm the target database, environment isolation, and current authorization before schema or data changes.

## Keep the interface trustworthy

- Keep UI direct, responsive, and accessible.
- Tie loading feedback to the specific asynchronous action in progress.

## Verify claims at the right gate

- Use pnpm and the repository's existing scripts.
- Run lint, type checking, and relevant tests after changes.
- Report local verification, CI, deployment, provider configuration, browser QA, and production behavior as separate gates.
