# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --json title,body,labels,comments` (add `--jq` to slice the JSON). For a rendered read with threaded comments, `gh issue view <number> --comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply or remove labels**: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** Set this to `yes` only if the repo treats external pull requests as feature requests; `triage` reads this flag.

When enabled, external pull requests use the same labels and states as issues:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>`.
- **List external PRs**: use `gh pr list` and keep authors with `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` association. Leave owner, member, and collaborator pull requests alone.
- **Comment, label, or close**: use the corresponding `gh pr` command.

GitHub shares one number space across issues and pull requests. Resolve a bare `#42` with `gh pr view 42`, then fall back to `gh issue view 42`.

## Materialize operations

- **Publish to the issue tracker**: create a GitHub issue.
- **Fetch the relevant issue**: run `gh issue view <number> --json title,body,labels,comments`.
