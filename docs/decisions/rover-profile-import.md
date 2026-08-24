# Rover profile import — Decisions

Resolved, implementation-relevant answers from grilling. Each record is the
source of truth for downstream work; the PRD and implementation issues must
cover every one.

## D1 — Sitter supplies the Rover public-profile URL

**Resolved:** “We can instruct/prompt the user to go to their Rover public account, take the URL, and input the URL somewhere.”
**Requirement:** The import begins when the sitter pastes a Rover public-profile URL into Sitterfolio.
**Constraints:** `/build` may collect the URL before authentication, but capture waits for authentication and owned-Site context. A pasted URL is input, not proof that the sitter controls the Rover profile; the D8 attestation is also required.

## D2 — ScreenshotOne captures the source page

**Resolved:** “I want to use this screenshot API: Screenshotone.com to screenshot the full page.”
**Requirement:** Sitterfolio uses ScreenshotOne to capture the submitted Rover public-profile page for the import workflow.
**Constraints:** Bound full-page height, navigation, and application timeouts; use a load state that does not depend on `networkidle0`; request a direct screenshot binary without rendered-HTML metadata. Provider capture success must not mutate the Site by itself.

## D3 — An OpenRouter vision model analyzes the screenshot

**Resolved:** The initial Gemini choice was revised by “use a better model if necessary” after the production-contract canary proved Google rejected the extraction schema. GPT-5.4 Mini is the tested default through the OpenRouter AI SDK provider.
**Requirement:** An environment-configured vision model reached through the OpenRouter AI SDK provider analyzes the captured screenshot and returns compatible Sitterfolio profile candidates.
**Constraints:** Use the D15 configurable model and privacy-routing contract with validated structured output and fail-closed behavior. Model output is untrusted candidate data and must pass application validation.

## D4 — Import removes manual re-entry

**Resolved:** “Then fill in the details autonomously” and “This user flow must feel very intuitive and easy for users to set up from transitioning over from Rover.”
**Requirement:** After successful analysis, compatible Sitterfolio profile fields are populated without requiring the sitter to retype the extracted content.
**Constraints:** Candidates require explicit sitter review before they change the owned Site. The one eligible primary image follows D12’s visible-crop, validation, owned-storage, and manual-fallback contract.

## D5 — The first release is a local, private proof of concept

**Resolved:** “dont worry about the terms for now, as this is just a proof of concept for now and not public. implement this feature end to end.”
**Requirement:** The Rover import is implemented and verified as a local, private proof of concept.
**Constraints:** Do not deploy, publicly expose, or release the proof of concept to production. The proof of concept does not establish that a later public product may process or republish Rover content; public release remains a separate policy, privacy, provider-configuration, and production-readiness decision.

## D6 — Only visible sitter profile content is eligible

**Resolved:** For the private proof of concept, exclude reviews, gallery or stay photos, badges, and source-only, hidden, or private records.
**Requirement:** Extraction considers only sitter profile text and the primary profile photo visibly rendered in the captured public-profile page; it ignores reviews, gallery/stay media, badges, and any record available only in HTML, serialized application state, an undocumented endpoint, or a robots-disallowed path.
**Constraints:** Rendered HTML or embedded React state must not be parsed to recover hidden or source-only content. The proof of concept does not enumerate or import multiple Rover images.

## D7 — The sitter reviews candidates before applying them

**Resolved:** Require explicit user review before applying imported content.
**Requirement:** Successful analysis produces a reviewable candidate populated into Sitterfolio fields; the owned Site changes only after the authenticated sitter explicitly applies the reviewed candidate.
**Constraints:** Capture or model success never writes directly to the Site. Missing, unsupported, and low-confidence output cannot clear an existing non-empty value. Applying the reviewed candidate uses the existing owner-derived Site update boundary and normal field validation.

## D8 — The authenticated sitter attests to ownership and permission

**Resolved:** Yes—the private proof of concept requires the authenticated sitter to confirm “I own this Rover profile and have permission to import its visible content” before capture; no stronger Rover-account verification is required for now.
**Requirement:** Before Sitterfolio sends the Rover URL to ScreenshotOne, the authenticated sitter explicitly confirms that exact ownership-and-permission statement.
**Constraints:** An unchecked confirmation prevents capture. The confirmation is a proof-of-concept attestation, not independent Rover-account verification, and does not authorize importing excluded or non-visible content.

## D9 — The public sitter page expands to carry useful imported content

