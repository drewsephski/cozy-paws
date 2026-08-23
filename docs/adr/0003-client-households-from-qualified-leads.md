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
- A Client household is not a Booking. Scheduling, booking confirmation, and repeat-booking behavior remain future slices.

## Consequences

The ownership graph gains `Business → Client household → Pet profile`, while the source Lead remains intact for acquisition and payment attribution. Future editing must authorize through the owning Business, and future Bookings should reference Client household and Pet profiles rather than copying identity into another Lead.
