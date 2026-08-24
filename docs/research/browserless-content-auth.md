# Browserless `/content` authentication and production transport

Date: 2026-08-24

Scope: official Browserless documentation, first-party source, and a bounded
credential-safe canary against the configured Browserless Cloud fleet. No token
value, Rover credential, cookie, or provider-returned connection URL is recorded
here.

## Decision

Sitterfolio authenticates `POST /content` with HTTP Basic authentication and
keeps the Browserless token out of the URL:

```http
Authorization: Basic <base64(BROWSERLESS_API_TOKEN)>
```

Browserless's legacy REST authentication guide explicitly documents this form
and warns that the raw token must be base64 encoded. Current Browserless server
source accepts both Basic and Bearer credentials, while its compatibility shim
rewrites query-string tokens to Bearer before authorization. Sources:
[REST header authentication](https://docs.browserless.io/baas/v1/hosted-service/token#header-authentication),
[`getAuthHeaderToken`](https://github.com/browserless/browserless/blob/2222d9f5c3e758f782dc066e5505ddad198ec2ee/src/utils.ts#L47-L59),
and the [query-token shim](https://github.com/browserless/browserless/blob/2222d9f5c3e758f782dc066e5505ddad198ec2ee/src/shim.ts#L16-L37).

The assigned cloud fleet is the deciding runtime contract. With the same
configured credential and harmless `https://example.com` target on 2026-08-24:

- Bearer authentication returned provider HTTP 500 before a target response
  existed.
- Basic authentication returned provider HTTP 200 and target HTTP 200 in
  994 ms.

The adapter therefore uses Basic for this fleet. This evidence is specific to
the currently configured Browserless account and endpoint; a fleet migration
must re-run the header-authentication canary before changing the scheme.

## Production request shape

The adapter accepts only Browserless's allowlisted SFO, LON, or AMS shared-fleet
HTTPS origins and the exact `/content` path. Callers provide only a canonical
allowlisted public Rover profile URL. The request uses:

- a server-only `Authorization` header;
- `Content-Type: application/json`;
- a bounded provider timeout shorter than the application timeout;
- Browserless's built-in US residential proxy;
- blocked image, media, and font response bodies;
- a wait condition for Rover's public hydration marker.

No client can supply the provider host, path, headers, proxy credentials, or
launch parameters. `token` is explicitly removed from the query string.

Browserless documents `proxy=residential`, `proxyCountry`, and other built-in
proxy parameters for REST requests. It bills browser time in 30-second units and
residential traffic at 6 units/MB. Sources:
[proxy configuration](https://docs.browserless.io/rest-apis/proxies) and
[unit consumption](https://docs.browserless.io/overview/unit-consumption).

## Response contract

Browserless transport status and Rover's navigation status are separate. A
successful `/content` operation uses Browserless HTTP 200 and reports the target
through `X-Response-Code`. Sitterfolio rejects a missing or malformed target
status, challenge responses, incomplete galleries, oversized HTML, timeouts,
and schema drift. Source: [current `/content` response headers](https://github.com/browserless/browserless/blob/2222d9f5c3e758f782dc066e5505ddad198ec2ee/src/shared/content.http.ts#L253-L274).

The exact-source Preview canary completed three authenticated sequential exports
against the documented public sample profile. All three returned 111 unique
full-resolution photo URLs, complete profile data, and ten first-page reviews.
Observed latencies were 8.015 s, 9.591 s, and 10.031 s (p50 9.591 s; nearest-rank
p95 10.031 s).

## Usage observability limitation

Browserless documents its account usage endpoint only with `?token=...`.
Sitterfolio's no-secrets-in-URLs rule therefore prohibits using it until
Browserless documents header authentication for that account endpoint. Exact
per-request units must be read from the Browserless dashboard. Source:
[Usage API](https://docs.browserless.io/overview/unit-consumption#usage-api).
