# Contributing

DSPDS uses a documentation-first, milestone-based workflow.

## Branches

Create branches from `main` using one of these prefixes:

- `agent/` for agent-authored work
- `feature/` for product features
- `fix/` for defects
- `docs/` for documentation-only changes
- `chore/` for repository maintenance

## Pull requests

Open draft pull requests early. Keep one milestone or coherent vertical slice per PR. Use the repository PR template and link the governing issue.

## Commit messages

Use terse, intentional messages such as:

- `add raw input diagnostic gate`
- `persist versioned equipment profiles`
- `implement single-target DSPDS state machine`
- `document formal assessment exclusions`

## Required checks

Once the package scaffold exists, every PR must pass:

- formatting
- lint
- typecheck
- unit tests
- build
- relevant Playwright tests

Timing, pointer-lock, and raw-input behavior also require the manual protocols in `docs/engineering/TEST_STRATEGY.md`.

## Dependency policy

Prefer browser and platform APIs. Add a dependency only when it removes substantial risk or complexity. Record architectural dependencies in `docs/product/DECISIONS.md`.

## Product integrity

Do not turn example values from the design handoff into hard-coded scientific thresholds. Do not imply anatomical certainty from mouse telemetry. Do not mix formal assessment and practice data.
