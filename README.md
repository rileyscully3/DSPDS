# FORM BLEND + DSPDS

A local-first desktop browser application for inspecting open-loop spatial movement and training a deliberate large-sweep → stop → smaller-flick → micro-adjust → click sequence.

> Experimental first-release branch. Automated browser evidence does not establish physical mouse-input fidelity or training efficacy. See [`docs/experiments/SOL_FULL_COMPLETION_20260917.md`](docs/experiments/SOL_FULL_COMPLETION_20260917.md) for the acceptance matrix and explicit gaps.

## Run

Use Node 22 (see `.nvmrc`):

```bash
npm ci
npm run dev
```

Open the printed local URL in current Windows Chrome or Edge. No account or backend is used. After the static bundle loads, runtime behavior has no network dependency.

## First use

1. Create the local profile and equipment context. DPI is optional; physical cm/360 verification is also optional.
2. Read Input Readiness. A browser's delivered event cadence is not a verified hardware polling rate.
3. Run a formal DSPDS assessment to create an official immutable model snapshot. Formal capture deliberately hides the reticle, endpoint, trial score, and coaching.
4. Use DSPDS Practice separately; it is archived but never enters the official model.
5. Complete arm-primary, wrist-primary, fingertip-primary, and freestyle visible-aim baseline blocks. These are instructed labels, not anatomical proof.
6. Open Form Blend. Assistance modifies displayed camera output only; evaluation retains unmodified browser-delivered samples.
7. Inspect History, raw-path replay, Profile Insights, and Data export/import.

## Controls and data

- Click **Begin capture** to request pointer lock with unadjusted movement and an honest adjusted-input fallback.
- Move the mouse, then click **Complete movement**. Pointer-lock/focus loss makes the incomplete capture technically invalid.
- Data is stored in the `form-blend-dspds` IndexedDB database in the active browser profile.
- Full JSON export includes retained raw samples. Summary export removes raw/display trace arrays.
- Import validates format/schema and adds missing IDs without overwriting conflicts.

## Verify

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Playwright screenshots are written to `screenshots/`. The required physical Windows Chrome/Edge input protocol remains a separate human validation described in `docs/engineering/TEST_STRATEGY.md`.
