# Data model

All persisted entities include `schemaVersion`, stable IDs, creation timestamps, and the equipment profile used to generate them.

## Entity families

### UserProfile

- id
- display name
- created/updated timestamps
- active equipment profile ID
- preferences

### EquipmentProfile

- id and user profile ID
- mouse label
- entered DPI
- target cm/360
- measured cm/360 and verification runs
- yaw degrees per raw input unit
- raw-input availability/status
- vertical and derived horizontal FOV
- view mode
- calibration/recalibration status

### RawInputSample

- sequence
- high-resolution timestamp
- dx and dy
- buttons
- pointer-lock state
- input mode
- validity flags

### TrialRecord

- scenario ID and scenario version
- mode: formal or practice
- seed and intended geometry
- completion mode
- raw samples
- displayed-camera trace when relevant
- assistance state when relevant
- validity and exclusion reasons
- metric bundle version

### SessionRecord

- ordered trial IDs
- equipment profile snapshot
- start/end time
- interruption and recovery metadata
- completion status
- aggregate metrics

### FormalAssessment

- immutable completed session reference
- included and excluded trials
- protocol version
- data-sufficiency result
- generated model snapshot ID

### SpatialModelSnapshot

- immutable version
- source formal assessment IDs
- directional and amplitude summaries
- tracking and reversal summaries
- implied sensitivity range and confidence
- stable, possibly changing, low-confidence, and insufficient-data findings
- explanation records linking findings to measurements

### MovementBaseline

- arm-primary, wrist-primary, fingertip-primary, freestyle blocks
- equivalent target seeds in shuffled order
- closed-loop metrics and signature features

### FormBlendSession

- assistance progression
- phase-level measurements
- validity
- coaching output and rule version
- first- or third-person configuration

## Separation rules

- Practice records never appear in `SpatialModelSnapshot.sourceFormalAssessmentIds`.
- A completed formal assessment is never mutated; corrections create a new derived snapshot or explicit exclusion record.
- Equipment profile values are snapshotted into sessions so later profile edits do not rewrite history.
- Raw and displayed movement traces use different fields and types.
- Import preserves original IDs where safe and records conflicts or remapping.

## Migration rules

- Migrations are sequential and tested from every supported prior version.
- Exports include application version, schema version, and entity counts.
- Failed migrations do not destroy the original database.
- Recovery checkpoints are written after each completed trial.
