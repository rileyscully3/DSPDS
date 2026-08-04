# Definition of done

A task is done only when all applicable items are true.

## Behavior

- Acceptance criteria are met.
- Error, interruption, and empty states are handled.
- The behavior matches the controlling specification and design state.
- No unrequested scope was added.

## Evidence

- Deterministic logic has automated tests.
- Timing or physical-input behavior has a recorded manual check.
- Visual behavior has screenshots or a short recording.
- Consequential results can be traced to measurements.

## Data

- Persisted changes include schema/version handling.
- Recovery and export/import behavior are considered.
- Formal and practice data remain separated.
- Raw and displayed movement remain separated.

## Quality

- Formatting, lint, typecheck, tests, and build pass.
- No avoidable hot-path allocations or React/render-loop coupling were introduced.
- Accessibility and reduced-motion behavior are preserved.
- Documentation reflects changed contracts or decisions.

## Review

- The diff was reviewed for accidental thresholds, illustrative data, and unsupported claims.
- The PR states what was deliberately left out.
- Follow-up work is recorded rather than hidden in comments.
