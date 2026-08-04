# DSPDS

DSPDS is a local-first, desktop browser application for studying digital-spatial aim intuition and training blended arm, wrist, and fingertip control.

The repository covers two connected systems:

- **DSPDS — Digital-Spatial Predilection Detection System:** formal and practice scenarios that compare visible spatial events with the user's open-loop physical mouse response.
- **Form Blend:** a 3D aim-form exercise that trains a large primary sweep, controlled transition, smaller secondary flick, and final micro-adjustment.

## Current phase

**M0 application scaffold and architecture diagnostic implemented. Product mechanics begin in later milestones and are not part of this phase.**

Start with [`docs/00-START-HERE.md`](docs/00-START-HERE.md). Coding agents must read [`AGENTS.md`](AGENTS.md) before changing the repository.

## Authority order

1. Approved product specification.
2. Final Claude Design handoff.
3. Pass 3 correction memo.
4. Repository architecture and engineering documents.
5. The active issue or task packet.

When sources conflict, the higher item controls. Do not silently reconcile conflicts.

## Planned stack

- Vite and TypeScript
- React for application UI only
- Three.js for the 3D scene and render loop
- IndexedDB for local profiles, sessions, raw telemetry, recovery, import, and export
- Web Workers for analysis that could interrupt rendering
- Vitest and Playwright for automated tests

The simulation and input path must remain independent of React rendering.

## First release priorities

1. Transferable improvement in actual games.
2. Reduced jitter and corrective dependence.
3. Better arm, wrist, and fingertip blending.
4. Understanding the internal spatial model.
5. Useful analysis and visualization.
6. Identifying directional weaknesses.
7. Better stopping control.
8. Finding an intuitive sensitivity range.

## Non-negotiable product rules

- Formal DSPDS assessments alone update the official spatial model.
- DSPDS practice is archived separately and never silently changes the official model.
- Formal DSPDS scenes provide no reticle, cursor, visible user endpoint, or trial-level corrective feedback.
- Raw input is captured independently from camera rendering and assistance.
- Hard-stop and soft-damping visuals never improve the raw score.
- Sensitivity is a derived supporting output, not the identity of DSPDS.
- Conclusions must be traceable to measurements and confidence.
- No account, backend, multiplayer, mobile, controller, or cloud dependency in the first release.

## Repository workflow

Work is organized as small milestone issues and draft pull requests. Every PR must state the governing acceptance criteria, validation performed, and any unresolved uncertainty.

See:

- [`docs/engineering/IMPLEMENTATION_PLAN.md`](docs/engineering/IMPLEMENTATION_PLAN.md)
- [`docs/agents/WORK_LOOP.md`](docs/agents/WORK_LOOP.md)
- [`docs/engineering/TEST_STRATEGY.md`](docs/engineering/TEST_STRATEGY.md)
