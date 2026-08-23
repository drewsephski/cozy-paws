# ADR-0003: Promote qualified Leads into reusable Client households

## Status

Accepted — 2026-08-23

## Context

A Lead captures one availability request. Reusing that row as the sitter's long-term client and pet record would couple prospect lifecycle, care history, and future Bookings to one request. Sitterfolio needs a small first step toward repeat-client operations without introducing scheduling or changing the existing payment lifecycle.

## Decision

- Add a **Client household** owned by the Lead's Business and attributed to exactly one source Lead.
- Add reusable **Pet profile** records under the Client household.
- Only `QUALIFIED`, `QUOTED`, or `BOOKED` Leads may be promoted.
- Promotion derives ownership through `User → Business → Site → Lead`, locks the Lead, and is idempotent by source Lead.
- Initial household and Pet-profile data is copied from the immutable Lead snapshot. When the request lacks pet names, generated draft names stay visibly generic so the sitter can distinguish and refine them later.
- Sitters may maintain household contact, postal, and care details, edit Pet profiles in place, and add Pet profiles under an owned household. Editing never replaces a Pet row, so existing Booking references retain a stable profile ID.
- Every edit and addition derives ownership server-side through `User → Business → Client household`; submitted household and Pet IDs select records but do not establish Business ownership.
- A Client household is not a Booking. Scheduling, booking confirmation, and repeat-booking behavior remain future slices.

## Consequences

The ownership graph gains `Business → Client household → Pet profile`, while the source Lead remains intact for acquisition and payment attribution. Editing authorizes through the owning Business, and Bookings reference Client household and Pet profiles rather than copying identity into another Lead.
