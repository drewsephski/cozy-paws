# Rover export architecture, vendor, and policy research

Date: 2026-08-24

Scope: First-party evidence for the architecture and policy choices around exporting a sitter's Rover profile photos, profile details, and reviews from a Next.js application deployed on Vercel. This document covers Rover's published terms/privacy controls and the deployment characteristics of hosted browsers, container hosts, AWS Lambda container images, and `@sparticuz/chromium`. It does not claim that any undocumented Rover endpoint is stable or authorized, and it is not legal advice.

## Executive recommendation

Use a staged architecture, in this order:

1. **Prefer a plain server-side fetch only if live inspection proves that the exact public JSON/GraphQL endpoint is unauthenticated, returns the complete dataset, and continues to work from Vercel egress.** Keep the parser behind a provider adapter because an undocumented endpoint can change without notice. Fetch only structured metadata in the Vercel function; return canonical full-resolution CDN URLs or copy images directly to owned object storage rather than proxying image bytes through the function.
2. **For a sitter's non-public data, prefer an official Rover privacy export imported by the user, or a user-side extraction flow, over collecting Rover credentials/cookies.** Rover's privacy statement offers account access and a Rights request path, and recognizes data-portability rights for UK/Swiss/EEA users. This is a more defensible product boundary than operating the user's account from Sitterfolio infrastructure.
3. **If the public page truly requires a browser, use a hosted remote-browser service from Vercel and prove it against Rover before committing to a vendor.** The strongest first pilots are Browserless (explicit `headless=false`, Playwright connection, residential proxy) and Browserbase (Playwright connection, automatic fingerprinting, captcha handling, managed residential proxy, strong session/network diagnostics). Disable recordings/logs for any authenticated session. Keep ScrapingBee as a lighter HTML-extraction experiment, not the default for a 100-photo interactive gallery, because its JavaScript scenario is capped at 40 seconds and its documented infinite-scroll instruction is not supported with stealth proxies.
4. **Use a separate Docker service only if hosted-browser success or unit economics are unacceptable at sustained volume.** Railway, Render, or Fly can run a normal browser image and give control over browser versions, Xvfb/headed mode, session pooling, and request queues, but Sitterfolio then owns patching, process cleanup, capacity, observability, and proxy reputation. AWS Lambda container images are a large-package serverless option, not a long-running host.
5. **Do not make `@sparticuz/chromium` inside the main Vercel app the default.** Its own README says it packages `chrome-headless-shell`, has no GUI, recommends 1,600 MB or more memory, carries a Chromium blob over 50 MB, and does not use semantic versioning. Those properties are a poor match for the observed Rover result where a headed browser succeeds but headless Chromium does not. A remote pack can reduce the deployment bundle, but adds a cold-start download/decompression path and does not fix browser fingerprint or egress-IP blocking.

The commercial/legal risk remains material even for a technically successful implementation. Rover's current Terms do not state an express `scraping`, `robot`, or `automated access` prohibition in the text reviewed, but they do require use only for intended purposes; prohibit use to compete with Rover or promote another product/service; prohibit authorizing another person to use an account; prohibit interference; and permit suspension. A product expressly marketed as helping sitters “move off Rover” fits uncomfortably with the competition/promotion restriction. Own-data portability reduces privacy, copyright, and third-party-profile risk, but it does not itself waive those contract terms.

## Live Rover findings

