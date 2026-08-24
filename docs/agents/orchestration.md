# Codex orchestration

Materialize uses these live Codex capabilities to delegate phases. Recheck this document when the harness changes.

## Sub-agents

- **Support:** nested lead-reporting sub-agents.
- **Practical maximum depth:** three descendants from the root under the current four-agent concurrency limit.
- **Default working depth:** two descendants, leaving capacity for the conductor and one independent verifier.
- **Parallel capacity:** four active agents total, including the conductor.
- **Filesystem:** all agents share the same filesystem and worktree. Coordinate file ownership before parallel edits.
- **Human input:** executors report blockers to the conductor through messages; the conductor asks the user.

## Available primitives

- Agent orchestration supports spawn, follow-up, message, interrupt, list, and wait operations.
- No separate peer-team, deterministic workflow/pipeline, or shared in-session task-tracker primitive is exposed.
- Codex task/thread and automation operations exist, but they are not substitutes for Materialize's phase marker or durable issue tracker.

## Model and reasoning settings

Sub-agents inherit the parent model and reasoning effort by default. To override either, call `spawn_agent` with `model` and/or `reasoning_effort` and set `fork_turns` to `none` or a positive recent-turn count. Full-history forks inherit parent settings and reject overrides.

## Evidence

Checked 2026-08-24 in Codex Desktop from the exposed collaboration contract and a live nested-spawn probe. Root → child → grandchild spawning completed successfully; the four-slot limit is provided by the active harness.
