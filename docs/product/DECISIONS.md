# Locked decisions

This file records decisions that should not be reopened casually. Amend it through a focused PR when new evidence requires a change.

## Product and data

- The project is local-first and offline-capable after loading.
- The initial release supports Windows desktop Chrome or Edge, mouse and keyboard, and 16:9 desktop layouts.
- Formal DSPDS assessments alone update the official spatial model.
- Practice data is fully archived but remains analytically separate.
- Official model snapshots and completed formal assessments are immutable.
- Sensitivity changes require explicit user approval.
- Physical cm/360 verification is optional.
- DSPDS precedes the four-part physical movement baseline.
- Third person is included in the full first release for Form Blend, with a simple visual capsule and camera-origin scoring ray.

## Architecture

- Vite and TypeScript provide the application scaffold.
- React owns routing, menus, settings, results, and non-real-time UI.
- Three.js owns the scene, camera, target geometry, and render loop.
- Real-time simulation state does not live in React component state.
- Pointer samples are recorded independently from frames.
- Raw input and displayed/assisted camera movement are separate data streams.
- IndexedDB is the source of truth for local profiles and sessions.
- Analysis rules are deterministic and inspectable before any machine-learning approach is considered.
- Web Workers are used when analysis could create frame interruption.

## Design and measurement

- Formal DSPDS has no reticle, cursor, user endpoint, or live corrective feedback.
- Formal line tracing begins at screen center.
- The scene remains restrained but unmistakably 3D.
- The analytic scoring ray in third person originates at the camera and passes through screen center.
- Use explicit terms such as `relativeCountsPerDegree`, `degreesPerRawCount`, and `impliedCmPer360`; avoid ambiguous `gain` language.
- Example data and scores in design artifacts are illustrative.
- The interface must not claim which anatomical structure produced a movement.

## Repository

- Milestone-sized draft PRs are preferred over one large implementation PR.
- Every persisted object carries a schema version.
- Architecture decisions and behavioral changes require documentation updates.
- CI does not replace manual browser input and timing validation.
