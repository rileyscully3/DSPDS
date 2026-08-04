# Recommended repository settings

These settings require repository administration and may need to be configured in the GitHub UI after the bootstrap PR merges.

## Main branch

Recommended ruleset for `main`:

- require a pull request before merging
- require at least one approval when another reviewer is available
- dismiss stale approvals after new commits
- require conversation resolution
- require status checks: `project-checks` and `documentation-contract` once project checks are active
- block force pushes
- block branch deletion
- allow repository administrators to bypass only for recovery

For a single-person private repository, approval requirements can remain optional while PRs and checks stay required.

## Merge strategy

Prefer squash merge for milestone PRs. Keep merge commits disabled unless a future workflow needs them. Enable automatic branch deletion after merge.

## Security and dependency automation

- enable Dependabot security updates after the package scaffold exists
- enable secret scanning where available
- do not commit real environment values
- avoid runtime third-party CDNs

## Issues and milestones

Create one issue per implementation milestone and use issue checklists for vertical slices. Do not use issues as a substitute for acceptance criteria in the repository.

## Releases

Tag evidence-backed release candidates. Store known limitations and manual input-validation results in release notes.
