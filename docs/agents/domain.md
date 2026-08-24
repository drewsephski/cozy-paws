# Domain Docs

How engineering skills consume this repo's domain documentation.

## Before exploring

- Read root `CONTEXT.md`.
- If root `CONTEXT-MAP.md` exists, follow it to each context relevant to the work.
- Read accepted ADRs in `docs/adr/` that affect the area being changed. In a multi-context repo, also check `src/<context>/docs/adr/`.

If a file does not exist, proceed silently. The domain-modeling discipline in `design`, `grill`, and `architecture` creates documentation only when a real term or decision is settled.

## ADR status

ADR `status` frontmatter is part of the contract:

- **`accepted`** ADRs are in-force architecture.
- ADRs without status frontmatter are legacy ADRs; treat them as `accepted`.
- **`proposed`** ADRs are planning context and apply only to their current plan or issue.
- **`deprecated`** and **`superseded by ADR-NNNN`** ADRs are historical.

Create planning ADRs as `proposed`. Promote them to `accepted` only after the implementing work lands.

## Layout

This is a single-context repo:

```text
/
├── CONTEXT.md
├── docs/adr/
└── app/, components/, lib/
```

## Vocabulary and conflicts

Use the terms defined in `CONTEXT.md`. If a needed concept is absent, reconsider invented language or record a genuine domain-modeling gap.

Surface conflicts with an accepted ADR explicitly instead of silently overriding them.
