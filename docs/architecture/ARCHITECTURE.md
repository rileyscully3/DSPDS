# Architecture

## Guiding principle

Preserve the evidence path from physical input to stored sample to analysis to explanation. Rendering and assistance may change what the user sees, but they must never rewrite the underlying input evidence.

## Planned module map

```text
src/
  app/                 React shell, routes, menus, settings, results
  design/              Tokens and reusable UI components
  engine/              Render loop, camera, scene lifecycle, timing
  input/               Pointer lock, sample capture, diagnostics, buffers
  scenarios/
    dspds/              Five formal/practice scenario state machines
    form-blend/         Assisted and unassisted Form Blend state machine
    baseline/           Four-part visible movement baseline
  analysis/             Segmentation, metrics, confidence, comparisons
  coaching/             Explainable feedback rules
  storage/              IndexedDB, migrations, recovery, import/export
  telemetry/            Schemas, serialization, replay, diagnostics
  workers/              Off-main-thread analysis entry points
  test-support/         Deterministic fixtures and synthetic input harnesses
```

## Runtime boundaries

### Input path

Browser pointer events are timestamped and appended to a preallocated sample buffer. Input collection must not wait for React renders or Three.js frames. Samples retain sequence, timestamp, deltas, buttons, input mode, and validity flags.

### Engine path

The engine consumes accumulated movement for the displayed camera while preserving the original event sequence. Scenario state machines use typed commands and events rather than direct DOM or React calls.

### Analysis path

Analysis consumes immutable trial data. Initial analysis is deterministic and rule-based. Metric definitions include units and version identifiers. Confidence and data sufficiency are separate from the measured value.

### UI path

React renders application state snapshots and sends user commands. It does not own per-frame target movement, camera rotation, or raw sample capture.

### Storage path

IndexedDB stores versioned entities through repositories or services. UI and scenarios do not perform ad hoc IndexedDB calls. Migrations are explicit, forward-tested, and included in export metadata.

## Core state machines

### Formal DSPDS trial

```text
PREPARE -> READY -> RECORDING -> SETTLING -> COMPLETE
                       |             |
                       +-> INTERRUPTED
```

Completion mode can be automatic, click-to-complete, or automatic with click failsafe. Trial feedback is withheld until the block is complete.

### Form Blend repetition

```text
READY
  -> PRIMARY_SWEEP
  -> TRANSITION_ASSIST
  -> WAIT_FOR_STABILITY
  -> SECONDARY_FLICK
  -> MICRO_ADJUST
  -> CLICK
  -> REP_FEEDBACK
  -> RESET
```

Major phase skips can invalidate the repetition. Minor violations permit completion and produce phase-level feedback.

## Dependency direction

- `input` has no dependency on scenarios, analysis, coaching, storage, or React.
- `engine` depends on shared contracts, not application UI.
- scenarios depend on input and engine interfaces.
- analysis depends on telemetry schemas and pure utilities.
- coaching depends on analysis outputs, never raw browser events.
- storage persists domain entities through versioned contracts.
- app composes the modules but does not bypass their interfaces.

## Performance rules

- Avoid allocations in hot input and render paths.
- Preallocate or reuse vectors and sample structures where practical.
- Keep analysis off the render path.
- Measure input cadence, frame cadence, dropped samples, and long tasks separately.
- Prefer stable WebGL 2 for the first build; retain a renderer boundary for future WebGPU evaluation.
