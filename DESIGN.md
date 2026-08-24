# Sitterfolio Design System

This document is the authority for durable Sitterfolio UI conventions. It
describes the visual and interaction rules that should survive individual
features; implementation details remain in the code.

## Product character

Sitterfolio should feel calm, direct, and quietly capable. The interface helps
an independent sitter complete one clear business task at a time without
turning setup or daily work into a generic dashboard. Prefer plain language,
deliberate hierarchy, generous space, and progressive disclosure over dense
configuration surfaces.

The current visual foundation lives in `tokens.css` and `app/globals.css`:

- Geist is the display and body family.
- Verdant green is the primary action and status hue.
- Paper-white backgrounds, hairline neutral rules, and lightly raised white
  surfaces create structure without heavy decoration.
- Large headings use tight tracking; body copy stays compact and readable.
- Controls use restrained rounding, visible keyboard focus, and a minimum
  comfortable touch target.
- Texture is an occasional brand accent, not a default surface treatment.

## Setup and editing

Setup uses progressive disclosure. Ask for the smallest coherent group of
details, explain why it matters, and keep a recognizable public-site preview
nearby when the user's choices affect what pet owners will see. Optional
shortcuts must accelerate the flow without making the manual path feel like an
inferior fallback.

Frequent editing stays direct: the current content is visible and editable in
place, save state is explicit, and secondary tools do not displace the primary
editing task. Async actions name the work in progress and only the submitted
action displays a loading state.

## Imported profile content

An external-profile import uses the **seamless jump-start** pattern:

- On `/build`, place one calm optional import card above the existing manual
  fields. Lead with the benefit (bring over details already written), state that
  review happens before publishing, and keep a direct “enter details myself”
  path beside it.
- Pre-auth setup may collect the source URL and permission confirmation, but the
  visual flow clearly hands off to authentication before capture begins.
- Provider work is an observable sequence: authentication, capture, analysis,
  review, and apply. Show failure as a safe terminal state, say that the current
  Site was not changed, and offer one deliberate retry or a return to manual
  setup.
- Imported output is a draft. Organize the review into progressively disclosed
  profile, services, care, and media sections. Keep a public-page preview nearby
  so edits are judged in context rather than as raw fields.
- Every imported field remains editable. Apply the reviewed result with one
  explicit primary action; capture or analysis never implies publication.
- Missing, unsupported, or uncertain imported values never clear existing
  non-empty content.
- In the established profile editor, re-import is a secondary action. It creates
  a fresh review draft and never overwrites the live profile directly.

The import card and status surfaces use the existing white/verdant system. A
soft green tint may distinguish the optional shortcut, while neutral cards and
hairline borders retain continuity with onboarding and the profile editor.

## Responsive and accessible behavior

On narrow screens, retain the same decision order: import shortcut, manual path,
then preview. Stack preview and review rails below the active form instead of
compressing fields into unreadable columns. Sticky helpers become in-flow
content.

Status must not rely on color alone. Use text and an icon for complete, active,
failed, and unchanged states. Preserve visible focus, semantic labels, readable
error messages, reduced-motion preferences, and keyboard-safe navigation.