**Resolved:** “i think it should apply for more content on the sitters page.”
**Requirement:** The proof of concept expands Sitterfolio’s public sitter content model and page where Rover exposes useful, visible, sitter-owned profile content that has no compatible destination today.
**Constraints:** Expansion remains bounded to the approved proof-of-concept field bundle. Reviews, badges, hidden/private/source-only records, gallery/stay photos, platform metrics, and claims Sitterfolio cannot substantiate remain excluded. The vision model extracts and organizes visible content; it must not invent missing facts.

## D10 — The richer profile uses one bounded content bundle

**Resolved:** Yes—the richer profile bundle includes a long About section; per-service descriptions with visible starting price and billing unit; care routine; home/environment summary; pet preferences; experience and special-care descriptions; and the primary visible sitter photo. Every imported field is editable before applying. Reviews, badges, platform metrics, availability calendars, gallery/stay photos, and unverifiable claims are excluded.
**Requirement:** Screenshot analysis returns candidates for the approved richer-profile fields plus compatible existing Site fields, and the review screen lets the sitter edit every candidate before one explicit apply action updates the owned Site.
**Constraints:** Store displayed service prices as descriptive advertised starting prices with their visible billing unit, not guaranteed quotes or payment amounts. Do not infer absent content, convert Rover platform metrics into Sitterfolio claims, or import excluded categories. The primary sitter photo is the only eligible imported image.

## D11 — Import is optional in build, onboarding, and editing

**Resolved:** Yes to signed-in onboarding and the existing profile editor, and also add import as an optional step in `/build` so Rover users do not manually fill details already present.
**Requirement:** `/build` offers an optional Rover-import step, incomplete-Site onboarding offers import at the start, and an existing Site’s profile editor keeps import available as a secondary action.
**Constraints:** Before authentication, `/build` only validates and stores the Rover URL and ownership attestation in the browser-local draft. ScreenshotOne and vision processing begins only after authentication during `/launch` or owned onboarding. There is no unauthenticated paid-provider endpoint, and skipping import preserves the current manual flow.

## D12 — The primary photo becomes a Sitterfolio-owned asset

**Resolved:** The current image contract and the approved visible-content boundary require the one eligible primary sitter photo to be copied into Sitterfolio’s existing owned profile-media storage rather than hotlinked from Rover.
**Requirement:** If the visibly rendered screenshot yields a usable primary sitter portrait, the proof of concept keeps the validated crop with the review candidate and stores it through the authenticated Site’s Vercel Blob profile path only when the sitter explicitly applies the candidate.
**Constraints:** Accept only the repository’s supported JPEG, PNG, or WebP formats within its 5 MiB limit. Do not request a source-only Rover image URL, enumerate other photos, or retain a Rover hotlink. If no usable visible portrait can be isolated, leave the current image unchanged and let the sitter upload one manually.

## D13 — Provider artifacts are ephemeral

**Resolved:** A local/private proof of concept does not need a durable import-job or raw-artifact history when the owned Site changes only after explicit review.
**Requirement:** Keep the screenshot, model prompt/response, and unapplied candidate transient; persist only the sitter-approved Site content and its Sitterfolio-owned primary photo.
**Constraints:** Use ScreenshotOne’s direct binary response rather than a temporary screenshot URL or rendered-HTML metadata. Do not persist screenshots, hidden page content, model reasoning, or failed candidates in PostgreSQL or Blob. A refresh before apply may discard the candidate and require a new import.

## D14 — Import is bounded, observable, and safely retryable

**Resolved:** The repository has no queue or job abstraction, and the private proof of concept does not justify introducing one; provider work remains request-coupled with explicit stage and timeout handling.
**Requirement:** The UI reports capture, analysis, review, applying, success, and failure as distinct states. A timeout, provider error, cancellation, invalid model object, or missing credential ends without partial Site mutation and offers one deliberate retry from capture.
**Constraints:** Use bounded provider and application aborts; do not wait on `networkidle0`. Disable compounded automatic retries for the proof of concept so one user action cannot silently multiply ScreenshotOne or model work. Prevent duplicate submits while an attempt is active.

## D15 — Provider use fails closed with conservative privacy routing

**Resolved:** The private proof of concept runs only where ScreenshotOne and OpenRouter credentials are explicitly configured and uses the provider privacy controls established in research.
**Requirement:** Capture uses ScreenshotOne; analysis uses an environment-configured vision model through the OpenRouter AI SDK provider, defaulting to the production-canary-tested `openai/gpt-5.4-mini`, structured output, data-collection denial, and zero-data-retention routing.
**Constraints:** Missing credentials, quota, no eligible privacy-compatible endpoint, invalid schema output, or provider failure returns a stable unavailable/retry state with no Site mutation. The model identifier stays configurable because catalog availability and pricing can change.

## D16 — The URL boundary is Rover-only

