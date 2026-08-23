# Stripe Connect architecture audit

Date: 2026-08-22

Scope: the recommended Stripe architecture for Sitterfolio, a SaaS platform where independent pet sitters accept payments from their own customers and Sitterfolio retains a 3% application fee.

## Executive recommendation

Sitterfolio should remain a **Stripe Connect platform** and create one distinct **connected account per sitter business**. The platform Stripe secret key in Vercel is the correct credential for server-to-server Connect calls; it does not sign every sitter into the platform owner's Stripe account. Instead, the platform authenticates to Stripe and creates or acts on a connected account identified by its own `acct_...` ID. Direct-charge objects live on that connected account and are accessed by scoping requests to that account.

The best-fit configuration is:

- Accounts v2 with the `merchant` configuration and `card_payments` requested.
- `dashboard: full`.
- `defaults.responsibilities.fees_collector: stripe` and `losses_collector: stripe`.
- Stripe-hosted onboarding initially, using authenticated, single-use Account Links and collecting `eventually_due` requirements up front.
- Direct charges created on each sitter's connected account, with a 3% `application_fee_amount` transferred to Sitterfolio.
- Accounts v2 thin-event destinations for requirements and capability changes, plus connected-account payment webhook coverage appropriate to the payment flow.
- The connected account ID persisted against the correct Sitterfolio business/tenant and rechecked from Stripe at important boundaries.

