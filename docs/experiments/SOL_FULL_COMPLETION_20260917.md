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

| Area                       | Status                          | Automated or inspectable evidence                                                                                                                             | Remaining validation / limitation                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 ordered event capture   | Implemented, automated          | Bounded ordered buffer, event totals, gap/focus/lock/overflow markers, explicit unadjusted fallback, unit tests                                               | Physical Windows Chrome and Edge protocol unperformed. Browser cadence is not hardware polling rate. Long-session retention currently bounds an active capture at 131,072 events and reports overflow; chunked session spooling is not implemented.           |
| M2 quantities/profile      | Implemented, automated          | Explicit degrees/count, counts/360, derived horizontal FOV, optional three-run tester, edge tests                                                             | Tester needs human mouse-marking validation. Multiple equipment-profile management UI is not implemented.                                                                                                                                                     |
| M2 storage/recovery        | Partially implemented           | Versioned IndexedDB repositories, immutable snapshots, recovery API, malformed import validation, conflict-preserving import, full/summary export             | Recovery API is not yet wired into every active flow; persistent-storage request, raw retention pruning/pinning, transactional migration rollback, and recoverable deletion are missing. UI explicitly withholds deletion.                                    |
| M3–M4 five DSPDS scenarios | Partially implemented           | All six formal scenario identifiers (dynamic variants separate), seeded angular geometry, formal/practice routes, interruption exclusion, inspectable metrics | Tracking gain/lag fit, timed path animation, chained camera snap/reposition, full prescribed trial counts, recenter state, pause flow, and automatic settle integration in the live UI remain incomplete. Current renderer presents static scenario geometry. |
| Official model integrity   | Implemented at foundation level | Formal-only filter test; immutable new snapshot; explicit confidence/sufficiency; named metric evidence                                                       | Recency-weighted three-assessment aggregate and richer direction/tracking/reversal comparisons remain incomplete.                                                                                                                                             |
| M5 physical baseline       | Partially implemented           | Four blocks, equivalent seeded targets, visible aim, restrained claims, feature functions                                                                     | Production pointer capture, required rep counts, shuffled per-block execution, stored immutable baseline/signature summaries, and block result measures remain incomplete.                                                                                    |
| M6 Form Blend              | Partially implemented           | Typed phase state, hard/reduced/soft display-only effects, raw carry-through test, premature-click invalidity, staged UI and coaching                         | Live scene is not wired to the phase state machine, gate intersection, complete 20-rep persistence, weakest-phase computation, demonstration playback, and session review.                                                                                    |
| M7 application             | Partially implemented           | Setup/home/readiness/results/history/replay/insights/data/settings; responsive 1080p/1440p CSS; reduced motion; local runtime assets; third-person capsule    | Focus-trapped pause/import dialogs, complete keyboard FSM controls, history virtualization, coherent recoverable deletion, and full end-to-end assessment automation remain incomplete.                                                                       |
| Visual evidence            | Implemented by Playwright       | Screenshots at 1920×1080 and 2560×1440 for readiness, home, DSPDS practice, and third person                                                                  | Human comparison against every Pass 3 screen and active-state recording is pending.                                                                                                                                                                           |

## Scientific and release statement

This branch is an experimental implementation checkpoint, **not a release-ready or scientifically validated product**. Synthetic/unit/browser checks establish deterministic software behavior only. They do not prove physical input fidelity, hardware polling completeness, training benefit, anatomical attribution, or transfer to games. The incomplete rows above are implementation gaps, not future enhancements disguised as validation.
