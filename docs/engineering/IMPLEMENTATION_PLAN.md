# Implementation plan

Build vertically. Do not implement the complete UI shell before proving input, persistence, and one end-to-end assessment slice.

## M0 — Repository and application scaffold

- Vite, TypeScript, React, Three.js
- strict TypeScript
- design tokens and route shell
- Vitest and Playwright
- formatting, lint, typecheck, build scripts
- no product mechanics beyond a diagnostic route

Exit: clean CI and a documented architecture boundary.

## M1 — Input integrity gate

- pointer lock and unadjusted-input request
- event-level raw sample capture
- preallocated buffer
- frame and input cadence diagnostics
- focus loss, interruption, and sample-gap detection
- raw sample export/replay fixture

Exit: manual Windows Chrome/Edge protocol demonstrates trustworthy capture or clearly labeled fallback.

## M2 — Local profile, storage, and recovery

- user and equipment profiles
- sensitivity/FOV setup
- versioned IndexedDB repositories
- trial checkpoint recovery
- JSON import/export
- optional physical cm/360 tester

Exit: refresh or interruption does not lose completed trial data.

## M3 — First DSPDS vertical slice

- home recommendation
- single-target instruction
- restrained 3D wall scene
- formal trial state machine
- automatic settle with click failsafe
- no reticle or live endpoint feedback
- block result with one spatial-model finding
- immutable formal assessment and model snapshot

Exit: complete vertical slice from home to official model update with inspectable evidence.

## M4 — Full DSPDS protocol

- chained target flicking
- predictable camera-follow tracking
- dynamic static-camera and auto-follow blocks
- formal center-origin line tracing
- practice mode separation
- evolving model comparison, confidence, history

Exit: all five scenarios run under versioned protocols and formal/practice separation is tested.

## M5 — Four-part physical movement baseline

- arm-primary, wrist-primary, fingertip-primary, freestyle
- equivalent target vectors and shuffled seeds
- summary qualities plus inspectable raw measurements
- probabilistic signature comparison

Exit: baseline produces useful signatures without anatomical certainty.

## M6 — Form Blend

- demonstration
- hard stop, reduced stop, soft damping, cue only, unassisted
- raw/displayed trace separation
- phase validity and weakest-phase feedback
- assistance progression
- first-person session review

Exit: one polished repetition and a complete session demonstrate useful form coaching.

## M7 — Product completion

- profile insights and trends
- historical comparisons
- data-management flows
- accessibility and responsive hardening
- simple third-person Form Blend toggle
- complete first-release QA

Exit: all first-release acceptance criteria pass.

## Follow-up milestone

- blinded visible-aim validation of DSPDS sensitivity ranges
- deeper replay visualizations
- game sensitivity presets
- optional additional analysis only after evidence justifies it

## Scope control

Do not include in the first release:

- backend, login, cloud sync
- multiplayer or leaderboards
- mobile or controller support
- skeletal avatar or limb tracking
- camera collision or character locomotion
- machine-learning classification
- WebGPU requirement
- game-specific sensitivity database
