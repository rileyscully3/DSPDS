# M1 browser input integrity implementation

## Scope and authority

This note records the cloud-testable M1 implementation for issue #3. The
controlling contracts are `INPUT_AND_SCIENCE_GUARDRAILS.md`,
`ARCHITECTURE.md`, the M1 section of `IMPLEMENTATION_PLAN.md`, and the active
issue. Pass 3 terminology overrides stale prototype and PDF labels.

M1 is a technical browser-input diagnostic. It does not calculate sensitivity,
FOV, `relativeCountsPerDegree`, `degreesPerRawCount`, `impliedCmPer360`, a
metric named `gain`, DSPDS results, or training conclusions.

## Runtime boundary

- `src/input` owns pointer-lock capability, browser listener lifecycle,
  event-level capture, preallocated buffers, interruption markers, and input
  and render cadence collectors.
- `src/telemetry` consumes immutable input snapshots to validate, serialize,
  download, and replay the versioned M1 session.
- `src/app` creates and disposes the diagnostic session, polls immutable
  diagnostic summaries at 100 ms, and sends typed commands. React never
  receives each mouse event as component state.
- `src/engine` can report frame timestamps through a callback. It does not own
  input capture, and input does not depend on Three.js or the engine.

`src/input` has no dependency on React, `src/app`, Three.js, `src/engine`,
scenarios, analysis, coaching, or storage.

## Event-level sample schema

`RawInputSample` has schema version 1:

- `sequence`: monotonically increasing shared sample/marker stream order
- `eventTimestampMs`: `MouseEvent.timeStamp`, milliseconds relative to the
  browser time origin
- `captureTimestampMs`: `performance.now()` at listener entry, milliseconds
  relative to the browser time origin
- `dx`, `dy`: exact browser movement deltas
- `buttons`: browser `MouseEvent.buttons` bitfield
- `inputMode`: `unadjusted`, `adjusted`, or fixture-only `synthetic`
- `flags`: versioned diagnostic bitfield; M1 defines
  `SuspiciousGapBefore`

The browser and capture timestamps have different purposes. The event
timestamp preserves browser evidence. The capture timestamp measures arrival
cadence at the application boundary. Neither is reconstructed from animation
frames.

## Preallocated buffer strategy

The default sample capacity is 262,144. For a 20-second diagnostic this allows
13,107 accepted events per second. The structure-of-arrays layout allocates
approximately 11.25 MiB of typed-array storage before recording. Sequence,
timestamps, deltas, button states, modes, and flags are written as primitives;
the application creates no per-sample object in the accepted-event hot path.

The ordered interruption-marker buffer is also preallocated, with 128 entries.
Immutable objects and arrays are created only when diagnostics or an export
snapshot is requested.

Accepted evidence is never overwritten. When either evidence buffer cannot
accept the next required record, capture stops, the recording becomes invalid,
the rejected count and overflow state become visible, and previously accepted
records remain exportable. A sample-buffer overflow adds an ordered
`buffer-overflow` marker when marker capacity remains available.

## Pointer-lock capability and fallback

The controller observes API outcomes and `pointerlockchange` /
`pointerlockerror`; it does not infer support from the browser name. Its states
are:

- `unlocked`
- `unsupported`
- `requesting-unadjusted`
- `requesting-adjusted`
- `fallback-required`
- `denied`
- `request-failed`
- `active-unadjusted`
- `active-adjusted`
- `error`

The primary button calls the unadjusted request directly from its click
handler. `NotSupportedError` exposes `fallback-required`; other failures and
denials remain distinct. Adjusted pointer lock can be requested only through a
second explicit button after an unavailable or failed unadjusted request.
Adjusted sessions are always `qualified` with an `adjusted-fallback` validity
reason. They are never represented as confirmed unadjusted evidence.

All pointer-lock, mouse, focus, and visibility listeners are removed during
disposal.

## Interruption and validity model

The recorder emits versioned, stream-ordered markers with a performance-clock
timestamp, reason, and resulting validity for:

- pointer-lock loss
- window blur
- hidden document visibility
- explicit cancellation
- evidence-buffer overflow
- pointer-lock error
- suspicious sample gap
- teardown during active capture

Lock, focus, visibility, cancellation, pointer-lock error, and teardown end the
active recording as `interrupted`. Overflow ends it as `invalid`. Capture does
not silently resume. Starting again clears the preallocated buffers, assigns a
new capture identifier, and starts sequence numbering from one; interrupted
evidence is never merged.

## Operational suspicious-gap policy

No governing source defines a sample-gap threshold or scientific
classification. M1 therefore defines `m1-operational-gap-v1`:

- parameter: inter-event capture gap greater than 50 ms
- classification:
  `operational-browser-input-heuristic`
- behavior: retain the arriving sample, set `SuspiciousGapBefore`, append an
  ordered marker with the observed gap, and change otherwise-valid evidence to
  `qualified`

The threshold, policy identifier, parameter, observed maximum, and count are
visible in source, diagnostics, exports, tests, and this note. The rule can
surface a browser stall or an ordinary pause in movement. It is not a
scientific threshold, does not prove dropped physical input, and does not prove
physical raw-input quality.

## Cadence definitions

Input cadence uses accepted-event `captureTimestampMs` values only:

- accepted sample count
- consecutive sample intervals
- events per second: `(sampleCount - 1) / first-to-last duration`
- median consecutive interval
- maximum consecutive gap
- suspicious-gap count
- rejected count and overflow state

Render cadence uses engine animation-frame timestamps only:

- frame count and consecutive intervals
- frames per second: `(frameCount - 1) / first-to-last duration`
- median frame interval
- maximum frame gap
- Long Task API count and maximum duration when that browser API is available

There is no conversion between these collectors. Tests submit the same raw
trace under different frame schedules and require byte-equivalent raw sample
records and equal movement totals.

## Export and replay

The export schema is `dspds.m1-input-session` version 1. It includes the capture
and recorder identifiers, recording clocks/status, pointer-lock result, input
mode, buffer capacities/counts/overflow, ordered samples and markers, both
cadence summaries, the complete gap policy, validity, and locally available
browser/environment metadata.

Exports use a browser `Blob`, temporary object URL, and local download. The
object URL is revoked after activation. M1 adds no IndexedDB or permanent
application storage.

Replay validates the schema and strict stream ordering, retains raw values and
timestamps exactly, integrates deterministic totals and a diagnostic 2D path,
and changes only presentation offsets at 0.5x, 1x, or 2x speed. The committed
fixture is:

`src/test-support/fixtures/m1-synthetic-session.json`

It is intentionally generated, contains no personal telemetry, and is labeled
synthetic non-physical evidence.

## Evidence boundary and remaining acceptance work

Vitest and hosted Chromium prove recorder, buffer, state-machine, export,
replay, lifecycle, accessibility, and interface logic. Synthetic mouse events
cannot prove physical unadjusted movement, mouse polling behavior, or device
quality.

Human execution of `M1_WINDOWS_INPUT_PROTOCOL.md` on current Windows Chrome
and Edge remains mandatory. The blank results template must be completed and
reviewed before M1 can be accepted. Cloud results must not be substituted.

The broader FOV-invariance check in `TEST_STRATEGY.md` is deferred until M2
introduces sensitivity/FOV controls. Profiles, persistence, recovery,
calibration, scenarios, DSPDS, Form Blend, analysis, coaching, and all M2+
behavior remain deliberately untouched.
