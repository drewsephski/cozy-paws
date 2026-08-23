# ADR-0004: Owned Bookings for saved Client households

## Status

Accepted — 2026-08-23

## Context

Client households and Pet profiles preserve reusable customer and care details independently of a Lead. A sitter now needs a bounded way to plan agreed care without turning Lead or Payment-request state into a scheduling model.

## Decision

- A **Booking** belongs to one Business and one Client household, and includes one or more Pet profiles from that household.
- Creation and transitions derive ownership through the authenticated User and Business. Callers submit a household, pets, dates, amount, and optional notes; they never submit a Business or source Lead as ownership proof.
- The Booking snapshots the Client household's source Lead when available for acquisition attribution. It does not mutate or duplicate the Lead, Conversation, or Payment request.
- Dates are inclusive calendar dates with an ordered start and end. The agreed amount is integer cents from 100 through 1,000,000. Payments remain a separate domain and no Checkout is created from a Booking.
- The lifecycle is deliberately small: `DRAFT → CONFIRMED → COMPLETED`, with `CANCELLED` allowed from `DRAFT` or `CONFIRMED`. Terminal Bookings do not reopen.
- Composite foreign keys enforce Business/household/source-Lead consistency and ensure every selected Pet profile belongs to the Booking's household.
- The dashboard uses the sitter device's local calendar date to divide an upcoming/past grouped list rather than rendering a calendar grid. This slice does not add staff assignment, routes, GPS, recurring series, marketplace behavior, or native clients.

## Consequences

Booking, Lead, and Payment-request statuses remain independent and must use their own transition modules. The Booking migration is manual and guarded; local, Preview, and Production application remain separate release gates requiring verified database identity, isolation, and explicit authorization.