Inspected on 2026-08-24 using the supplied [public sitter profile](https://www.rover.com/members/indre-p-fox-river-grove-dog-sitter/) in a visible Chromium browser, plus cookie-free Node `fetch()` calls from the current development environment. This is a point-in-time observation of undocumented internals, not a public API contract.

### The complete public gallery is server-rendered into React Query state

The page is a React application using loadable chunks, not Next.js: there is no `__NEXT_DATA__`. Its HTML contains a 527,933-character inline assignment named `window.__REACT_QUERY_STATE__` with 15 dehydrated queries. The relevant query keys were:

```text
GET /api/v7/people/full-sitter-profile/?slug=indre-p-fox-river-grove-dog-sitter
GET /api/v7/people/gmKErq6A/images/
GET /api/v7/people/gmKErq6A/stay-media/
GET /api/v7/people/gmKErq6A/reviews/?page=1
GET /api/v7/frontend/current-user/
```

The dehydrated query objects have the shape `{ queryKey, queryHash, state: { data } }`. The important response shapes are:

```json
{
  "full-sitter-profile": {
    "opk": "gmKErq6A",
    "personId": "",
    "firstName": "Indre",
    "shortName": "Indre P.",
    "description": "...",
    "experience": "...",
    "environment": "...",
    "images": ["10 image records"],
    "defaultImage": { "largeUncropped": "https://www.rover.com/cf-image-cdn/.../original?..." },
    "services": "...",
    "attributes": "..."
  },
  "images": {
    "pages": [{ "count": 10, "next": null, "previous": null, "results": ["10 image records"] }],
    "pageParams": [null]
  },
  "stay-media": {
    "pages": [{ "count": 100, "next": null, "previous": null, "results": ["100 { type, isPetOwner, object } records"] }],
    "pageParams": [null]
  },
  "reviews": {
    "count": 21,
    "next": "https://www.rover.com/api/v7/people/gmKErq6A/reviews/?page=2",
    "results": ["10 review records"],
    "totalRatings": 35,
    "totalTextReviews": 21
  }
}
```

The `full-sitter-profile` response's `personId` was empty; its `opk` matched the `gmKErq6A` identifier used in the endpoint paths, so an extractor must use `personId || opk` rather than trusting the field name. The photo manifest is one `defaultImage` portrait + 10 `/images/` records + 100 `/stay-media/` image records = the 111 images shown by Rover's gallery. A material addition to the initially supplied CDN pattern is that stay photos use `/cf-image-cdn/remote/images/messages/{messageId}/{photoId}/original.jpg`, not only `people` or `pets`. Every image record exposes multiple renditions such as `galleryThumb`, `largeUncropped`, and `largeUncroppedRetina`; stripping the query from an allowlisted `largeUncropped*` URL yields the original.

### “View All” is presentation-only for this profile

Clicking “View All” keeps the same route and opens an ARIA modal dialog. The dialog immediately contained 111 image elements and made 111 thumbnail CDN requests. It made no profile/gallery data API request; the only `/api/` request observed at that moment was an event-stream analytics POST. Therefore a data extractor does not need to click, scroll, or wait for gallery pagination on this profile. It should parse the hydration state and require `next === null` plus a reported-count/unique-manifest match before declaring completion.

Reviews behave differently. Four reviews were initially rendered in the page. “Read more reviews” opened a modal and issued anonymous `GET /api/v7/people/gmKErq6A/reviews/?page=1&pageSize=10`, returning 200 and ten reviews. The embedded page-1 response advertises page 2. A full review export must follow `next` inside the same accepted browser session until it is null, with a page/review ceiling and deduplication by review ID.

### Public data does not mean cookie-free server fetch

The hydrated `GET /api/v7/frontend/current-user/` response was `{ "authenticated": false, "session": { ... } }`, so no Rover login was required for the public profile, gallery metadata, or first review page. The review XHR used these header names:

```text
Accept: application/vnd.rover.api.camel+json
Referer: https://www.rover.com/members/...
X-CSRFToken: <anonymous browser-session token>
X-Rover-Source: web
User-Agent: <normal Chromium user agent>
```

No bearer `Authorization` header was observed. The exact browser cookies were deliberately not inspected. The CSRF header is therefore an observed frontend header, not proof that it is independently required for a GET.

By contrast, a plain Node `fetch()` from the development environment received a Cloudflare `403` “Just a moment...” challenge for the profile page and all four v7 endpoints. Repeating with a realistic Chromium user agent and navigation headers still returned 403. The full-resolution CDN original returned 200 without browser state. This proves that approach A is structurally possible but not transport-viable from this Node egress; it does not by itself prove how Rover treats every Vercel region or IP. Because Vercel uses datacenter egress and the user already observed headless Chromium failure, direct Vercel fetch should not be the production default without a fresh deployed canary.

No GraphQL request or GraphQL hydration key was observed.

### Public versus authenticated scope

Publicly available in the inspected anonymous session: sitter display/profile details, services and public attributes, the 111-photo public gallery manifest, review summary, and public review text. Private account/profile-edit fields, conversations, client contact details, bookings, payments, and a sitter's private media were not tested and must not be inferred to be accessible. For those fields, prefer Rover's official privacy export; do not collect a Rover password or persist a Rover browser session in the MVP.

## Decision matrix

| Approach | Vercel fit | Reliability and bot resilience | Cost model | Maintenance | Recommendation |
|---|---|---|---|---|---|
| **A. Plain fetch of discovered JSON/GraphQL + CDN** | Excellent: ordinary I/O-bound Node route, small dependency surface | Highest when the endpoint is public and stable; lowest if it is an undocumented internal API with changing schemas/tokens | Lowest infrastructure cost; Rover/CDN and Vercel request volume remain the limiting inputs | Parser/schema monitoring and endpoint fallbacks | **First choice only after live proof.** Validate no cookies, full pagination, Vercel egress, and cache/rate behavior. |
| **B. Hosted browser called from Vercel** | Strong: Vercel holds orchestration code and connects over HTTPS/WebSocket; Chromium runs elsewhere | Vendor fingerprinting, residential proxies, captcha support, and browser patching improve resilience, but do not guarantee Rover success or permission | Subscription/usage units or browser minutes; proxy bandwidth and captcha solves cost extra | Selector/workflow maintenance plus vendor integration; browser fleet is outsourced | **Best browser fallback.** Pilot Browserless and Browserbase against the actual gallery, then choose based on measured success, latency, privacy controls, and cost. |
| **C. Browser in separate container host** | Strong separation; Vercel starts/jobs/polls the worker | Full control of normal Chrome/headed/Xvfb and session pooling; datacenter IP remains detectable unless a proxy is added | Allocated/used CPU, RAM, and egress; sleep/autostop saves idle cost but adds cold start | Highest: images, CVEs, browser crashes, queues, concurrency, cleanup, metrics, and proxy vendor | **Scale/escape hatch**, not MVP default. Prefer a queued worker with idempotent jobs over holding an end-user HTTP request open. |
| **D. `@sparticuz/chromium` + `playwright-core` in Vercel** | Technically possible if the traced bundle and runtime fit; the `-min` package can download a remote pack | Weak match for this target: headless-shell only and same serverless/datacenter identity class that already failed in testing | Vercel compute plus cold-start download/CPU; no separate vendor fee, but failures/retries are still cost | Chromium/Playwright compatibility, non-semver package changes, tracing, remote-pack hosting, browser cleanup | **Do not choose for Rover.** Reconsider only after an exact production proof shows Rover accepts this binary/egress and the operational cost is better. |

## Rover Terms and privacy evidence

### Current contract signals

The current U.S. Terms page says it is effective **March 27, 2025** and applies to use of Rover through its website, apps, mobile sites, and “any other access point,” including access without an account. The most relevant conduct clauses say users must:

- use Rover only lawfully and for its intended purposes;
- not arrange a Rover-originated service and then complete it outside Rover;
- not use Rover to compete with Rover or promote other products or services;
- use Rover only for their own purposes;
- not transfer or authorize another person to use their account;
- not interfere with Rover's provision or another user's use; and
- accept that Rover may suspend/terminate access for breach or to protect Rover and its users.

Source: [Rover Terms of Service, Sections 1 and 4](https://www.rover.com/terms/tos/).

The same Terms clarify an important nuance: they are non-exclusive and do not prohibit service providers from offering pet-care services “via other means or third parties.” That supports a sitter's independent business activity, but it does not cancel the separate restrictions on using Rover itself to arrange off-platform bookings, compete, or promote another product. Source: [Rover Terms, Section 21](https://www.rover.com/terms/tos/).

The reviewed current Terms text contains no express clause using the words “scrape,” “robot,” “automated,” or “data mining.” That absence should not be presented as permission. The broader purpose, account-use, interference, and suspension clauses still apply, and other laws/rights can apply independently.

### Content ownership is mixed

Rover defines profile text, photographs, images, videos, reviews, and related materials submitted by or on behalf of a user as “Your Content.” The user represents that they own or license it and have the necessary permissions/releases; Rover receives a broad license. Rover also says it has no obligation to retain or provide copies and tells users to keep backups. Reviews are distinct: Rover says it has no obligation to provide the sitter with the content of reviews about them. Source: [Rover Terms, Sections 7.1–7.6](https://www.rover.com/terms/tos/).

Consequences for the product:

- A sitter exporting photos and profile text they created is lower risk than bulk-copying arbitrary third-party profiles.
- “A review about me” is not necessarily content owned by me; it was written by another user. Preserve reviewer attribution and do not imply that the sitter authored it.
- Photos can contain clients, homes, addresses, messages, children, or pets belonging to others. Public visibility does not eliminate privacy, publicity, or copyright considerations.
- Export only fields needed for the user's stated portability purpose and do not build a reusable third-party Rover dataset.

### Privacy and data-portability route

Rover's Privacy Statement provides an “Access, portability, correction, and deletion” section. Users can access certain data through Profile/Account Settings and can submit a request through the Rights tab of Rover's Privacy Management Centre if data is unavailable there. Rover may refuse a request that it cannot authenticate or that would adversely affect another person's privacy or rights. UK, Swiss, and EEA users may have a right to receive personal data in a transferable format; California users can request specific personal information in a readable format. Source: [Rover Privacy Statement](https://www.rover.com/terms/privacy/).

This supports a product flow such as “request your Rover data, download it, then import the archive.” It does **not** prove that every profile photo or review will be included in every jurisdiction, because portability/access rights apply to personal data and can be limited by other people's rights.

### robots.txt signal

Rover's current `robots.txt` disallows `/api/`, `/members/reviews/*`, and `/cf-image-cdn/*` for the wildcard user-agent, while public `/members/...` profile routes are not generally disallowed. Robots directives are crawler instructions, not a substitute for Terms or legal permission, but the specific disallow rules are an additional reason not to build a general crawler over review/API/CDN routes. Source: [Rover robots.txt](https://www.rover.com/robots.txt).

### Risk ranking

From lower to higher risk:

1. User imports an official Rover privacy export; Sitterfolio extracts only the user's chosen fields.
2. User runs a local/user-side tool on their own logged-in browser and explicitly selects what to move, without sharing credentials or persistent cookies with Sitterfolio.
3. Sitterfolio fetches one public profile at the verified owner's request, at low rate, with no account session and no central dataset.
4. Sitterfolio operates a user's authenticated Rover session or stores their cookies on a hosted browser. This raises the account-authorization clause and vendor data-processing exposure.
5. Sitterfolio crawls arbitrary profiles or builds a review/photo corpus for acquisition, enrichment, or competitive use. This raises the clearest Terms, privacy, copyright, attribution, and interference concerns.

Before launch, obtain counsel's review of the actual UI, marketing claim, data flow, and retention schedule, and consider requesting written permission or an official export/API path from Rover. Do not describe “the user owns it” as a complete legal analysis.

## Hosted browser options for approach B

### Browserbase

Browserbase exposes a Sessions API and lets Playwright connect to the returned browser. Session configuration includes automatic fingerprinting, proxy settings, captcha solving, browser contexts, regions, timeouts, and recording/logging controls. Managed proxies are residential and can be geolocated. The Session Inspector exposes recordings, console logs, and network activity, which is useful when Rover changes the gallery flow. Sources: [create a Browserbase session](https://docs.browserbase.com/platform/browser/getting-started/create-browser-session), [connect with Playwright](https://docs.browserbase.com/platform/browser/getting-started/using-browser-session), [Browserbase proxies](https://docs.browserbase.com/platform/identity/proxies).

Privacy default: Browserbase records sessions by default. Set `browserSettings.recordSession = false`; for an authenticated workflow also disable logs where supported and never place cookies/tokens in user metadata. Browserbase documents recording disablement and an enterprise zero-retention posture. Sources: [session recording](https://docs.browserbase.com/platform/browser/observability/session-recording), [enterprise security](https://docs.browserbase.com/account/enterprise/security).

Current pricing snapshot, which can change: Browserbase's pricing page lists Free at 1 browser hour, Developer at $20/month with 100 browser hours, Startup at $99/month with 500 hours, additional proxy bandwidth, and higher tiers for advanced stealth/Verified identity. Its optimization docs say direct browser sessions have a one-minute minimum. Use a per-export cost model based on observed session duration and proxy MB, not the headline monthly price. Sources: [Browserbase pricing](https://www.browserbase.com/pricing), [cost optimization](https://docs.browserbase.com/optimizations/cost/cost-optimization).

### Browserless

Browserless supports Playwright over WebSocket and documents `headless=false`, stealth, residential/datacenter proxies, saved profiles, and recording/replay flags. This is the only reviewed vendor documentation that explicitly exposes a non-headless launch flag; that makes it a valuable Rover pilot given the observed headless/headed difference. Important caveat: Browserless's persisted-session docs say stealth always runs headless, so test `headless=false` plus residential proxy separately from the stealth route rather than assuming the features combine. Sources: [Browserless launch options](https://docs.browserless.io/baas/launch-options), [persisting state](https://docs.browserless.io/baas/session-management/persisting-state), [proxies](https://docs.browserless.io/rest-apis/proxies).

Its `/stealth/bql` route applies fingerprint mitigations and can combine navigation, clicks, and extraction in one API call. Browserless says residential proxies are harder to detect than datacenter proxies and recommends adding residential proxies/captcha solving if stealth alone is blocked. Sources: [stealth route](https://docs.browserless.io/browserql/bot-detection/stealth), [export BQL as API calls](https://docs.browserless.io/browserql/using-the-ide/using-api-calls).

Privacy default: ordinary recording/replay launch flags default to false, but a deliberately persisted session can retain cookies/localStorage until its configured TTL. Prefer a single short-lived session, no saved profile, no replay, and immediate close/deletion for authenticated work. Source: [Browserless session persistence](https://docs.browserless.io/baas/session-management/persisting-state).

Current pricing snapshot: Browserless bills browser time in 30-second units, with additional units for proxy traffic and successful captcha solves; the pricing page lists Free, $25/month Prototyping, $140/month Starter, and $350/month Scale when billed annually. Model actual Rover page MB carefully because image-heavy galleries can make residential-proxy bandwidth dominate unless image responses are blocked after their URLs are captured. Sources: [unit consumption](https://docs.browserless.io/overview/unit-consumption), [Browserless pricing](https://www.browserless.io/pricing).

### ScrapingBee

ScrapingBee's HTML API can render JavaScript, accept cookies, use a sticky `session_id`, return XHR metadata with `json_response`, and execute click/wait/scroll/evaluate scenarios. This makes it attractive for a small, HTTP-only Vercel integration. Sources: [HTML API](https://www.scrapingbee.com/documentation/), [JavaScript scenarios](https://www.scrapingbee.com/documentation/js-scenario/).

The mismatch is gallery complexity: ScrapingBee says a JavaScript scenario must finish within 40 seconds, and its `infinite_scroll` instruction is not supported when stealth proxies are used. A one-click gallery that exposes all URLs immediately may fit; repeated lazy-loading across 100+ photos is less comfortable. Its documented cost rises from 5 credits for ordinary JS rendering to 25 with a premium proxy and 75 with stealth. Source: [ScrapingBee credit costs](https://www.scrapingbee.com/documentation/).

### Vendor-selection proof, not assumption

Run the same canary against every candidate:

1. Navigate to the sample public profile from the vendor's default/datacenter egress.
2. Verify meaningful DOM content, not only HTTP 200 or favicon.
3. Click “View all,” record whether it is a route/modal and count unique original CDN URLs.
4. Repeat with normal residential proxy, then anti-detection/stealth mode if needed.
5. Repeat from a fresh session at least 20 times; measure success rate, p50/p95 time, proxy MB, captcha rate, and output completeness.
6. Separately test an authenticated owner flow only after policy/security approval, with recording/logging disabled and an isolated test account.

Do not choose a vendor because its marketing says “stealth.” The acceptance contract is complete, correctly attributed data for the target Rover flow at an acceptable measured error and cost rate.

## Separate-container options for approach C

Railway detects and builds a repository `Dockerfile`, bills subscription plus resource use, and offers a Serverless mode that sleeps a service after more than ten minutes without outbound traffic. A browser process, telemetry, or open connection may prevent sleep. Sources: [Railway Dockerfiles](https://docs.railway.com/builds/dockerfiles), [Railway Serverless](https://docs.railway.com/deployments/serverless), [Railway pricing](https://docs.railway.com/pricing).

Render can build or run Docker images. Free web services sleep after 15 minutes idle and take roughly a minute to wake; paid services do not spin down. Local files are ephemeral unless a persistent disk is attached. That makes a free instance unsuitable for a synchronous UX, while a paid worker/web service is operationally straightforward. Sources: [Docker on Render](https://render.com/docs/docker), [Render free services](https://render.com/docs/free).

Fly deploys Dockerfile-based applications to Machines and can automatically stop/suspend idle Machines and start them on demand. `min_machines_running = 1` avoids a fully cold browser worker at the cost of idle compute. Sources: [Fly Dockerfile deployment](https://fly.io/docs/languages-and-frameworks/dockerfile/), [Fly autostop/autostart](https://fly.io/docs/launch/autostop-autostart/).

AWS Lambda accepts container images up to 10 GB and functions can run for at most 15 minutes with up to 10 GiB memory. This solves package-size pressure but retains serverless cold starts, request-duration limits, ephemeral processes, and AWS operational complexity. It belongs between C and D: useful for bursty isolated exports, but not a reusable long-running browser pool. Sources: [AWS Containers whitepaper](https://docs.aws.amazon.com/pdfs/whitepapers/latest/containers-on-aws/containers-on-aws.pdf), [AWS Fargate or Lambda decision guide](https://docs.aws.amazon.com/pdfs/decision-guides/latest/fargate-or-lambda/fargate-or-lambda.pdf).

For any container worker, use a durable job contract: Vercel authenticates the user and enqueues `{userId, profileUrl, exportId}`; the worker fetches/extracts; results go to PostgreSQL/object storage; the UI polls or receives progress. Enforce one active export per user/profile, a hard page/runtime limit, browser cleanup in `finally`, and retry only idempotent phases.

## Direct Chromium on Vercel for approach D

Vercel's standard Node function bundle is capped at 250 MB uncompressed and request/response bodies at 4.5 MB. Current Pro/Enterprise Fluid Compute can opt into as much as 30 minutes for Node/Python, but durations above 800 seconds are beta. The newer duration ceiling makes time less decisive than package size, browser identity, crash cleanup, and output architecture. Sources: [Vercel Function limits](https://vercel.com/docs/functions/limitations), [30-minute functions announcement](https://vercel.com/changelog/vercel-functions-can-now-run-up-to-30-minutes).

`@sparticuz/chromium` documents the following constraints:

- it includes `chrome-headless-shell`, not a GUI browser;
- the bundled Chromium archive is over 50 MB, and the `-min` package is intended for hosts with package-size limits;
- a remote pack downloads, untars, and decompresses into `/tmp` on the first cold run;
- at least 512 MB RAM is required and 1,600 MB or more is recommended;
- package versions follow Chromium releases rather than semantic versioning, so breaking changes can occur at patch level; and
- the package must be externalized correctly when bundling.

Source: [`@sparticuz/chromium` README](https://github.com/Sparticuz/chromium/blob/master/README.md).

Therefore D may pass deployment limits with careful tracing or `chromium-min`, but it remains the wrong default for this particular target. Also return a JSON manifest of URLs/metadata, not a ZIP of 100 originals through the route: Vercel's 4.5 MB response limit makes large synchronous media responses inappropriate. Download originals directly to the client with bounded concurrency, or enqueue server-side copying into owned object storage.

## Production controls

### Authorization and authentication

- Require a signed-in Sitterfolio user for every export.
- Require the user to attest that the profile is theirs and verify ownership using a bounded method that does not require storing a Rover password: for example, a temporary code in a public profile field, an official export tied to matching identity, or human review.
- Never ask users to paste passwords into Sitterfolio. Do not store raw Rover session cookies. If a short-lived cookie transfer is approved, encrypt it, scope it to one job, do not log it, disable vendor recordings, and delete it immediately after the export.
- Do not let a client provide arbitrary internal API endpoints, headers, CDN hostnames, or redirects. Allowlist `https://www.rover.com/members/...` inputs and validate every redirect/asset origin to prevent SSRF.

### Rate limiting and load control

- One export at a time per user and per Rover profile; add a daily user quota and a low global concurrency cap.
- Cache a successful manifest for a short period and require an explicit refresh rather than re-scraping on every download.
- Respect `429` and `Retry-After`; use exponential backoff with jitter and a hard retry budget.
- Block image/font/video bodies inside the browser once response URLs have been captured, but do not block resources required for the gallery JavaScript itself.
- Fetch/download final CDN originals with bounded concurrency (for example 2–4 per job), deduplicate by stable photo ID, and stop on a configurable byte/count ceiling.
- Identify the product in a stable user agent/contact channel if Rover authorizes the integration; do not evade a direct block or captcha indefinitely.

### Data minimization and attribution

- Store the Rover source URL, export timestamp, sitter-selected fields, and reviewer display attribution.
- Do not imply Rover endorsement; preserve the distinction between sitter-authored profile content and third-party reviews.
- Default to user download/import rather than permanent Sitterfolio storage. Define and enforce deletion windows for temporary manifests, media, cookies, vendor sessions, logs, and failed jobs.
- Redact URLs, cookies, email addresses, phone numbers, and message content from telemetry. Treat vendor session inspectors and replays as production data stores subject to the retention policy.

### Error contract

Return stage-specific errors rather than “Rover import failed”:

- `PROFILE_NOT_PUBLIC_OR_NOT_FOUND`
- `OWNERSHIP_NOT_VERIFIED`
- `ROVER_BLOCKED_OR_CHALLENGED`
- `GALLERY_INCOMPLETE`
- `RATE_LIMITED` with retry time
- `PROVIDER_TIMEOUT`
- `UPSTREAM_SCHEMA_CHANGED`
- `EXPORT_TOO_LARGE`

An export is complete only when the observed gallery count matches the unique manifest count or the source explicitly reports the pagination terminal state. HTTP 200, a loaded shell, a successful click, or a handful of preview photos is not completeness proof.

## Recommended launch boundary

The safest narrow launch is:

1. import an official Rover data archive when available;
2. otherwise import one verified owner's public profile via an unauthenticated endpoint/page;
3. export a manifest and selected copies, not a searchable Rover dataset;
4. exclude private conversations, client contact data, booking/payment history, and non-public reviews;
5. prohibit arbitrary third-party profile exports in product policy and technical authorization;
6. rate-limit aggressively and honor blocks; and
7. obtain legal review/written Rover permission before marketing the feature as a tool to “move off Rover.”

Live inspection found a complete anonymous data source but also found Cloudflare blocking cookie-free Node transport. The immediate next experiment is therefore a small hosted-browser vendor bake-off—not a production container build or direct Vercel Chromium integration. Approach A becomes the preferred production path only if a deployed Vercel canary later proves reliable direct access without evasion or private session state.

## Included sample implementation

[`app/api/rover-export/route.ts`](../../app/api/rover-export/route.ts) is the working App Router sample. It keeps Chromium out of Vercel and uses Browserless's HTTP `/content` API, so no browser package or SDK is added to the Next.js bundle. The adapter sends the provider token in the `Authorization` header, launches headful Chrome through U.S. residential egress, rejects image/font/media bodies to control bandwidth, waits for the hydration marker, and returns at most 3 MiB of HTML. Vercel parses that HTML into a minimized manifest and never proxies the photo bytes.

Required environment:

```text
BROWSERLESS_API_TOKEN=...
# Optional; defaults to https://production-sfo.browserless.io/content
BROWSERLESS_CONTENT_ENDPOINT=https://production-sfo.browserless.io/content
```

The route requires a signed-in Sitterfolio session and explicit own-profile attestation:

```http
POST /api/rover-export
Content-Type: application/json

{
  "profileUrl": "https://www.rover.com/members/indre-p-fox-river-grove-dog-sitter/",
  "attestationAccepted": true
}
```

It returns canonical original photo URLs, minimized public profile data, the embedded first review page, and a `photoCompleteness` assertion. It fails closed for a challenge page, missing hydration, non-terminal photo pagination, duplicate/missing photos, oversized provider output, provider timeout, or schema drift. The provider has not been called with a real Browserless account in this research run, so Rover/Browserless compatibility remains a provider canary gate rather than a proven production outcome.

For full reviews, add a second hosted-browser operation that follows the response's `next` pages inside the same short-lived anonymous session. Do not let the client supply endpoint URLs or headers. Apply the production controls above: one active job per signed-in user/profile, three or fewer attempts per hour as a starting point, a daily quota, bounded 2–4-way CDN copying, `429`/`Retry-After` handling, jittered limited retries, temporary result caching, and explicit error codes. If exports routinely outlive an interactive function or need durable media copies, move orchestration to an idempotent queued worker while keeping the same parser/result contract.
