# Design handoff contract

The final Claude Design package governs visual presentation and interaction details. The product specification governs mechanics and data behavior.

## Locked visual direction

- restrained dark environment and application surfaces
- blurple accent used deliberately
- calm, credible motor-learning tone
- unmistakably 3D training scenes with matte floor, wall panels, depth references, restrained fog, and controlled emissive targets
- minimal active HUD
- progressive disclosure in results
- confidence and validity communicated through more than color
- no generic neon gaming dashboard, sci-fi HUD, medical dashboard, or dense KPI grid

## DSPDS result hierarchy

1. What the internal spatial model is doing.
2. What changed or remained stable.
3. The most actionable discrepancy.
4. Derived sensitivity behavior.
5. Supporting evidence and confidence.
6. Technical inspection.

Do not lead with cm/360.

## Runtime versus documentation

The design package contains prototype controls and annotations. Only elements explicitly classified as runtime product UI should ship. Prototype navigation, scene notes, timing labels, and illustrative explanations must remain outside the product viewport.

## Active scene rules

### Formal DSPDS

Allowed: environment, scenario geometry, readiness cue, block progress, pause, critical input warning, neutral reposition instructions, completion acknowledgement.

Disallowed: reticle, cursor, endpoint, trial score, overreach/underreach, sensitivity estimate, live coaching, graphs.

### Form Blend

Allowed: current phase, assistance state, repetition progress, critical failure, concise post-repetition coaching. Detailed telemetry appears after movement, not during it.

## Third person

- simple capsule or ovoid
- no animation, locomotion, shoulder switching, camera collision, weapon, or avatar delay
- same degrees-per-count mapping as first person
- scoring ray originates at the camera through screen center
- first- and third-person results are stored separately

## Typography and accessibility

Approximate minimums:

- primary body: 15–16 px
- secondary body: 14 px
- metadata: 12–13 px
- active HUD: at least 14 px
- clickable text: generally at least 14 px

Implement focus-visible, reduced motion, text scaling, modal focus trapping, keyboard behavior, and color-independent validity/confidence states.

## Responsive desktop behavior

Primary targets are 1920×1080 and 2560×1440. Training scenes remain fixed and stable. Analysis screens can scroll. Use maximum widths and redistribute space at 1440p rather than scaling every element without limit.

## Source assets

See `docs/handoff/ASSET_MANIFEST.md`. The final design package must be available to Codex alongside this repository.
