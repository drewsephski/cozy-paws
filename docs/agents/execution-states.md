# Execution states

Execution states describe what is happening while an issue is being built. They are separate from triage labels, which determine whether an issue is ready to start.

| State | When | GitHub representation |
| --- | --- | --- |
| **In Progress** | An executor has started implementing | The issue is assigned to the executor |
| **In Review** | A pull request is open for the issue | An open PR links the issue with `Fixes #N` |
| **Done** | The pull request merged | GitHub closes the linked issue on merge |

## Transitions

- **Automated by GitHub:** `Done` when a merged pull request closes the linked issue.
- **Manual:** assign the issue when implementation begins and link it from the pull request when review begins.

Read the current issue and pull request before changing state. Leave an already-satisfied or automated transition alone.