**Resolved:** The POC accepts a user-provided Rover profile URL, while ScreenshotOne’s public documentation does not establish a complete arbitrary-destination isolation contract.
**Requirement:** Accept only canonical HTTPS URLs on Rover’s approved public host whose path matches the public `/members/<profile>/` shape; discard search/tracking parameters before capture.
**Constraints:** Reject credentials, custom ports, alternate schemes, non-Rover hosts, malformed member paths, and redirects or returned asset locations that would require Sitterfolio to dereference an unapproved destination. Sitterfolio sends the canonical Rover page only to ScreenshotOne and does not fetch rendered HTML or Rover-hosted image URLs itself.

## D17 — Shared understanding is confirmed

**Resolved:** Yes—the user explicitly confirmed the complete scope recorded in this ledger.
**Requirement:** Technical design, UI prototyping, and implementation cover D1 through D16 as one coherent local/private proof of concept.
**Constraints:** Any change to the release boundary, eligible content, provider flow, review-before-apply contract, richer-profile bundle, or authenticated processing boundary reopens the affected decision before implementation diverges from this ledger.

## D18 — Review state stays transient and browser-local

**Resolved:** The private POC uses one request-coupled capture/analysis request and keeps the completed review draft in browser IndexedDB for 30 minutes rather than adding an import-job table, queue, or raw-artifact store.
**Requirement:** A same-browser refresh may restore the bounded review draft, while apply, discard, restart, or expiry deletes it.
**Constraints:** The browser store may contain normalized candidates and the visible portrait crop, but never the full screenshot, prompt, raw model response, provider key, or authentication token. Browser state is not authorization; prepare and apply both re-derive Site ownership from the authenticated User.

## D19 — Rich profile content remains part of the Site aggregate

**Resolved:** Add bounded Site text fields for About, care routine, home/environment, pet preferences, experience, and special care. Keep the existing ordered `services` list authoritative for service names and store optional description, starting-price text, and billing-unit text as bounded JSON enrichment keyed to those names.
**Requirement:** Existing Sites and services continue to render when no richer content exists, while imported and manually edited richer content uses the same validation rules.
**Constraints:** Starting prices remain descriptive text and never become Booking, Payment-request, or public-payment amounts. The migration adds defaults and constraints but is not applied to any external database without a separate authorized migration gate.

## D20 — Reviewed apply uses revisioned transactional ownership

**Resolved:** Add a monotonic Site profile revision and apply the reviewed non-empty patch through one owner-derived PostgreSQL transaction. Stage a deterministic Sitterfolio-owned portrait Blob before the transaction and compensate it if the database write does not commit.
**Requirement:** Concurrent profile changes produce a review conflict rather than a silent overwrite, and every reviewed Site field becomes publicly visible together.
**Constraints:** Empty imported review values preserve current content. Blob and PostgreSQL cannot share a transaction; deterministic naming, a Site apply lock, preflight existence check, and compensating delete are the bounded POC guarantee, not distributed atomicity.

## D21 — The primary image is a crop of visible screenshot pixels

**Resolved:** The vision model identifies a high-confidence bounding box for the primary sitter portrait in ordered screenshot slices, and Sitterfolio crops those visible pixels in memory.
**Requirement:** Only a validated, metadata-stripped JPEG/PNG/WebP crop selected during review may be copied to the authenticated Site's Blob path on apply.
**Constraints:** Sitterfolio never fetches or hotlinks a Rover image URL. Failure to isolate a safe visible portrait is non-fatal and preserves the current photo or manual-upload path.

## D22 — Rover-assisted Site creation remains unpublished until setup completes

**Resolved:** The `/build` import shortcut creates an incomplete owned Site before paid provider work so every import has authenticated ownership context.
**Requirement:** A Site with no onboarding completion timestamp is not publicly rendered; a new Rover-assisted Site becomes public only through the normal completion action after its required setup details are present.
**Constraints:** An existing completed Site remains publicly visible with its current content during re-import. Capture, analysis, and review never change its live content.

## D23 — Explicit environment flag replaces the local-only runtime guard

**Resolved:** The user explicitly removed the hard production and Vercel prohibition after configuring the provider credentials in Vercel.
**Requirement:** `ROVER_IMPORT_POC_ENABLED=true` enables the import in any runtime, including Vercel Preview and Production, while a missing or non-`true` flag keeps it unavailable.
**Constraints:** Prepare still fails closed without ScreenshotOne and OpenRouter credentials. Enabling the flag does not apply the profile migration, deploy code, or prove provider, browser, database, or production behavior; those remain separate gates.

## Grill status

Complete. All material branches have a settled answer and the user confirmed shared understanding.