This is Stripe's official SaaS pattern. There is no separate connector that replaces Connect account creation, onboarding, scoped payment creation, requirements handling, and webhooks. OAuth is not the preferred onboarding mechanism for a new platform; Stripe explicitly recommends Connect Onboarding for Standard/full-dashboard accounts. [Stripe's SaaS and marketplace introduction](https://docs.stripe.com/connect/saas-platforms-and-marketplaces), [Accounts v2 account creation](https://docs.stripe.com/connect/saas/tasks/create), [OAuth guidance](https://docs.stripe.com/connect/oauth-standard-accounts)

## Why the platform secret key does not expose Andrew's Stripe account

`STRIPE_SECRET_KEY` identifies and authorizes the Sitterfolio **platform**. It must remain server-only. It lets Sitterfolio create and administer connected accounts subject to the Connect configuration.

Each sitter must have a separate Stripe connected-account object and Sitterfolio must persist that sitter's `acct_...` identifier. When Sitterfolio creates an Account Link, the link is explicitly for that connected account. Stripe therefore collects and verifies that sitter's identity, business, payout bank account, and public details. The platform owner's legal identity is not copied merely because the platform key authorized the API request.

Likewise, a direct charge is created in the connected-account context (the `Stripe-Account` header in REST, or the SDK equivalent). Stripe states that the PaymentIntent and Charge exist on the connected account, its balance receives the payment, its branding is used in Checkout, and the platform receives the specified application fee. [Direct charges](https://docs.stripe.com/connect/direct-charges)

If Andrew's name appears in a sitter's public statement descriptor, that is account data/defaulting or test-data contamination—not the expected effect of using the platform secret key. Prevent this by creating exactly one connected account per business, enforcing tenant ownership of the stored account ID, prefilling business-specific public details, and never falling back to platform-owner public details.

## Recommended Accounts v2 configuration

For a SaaS product in which the sitter is the merchant of record and uses a full Stripe Dashboard, configure:

```text
configuration.merchant.capabilities.card_payments.requested = true
dashboard = full
defaults.responsibilities.fees_collector = stripe
defaults.responsibilities.losses_collector = stripe
```

Stripe requires `dashboard: full` accounts to use Stripe for both fee and loss collection. With this configuration, Stripe is also the requirements collector. The responsibility values are structural choices that must be set when adding the Merchant configuration and can't simply be changed later, so they should be tested in a Sandbox before live account creation. [Connected-account configuration](https://docs.stripe.com/connect/accounts-v2/connected-account-configuration)

This is preferable to making Sitterfolio responsible for KYC, losses, and Stripe fees. Stripe explicitly warns that platform-controlled requirement collection carries substantial operational and compliance complexity. A full Dashboard also gives sitters direct access to payments, payouts, reports, account settings, and Stripe support.

## Charges and the 3% platform fee

Direct charges match the business model because the customer is transacting with the sitter, not buying a centrally fulfilled marketplace service from Sitterfolio. Stripe calls direct charges best suited to SaaS platforms and recommends them for accounts with full Dashboard access. Refunds and chargebacks reduce the connected account's balance; the connected business receives the charge; and Sitterfolio receives its application fee. [Connect charge types](https://docs.stripe.com/connect/charges), [Direct charges](https://docs.stripe.com/connect/direct-charges)

For each checkout/payment:

1. Resolve the sitter's business from trusted server-side data.
2. Load its owned connected-account ID; never accept an arbitrary account ID from the browser.
3. Confirm `card_payments` is active before creating payment infrastructure.
4. Create the Checkout Session or PaymentIntent in that connected account's context.
5. Set `application_fee_amount` to the server-calculated 3% fee. Use a documented integer-rounding policy and store the amount used.
6. Use idempotency keys for retries.

Stripe requires an application fee to be positive and less than the charge amount, caps it at the captured amount, and transfers it to the platform. The connected account receives the gross payment minus Stripe fees and the application fee. [Collect application fees on direct charges](https://docs.stripe.com/connect/direct-charges#collect-fees)

## Onboarding: hosted first, embedded later if justified

Stripe recommends either hosted or embedded onboarding because both automatically adapt to changing regulatory requirements. Stripe-hosted onboarding is the simplest and lowest-maintenance choice. Embedded onboarding keeps users inside Sitterfolio and can improve continuity, but it adds Account Session, Connect.js, authentication, component lifecycle, and ongoing dashboard UX work. A custom API-built KYC flow is not justified here. [Choose an onboarding configuration](https://docs.stripe.com/connect/onboarding)

For the hosted flow:

- Create Account Links only on the server for the authenticated owner of the connected account.
- Treat them as sensitive, single-use URLs. Redirect immediately; do not email or persist them.
- Set both `return_url` and `refresh_url`.
- Have `refresh_url` authenticate the user, create a fresh Account Link, and redirect again.
- Prefer `collection_options.fields = eventually_due` for up-front onboarding. This asks once for the known eventual requirements and reduces later payment/payout interruptions.
- Prefill only verified business-specific data and let the user confirm it.

Critically, the `return_url` only means the user exited the Stripe flow. It does **not** mean onboarding is complete or payments are enabled. On return, retrieve the current account and render its actual capabilities and requirements. [Stripe-hosted onboarding](https://docs.stripe.com/connect/hosted-onboarding)

If Sitterfolio later chooses embedded onboarding, use Stripe's Account Onboarding component for initial onboarding. On its exit event, retrieve account state and inspect submission, charges/payout readiness, and requested capabilities. After initial onboarding, Account Management plus the Notification Banner are the official components for business-detail changes and new requirements/risk interventions. [Account onboarding component](https://docs.stripe.com/connect/supported-embedded-components/account-onboarding), [Notification banner](https://docs.stripe.com/connect/supported-embedded-components/notification-banner)

## Correct readiness and user feedback

Do not reduce account state to a permanent `stripeConnected` boolean and do not infer readiness from a redirect. Model a derived state that can change over time:

- **Not started**: no connected-account ID.
- **Continue setup**: actionable currently-due requirements or onboarding not submitted.
- **Under review**: submitted/no immediate user action, but `card_payments` is not active.
- **Restricted/action required**: capability inactive and Stripe reports actionable requirements or risk intervention.
- **Ready**: requested `card_payments` capability is active. If the product requires payouts before launch, independently require the payout capability/state too.
- **Temporarily unavailable**: Stripe retrieval failed; fail closed for payment creation and do not overwrite the last known provider state as success.

Display a clear return message such as, “Stripe received your details. Verification is pending; you can't accept payments yet,” or “Stripe setup complete—you can now accept payments.” Show the exact next action when requirements are due. Always provide “Manage Stripe account” for a full-dashboard account and “Continue setup” only when onboarding/requirements actually need work.

Use provider truth at three layers:

1. Retrieve the account immediately on the return page.
2. Persist webhook-driven projections for fast UI and background changes.
3. Re-retrieve or otherwise fail closed immediately before creating a customer payment.

## Accounts v2 events and webhook design

Stripe says Accounts v2 objects send both v1 snapshot events and v2 thin events and recommends a new endpoint/event destination for Accounts v2 events. For hosted onboarding with Accounts v2, Stripe specifically directs integrations to listen for `v2.core.account[requirements].updated` rather than relying on the v1 `account.updated` event. Other property-specific v2 events cover configuration and identity changes; `v2.core.account.updated` is only for top-level properties. Thin-event handlers must fetch the current Account representation and request the needed included fields before deriving status. [Accounts v2 migration and events](https://docs.stripe.com/connect/accounts-v2/migrate-integration), [Accounts v2 SaaS integration](https://docs.stripe.com/connect/integrate-billing-connect)

Recommended webhook properties:

- Use separate endpoints/secrets for v1 snapshot events and v2 thin-event destinations when both are needed.
- Verify signatures against the exact raw request body.
- Subscribe to **connected-account** events, not only platform-account events.
- Persist event IDs (or otherwise make handlers idempotent), tolerate duplicates and out-of-order delivery, and retrieve current provider state rather than assuming event order.
- Map the Stripe account in the event context to exactly one owned Sitterfolio business.
- Return 2xx quickly after durable intake; perform heavier reconciliation asynchronously if available.
- Reconcile periodically so missed delivery never permanently leaves stale status.
- For Checkout/direct charges, handle the payment events Stripe recommends for the selected Checkout flow, including successful asynchronous completion and failure where relevant; remember those payment objects exist on the connected account.

## Full Dashboard versus embedded management

With `dashboard: full`, sitters can manage their own Stripe data and Stripe handles ongoing requirement collection. That is the most operationally appropriate initial choice for Sitterfolio. The application should link users to Stripe for detailed financial administration while presenting a concise local status and next action.

Do not accidentally describe this as a “fully embedded” configuration. Stripe's fully embedded model requires a broader set of components and platform-provided functions, including Account Onboarding, Account Management, Notification Banner, Documents when Stripe collects its fees, and dispute-management access. [Fully embedded Connect](https://docs.stripe.com/connect/build-full-embedded-integration)

Sitterfolio can still selectively adopt embedded components later, but should do so deliberately and confirm compatibility with its connected-account configuration. The best near-term UX improvement is reliable provider-derived status and actionable messages, not replacing a functioning hosted flow.

## OAuth and “connectors”

OAuth is for allowing a user to connect an existing Standard Stripe account to an application. Stripe explicitly says OAuth is **not recommended for new Connect platforms** and recommends Connect Onboarding instead. Accounts connected using OAuth also remain an Accounts v1 use case, according to Stripe's Accounts v2 limitations. [Standard-account OAuth](https://docs.stripe.com/connect/oauth-standard-accounts), [Accounts v2 limitations](https://docs.stripe.com/connect/accounts-v2/migrate-integration#accounts-api-v2-limitations)

Therefore, do not add OAuth merely to solve the misconception that the Vercel secret key points users to Andrew's account. It would introduce another account-linking model without fixing tenant/account ownership. OAuth is only worth reconsidering if the product requirement becomes: “let established Stripe merchants explicitly connect their pre-existing independent Stripe account,” and that workflow is validated against Accounts v2 limitations.

Stripe's official SDKs, Connect APIs, hosted onboarding, and embedded components are the integration. A third-party “connector” is neither necessary nor a substitute for the platform's account mapping and webhook state machine.

## Test, Sandbox, and live separation

Stripe credentials and objects are environment-scoped. A test/Sandbox connected account, Account Link, webhook secret, capability state, Checkout object, and test bank/card result do not prove live behavior. Stripe's Accounts v2 SaaS guide says this integration must be tried in a **Sandbox**, not legacy test mode. [Accounts v2 SaaS test environment](https://docs.stripe.com/connect/integrate-billing-connect#test-environment)

Production requirements:

- Use live platform keys only in production and Sandbox keys only in preview/local environments.
- Use distinct webhook/event-destination signing secrets per environment and endpoint.
- Never copy `acct_...` IDs between Sandbox and live database records.
- Store an explicit Stripe environment/mode with the connected-account mapping, or enforce it through fully isolated databases.
- Never allow a preview deployment backed by a shared production database to create or mutate live connected accounts.
- Complete platform Connect activation/branding and webhook configuration in live mode before launch.
- Validate one real sitter's onboarding, capability activation, direct charge, 3% application fee, refund/dispute ownership, payout, statement descriptor, and webhook transitions in live mode before claiming production readiness.

## Implementation acceptance criteria

1. One authenticated business owner can create at most one active connected-account mapping per Stripe environment; retries are idempotent and concurrency-safe.
2. Another tenant can never open, query, or charge against that mapping.
3. New accounts use the recommended immutable Accounts v2 responsibilities and request card payments.
4. Account Links are generated just-in-time with correct return and refresh behavior.
5. Return handling retrieves Stripe state and never marks readiness from redirect alone.
6. UI states distinguish actionable setup, review, restriction, readiness, and provider failure.
7. Direct Checkout/PaymentIntent creation is connected-account scoped and calculates the 3% fee server-side.
8. Payment creation fails closed unless `card_payments` is active.
9. Accounts v2 thin-event requirements updates reconcile local state; connected-account payment events are verified and idempotent.
10. Sandbox and live credentials, account IDs, event destinations, data stores, and verification evidence remain isolated.

