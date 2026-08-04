# Pass 3 correction memo

These corrections override inconsistent illustrative content in the final design package.

## 1. Equipment example consistency

Do not mix the profile example `1600 DPI / 90° vertical FOV` with raw-inspection examples showing `800 DPI / 106° horizontal / 73° vertical`.

For a consistent 16:9 example, use:

- 1600 DPI
- 90° vertical FOV
- approximately 121° horizontal FOV

The application must always calculate the horizontal value rather than hard-code the approximation.

## 2. Illustrative valid-trial arithmetic

Use internally consistent examples. One acceptable example is:

- single displacement: 24 valid
- chained flick: 18 valid
- predictable tracking: 6 valid
- dynamic tracking: 2 valid, 2 excluded
- line tracing: 12 valid
- total: 62 valid, 2 excluded

These counts are illustrative, not required protocol constants.

## 3. Formal line tracing origin

Formal line tracing begins at screen center. Practice may later support varied origins. A temporary origin pulse or initial line segment is scenario geometry, not a persistent reticle, and must not display the user's endpoint.

## 4. Explicit sensitivity terminology

Do not use `gain` for inverse quantities. Use:

- `relativeCountsPerDegree`
- `degreesPerRawCount`
- `impliedCmPer360`

If rightward responses use fewer physical counts for the same intended angle, report fewer counts per degree and a lower implied cm/360.

## 5. Third-person release scope

The simple third-person Form Blend toggle belongs in the full first release after first-person stability. The scoring ray originates from the camera through screen center. The capsule is visual only.

## 6. Runtime dependencies

Bundle icons through project dependencies and use system or locally bundled fonts. Do not depend on prototype CDN links or online font services.

## 7. Deletion wording

Choose one coherent behavior:

- scheduled deletion with a visible 24-hour recovery window, or
- immediate permanent deletion with no rollback.

Do not label an action as immediate permanent erase while promising rollback.
