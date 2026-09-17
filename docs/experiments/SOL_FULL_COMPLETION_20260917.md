# Sol full-completion experiment — 2026-09-17

## Isolation and source record

- Branch: `experiment/sol-full-completion-20260917`
- Starting commit and locally available `main` state: `243e0092070188b283b6fc17283577566fd8f3d4`
- The configured repository initially had no remote. `origin` was added as `https://github.com/rileyscully3/DSPDS.git`, but a fetch failed with HTTP 403. Current issue/PR metadata and the M1 branch therefore could not be retrieved. The M1 implementation was not silently assumed or incorporated; input work here is independent.
- Authoritative asset SHA-256 values matched `docs/handoff/ASSET_MANIFEST.md`. The PDF embedded in the design ZIP was byte-identical to the durable PDF. Assets were extracted only under `/tmp` and the original binaries were not modified.
- The product specification (26 pages / 1,343 extracted lines), Pass 3 implementation handoff, design-system guidance, tokens, prototype inventory, scene guidance, and repository contracts were inspected.

## Narrow governance exceptions

This branch is the user's expressly authorized aggregate M0–M7 experiment. It may cross milestone boundaries, place milestone work in one draft PR, and continue downstream implementation while the physical Windows input gate is pending. These sequencing exceptions do **not** mark the gate passed, weaken formal/practice isolation, or establish scientific or release validity.

## Progress record

The experiment adds a connected local-first application and typed foundations for browser-event capture, profiles, quantities, IndexedDB, recovery contracts, validated import/export, seeded protocols, scenario trial state, deterministic metrics, formal-only model generation, physical-baseline target equivalence, Form Blend assistance, raw/display separation, post-run replay, and first-/third-person presentation.

Run:

```bash
npm ci
npm run dev
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## Acceptance matrix

| Area                       | Status                                                                   | Automated or inspectable evidence                                                                                                                                                                                                                       | Remaining validation / limitation                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 ordered event capture   | Working, software-verified                                               | Explicit idle/requesting/recording/stopped lifecycle; pre-Begin rejection; actual-lock checks; click routing; no-event settling; append-only bounded buffer; denial/fallback/focus/lock/overflow/remount tests                                          | Physical Windows Chrome and Edge protocol remains pending. Browser cadence is not hardware polling rate. A delivery gap is qualified as unknown-cause rather than asserted to be dropped hardware reports. Capture stops at 131,072 events and preserves earlier evidence. |
| M2 quantities/profile      | Implemented, automated                                                   | Explicit degrees/count, counts/360, derived horizontal FOV, optional three-run tester, edge tests                                                                                                                                                       | Tester needs human mouse-marking validation. Multiple equipment-profile management UI is not implemented.                                                                                                                                                                  |
| M2 storage/recovery        | Working for DSPDS checkpoints; incomplete elsewhere                      | Trial/session/recovery checkpoint writes share one guarded transaction; resume derives the next protocol index from committed trial IDs; imports receive structural/reference/provenance validation, preview, conflict rejection, and one atomic commit | Baseline/Form Blend records remain unimplemented. Persistent-storage request, retention/pinning, migration rollback, deletion, and a populated UI round-trip browser test remain missing.                                                                                  |
| M3–M4 five DSPDS scenarios | Single-target acquisition working; remaining scenarios presentation-only | Camera-relative angular rays now agree with recorded target geometry; equipment FOV is passed to projection without changing degrees/count; formal/practice/equipment sessions are isolated; complete-protocol gate prevents early official completion  | Tracking animation/analysis, chained reorientation, dynamic variants, growing trace, recenter and pause remain unimplemented. The complete protocol cannot yet be described as a working assessment.                                                                       |
| Official model integrity   | Repaired descriptive subset                                              | Analysis v2 admits only current-version, unqualified, locked, nonzero formal single-target evidence from the named assessment; missing amplitude bands stay insufficient; findings list source trial IDs and within-condition median/MAD                | Confidence remains Low and findings remain descriptive until full required conditions, scenario agreement, and test-retest evidence exist. Recency aggregation and tracking/reversal models remain unimplemented. Legacy experimental results are not reinterpreted.       |
| M5 physical baseline       | Partially implemented                                                    | Four blocks, equivalent seeded targets, visible aim, restrained claims, feature functions                                                                                                                                                               | Production pointer capture, required rep counts, shuffled per-block execution, stored immutable baseline/signature summaries, and block result measures remain incomplete.                                                                                                 |
| M6 Form Blend              | Partially implemented                                                    | Typed phase state, hard/reduced/soft display-only effects, raw carry-through test, premature-click invalidity, staged UI and coaching                                                                                                                   | Live scene is not wired to the phase state machine, gate intersection, complete 20-rep persistence, weakest-phase computation, demonstration playback, and session review.                                                                                                 |
| M7 application             | Partially implemented                                                    | Setup/home/readiness/results/history/replay/insights/data/settings; responsive 1080p/1440p CSS; reduced motion; local runtime assets; third-person capsule                                                                                              | Focus-trapped pause/import dialogs, complete keyboard FSM controls, history virtualization, coherent recoverable deletion, and full end-to-end assessment automation remain incomplete.                                                                                    |
| Visual evidence            | Software-verified subset                                                 | Chromium installed successfully; Playwright navigation and screenshots pass at 1920×1080 and 2560×1440 after the ambiguous Form Blend selector was scoped to primary navigation                                                                         | Human comparison against every Pass 3 screen, focus audit, active-state recording, and physical Windows Chrome/Edge validation remain pending.                                                                                                                             |

## Scientific and release statement

This branch is an experimental implementation checkpoint, **not a release-ready or scientifically validated product**. Synthetic/unit/browser checks establish deterministic software behavior only. They do not prove physical input fidelity, hardware polling completeness, training benefit, anatomical attribution, or transfer to games. The incomplete rows above are implementation gaps, not future enhancements disguised as validation.
