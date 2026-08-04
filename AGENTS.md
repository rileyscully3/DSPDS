# Agent instructions

These instructions apply to Codex and every other coding agent working in this repository.

## Read before acting

Read these files in order:

1. `docs/00-START-HERE.md`
2. `docs/product/PRODUCT_SPEC_SUMMARY.md`
3. `docs/product/DECISIONS.md`
4. `docs/architecture/ARCHITECTURE.md`
5. `docs/architecture/INPUT_AND_SCIENCE_GUARDRAILS.md`
6. `docs/design/DESIGN_HANDOFF.md`
7. `docs/engineering/IMPLEMENTATION_PLAN.md`
8. The active issue or task packet

Do not start implementation from the README alone.

## Operating contract

- Work only within the active milestone or issue.
- Preserve the authority order documented in `docs/00-START-HERE.md`.
- Do not invent scientific thresholds, sensitivity claims, anatomical certainty, or training conclusions.
- Do not replace explicit product mechanics with a conventional aim-trainer shortcut.
- Do not add dependencies without documenting why the platform APIs or existing dependencies are insufficient.
- Do not move real-time simulation state into React.
- Do not aggregate mouse input once per frame and discard individual event samples.
- Do not couple raw telemetry to assisted camera output.
- Do not allow practice data to update the official DSPDS model.
- Do not show a reticle or user endpoint during formal DSPDS assessment.
- Do not silently change sensitivity, FOV, profile, assistance level, or scenario difficulty.
- Treat all example metrics and scores in design artifacts as illustrative unless the product specification explicitly defines them.

## Required work loop

For every task:

1. **Orient:** identify the controlling requirement and affected contracts.
2. **Plan:** state the smallest vertical slice and the tests that prove it.
3. **Implement:** keep changes narrow and typed.
4. **Verify:** run the relevant automated and manual checks.
5. **Inspect:** review the diff for scope drift, hidden coupling, and unsupported claims.
6. **Record:** update documentation when behavior, schemas, or decisions changed.

See `docs/agents/WORK_LOOP.md` for the complete loop.

## Architecture boundaries

- `src/input`: browser input capture, pointer lock, raw-sample buffering, diagnostics.
- `src/engine`: render loop, camera controller, scene lifecycle, timing.
- `src/scenarios`: scenario state machines and geometry.
- `src/analysis`: deterministic segmentation, metrics, confidence, comparison.
- `src/coaching`: plain-language feedback rules using analysis outputs.
- `src/storage`: IndexedDB, migrations, recovery, import/export.
- `src/app`: React application shell and non-real-time UI.
- `src/design`: tokens and reusable visual components.

Dependencies should point inward toward contracts. Scenario logic may consume input and engine interfaces; input capture must not depend on scenarios or UI.

## Definition of acceptable evidence

A claim is not complete because the screen looks correct. A change is complete only when:

- The behavior is covered by deterministic tests where feasible.
- Timing-sensitive behavior has a manual validation protocol.
- Raw and displayed movement are inspectably separate.
- Persisted data includes a schema version.
- Failures and unsupported browser states are visible and recoverable.
- The user can understand why a consequential result was produced.

## Pull requests

Use a draft PR for implementation work. Keep PRs milestone-sized and reviewable. The PR body must include:

- Scope and controlling requirement.
- What changed.
- What deliberately did not change.
- Tests and manual checks.
- Screenshots or recordings for visual behavior.
- Data migration notes.
- Risks, assumptions, and follow-up work.

## Stop conditions

Stop and document the conflict rather than guessing when:

- The PDF and final design handoff disagree on mechanics.
- A requested metric lacks a defined input or unit.
- Browser behavior prevents a trustworthy input claim.
- A proposed UI would contaminate formal DSPDS assessment.
- A new feature would cross the current milestone boundary.
