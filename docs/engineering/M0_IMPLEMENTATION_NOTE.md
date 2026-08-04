# M0 application scaffold implementation note

## Scope and stack

M0 uses npm, Vite, strict TypeScript, React, Three.js, plain CSS, ESLint, Prettier, Vitest, Testing Library, and Playwright on the Node version in `.nvmrc`. These are the required scaffold and verification tools. Testing Library is the only supporting dependency: it exercises React mount/unmount behavior through accessible user interactions more reliably than low-level DOM calls.

## Source boundaries

- `src/app` owns the non-real-time shell, hash navigation, and mounting/disposal of the engine host.
- `src/engine` owns the Three.js scene, animation frame lifecycle, resize observation, and GPU resource disposal.
- `src/design` contains the small machine-readable token subset needed by M0 and its CSS custom properties. Values originate in `tokens/form-blend-tokens.json` in the authoritative design ZIP.
- `src/test-support` and `e2e` contain deterministic unit and browser evidence.

The architecture's future `input`, `scenarios`, `analysis`, `coaching`, `telemetry`, `storage`, and `workers` paths are intentionally not scaffolded with empty systems.

## Validation

Run `npm ci`, followed by `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and `npm run test:e2e`. Browser tests exercise unmount/remount, duplicate-canvas prevention, both target viewports, reduced motion, and absence of runtime CDN requests. Unit tests inspect cancellation, observer disconnection, canvas removal, and resource disposal.

## Limitations and deferred work

The scene is an abstract architecture diagnostic, not production geometry. M1 input capture and all later pointer lock, profiles, persistence, scenarios, assessment/practice mechanics, analysis, coaching, telemetry, calibration, Form Blend, targets, reticles, and third-person presentation remain deliberately deferred.
