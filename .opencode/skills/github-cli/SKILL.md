---
name: github-cli
description: Manage GitHub pull requests, issues, releases, workflows, and API requests using the gh CLI whenever GitHub actions are requested.
---
# GitHub CLI (gh) Workflow

## When to use
- Whenever the user asks to inspect, create, or manage GitHub issues, pull requests, releases, repo settings, or GitHub Actions runs.

## Instructions
1. Verify authentication with `gh auth status`.
2. For Pull Requests: use `gh pr list`, `gh pr view`, `gh pr create --fill`, `gh pr checks`, or `gh pr merge`.
3. For Issues: use `gh issue list`, `gh issue view`, or `gh issue create`.
4. For GitHub Actions / CI: use `gh run list`, `gh run view --log-failed`, or `gh workflow run`.
5. For advanced GitHub operations not covered by standard subcommands, use `gh api <endpoint>` to query the GitHub REST or GraphQL API directly.
Use code with caution.
