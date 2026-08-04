# Test strategy

## Test pyramid

### Unit tests

Use Vitest for:

- angular and sensitivity conversions
- FOV conversions
- settle detection
- segmentation and metric calculations
- confidence and data-sufficiency rules
- scenario state transitions
- coaching rule selection
- schema migrations
- import conflict handling

### Integration tests

Test typed module boundaries with deterministic sample traces:

- input buffer to trial recorder
- formal trial to immutable assessment
- assessment to model snapshot
- recovery checkpoint to resumed session
- raw and displayed movement separation during assistance

### Browser tests

Use Playwright for:

- onboarding and profile setup
- formal versus practice navigation
- DSPDS instruction and block completion
- pause, completion-mode change, interruption, and recovery
- cm/360 flow
- Form Blend assistance progression
- import/export and destructive actions
- keyboard and focus behavior

Synthetic pointer movement can verify application logic but does not prove physical raw-input quality.

## Manual M1 protocol

Run on supported Windows Chrome and Edge environments. Record:

- browser version
- OS version
- mouse and polling rate
- DPI
- display refresh rate
- pointer-lock status
- unadjusted-input result
- input sample cadence and gaps
- render cadence and long tasks
- exported raw session

Verify:

- individual samples are retained
- one 360 requires the same raw input across supported FOV values
- render-frame variation does not change recorded input totals
- focus loss invalidates or interrupts the trial visibly
- fallback mode is labeled

## Visual validation

For every active scene:

- compare at 1920×1080 and 2560×1440
- verify no formal DSPDS reticle or endpoint
- verify runtime UI excludes design annotations
- capture hard-stop and soft-damping recordings
- verify reduced-motion behavior
- verify text minimums and contrast

## Data validation

- every entity includes a schema version
- equipment profile is snapshotted into sessions
- practice IDs cannot enter official model sources
- formal assessments remain immutable
- export/import round-trips without loss
- interrupted writes preserve the last completed trial

## Release evidence

The release candidate should include:

- CI results
- browser manual protocol results
- representative exported sessions
- screenshots/recordings of all scenario states
- migration test matrix
- accessibility checklist
- known limitations
