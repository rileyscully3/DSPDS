# Input integrity and scientific guardrails

## Input invariants

1. Each accepted pointer event becomes an ordered, timestamped raw sample.
2. Rendering may consume a sum of samples, but analysis retains the individual sequence.
3. FOV does not alter degrees rotated per raw input unit.
4. Hard-stop and soft-damping output are stored separately from raw movement.
5. Assisted trials are evaluated from raw input and scenario timing, not corrected camera motion.
6. Pointer-lock and unadjusted-input support are reported honestly.
7. A fallback input mode is visibly labeled and cannot be presented as equivalent evidence without qualification.
8. Input interruption, focus loss, or suspicious sample gaps affect trial validity.

## Formal DSPDS isolation

Formal DSPDS scenes must not include:

- reticle
- mouse cursor
- persistent center dot functioning as a reticle
- user-controlled endpoint
- live overreach or underreach
- trial accuracy
- sensitivity estimate
- live coaching
- visible camera response to physical mouse input

Environmental geometry may communicate space and automatic camera motion. It must not expose where the user's movement landed.

## Permitted inference

The application may describe:

- physical input-count displacement relative to an intended angular vector
- consistency by direction and amplitude
- overreach, underreach, reversal, smoothness, stopping tail, and tracking phase lag
- implied sensitivity ranges and confidence
- similarity between movement signatures

The application must not claim:

- a perfect or biologically correct sensitivity
- certain use of arm, wrist, or fingers from mouse telemetry alone
- medical diagnosis or impairment
- improvement when evidence shows only variation
- causal transfer to games without appropriate validation

## Metric discipline

Every metric requires:

- stable identifier
- definition
- unit
- algorithm version
- valid input conditions
- aggregation rule
- known limitations

Avoid ambiguous labels such as `gain`. Prefer explicit names:

- `relativeCountsPerDegree`
- `degreesPerRawCount`
- `impliedCmPer360`

Composite scores are optional and must expose their components and version. Concrete measurements are preferred.

## Confidence

Confidence is not quality. It describes evidence strength and should consider sample count, invalid trials, within-condition spread, and cross-session stability. Low confidence must not be hidden behind decisive prose.

## Calibration

DPI is needed to express physical cm/360 estimates but is not required to run relative DSPDS analysis. Physical cm/360 calibration remains optional. Changing mouse, DPI, major sensitivity, grip/posture, or long inactivity should recommend recalibration without blocking training.
