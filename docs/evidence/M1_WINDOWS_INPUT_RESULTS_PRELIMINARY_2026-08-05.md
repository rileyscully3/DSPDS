# M1 Windows input results — preliminary

> Status: **Pending — partial Run A evidence only**
>
> These observations do not complete
> `docs/engineering/M1_WINDOWS_INPUT_PROTOCOL.md`. No raw physical telemetry is
> committed with this summary. Browser identity follows export metadata, not
> the initially supplied filename labels.

## Test identity

- Tester: Riley Scully
- Date and time:
  - Edge capture start: 2026-08-05 05:03:22.064 UTC
  - Chrome capture start: 2026-08-05 05:04:38.058 UTC
- Application commit: Not recorded in the export. Expected branch head from
  the supplied setup instructions:
  `1a99fb91ec36dbd3b52a37c8a8ae88707dddc3aa`; unverified on the tester's
  machine.
- Local application URL: Not reported
- Windows edition: Windows 10 Home
- Windows version: Exact version not reported. The tester suggested 22H2, but
  this is unverified.
- Windows OS build: Not reported
- Mouse manufacturer/model: Razer Viper V4
- Connection: Wireless through the supplied dongle
- Configured polling rate: 1000 Hz
- Configured DPI: 1600
- Display manufacturer/model: LG 27GL83A
- Display refresh rate: 144 Hz

## Chrome

- Browser version: User-agent metadata reports Chrome 150.0.0.0; exact browser
  build not independently reported.
- Capture ID: `d39746aa-2c14-4a6e-9a34-a7d7912d667e`
- Pointer-lock request result: Supported; final export state is unlocked after
  completion.
- Unadjusted-input request result: Exported input mode is `unadjusted`.
- Adjusted fallback required: No
- Input mode recorded in export: `unadjusted`

### Run A — 20-second diagnostic

- Recording status: Complete
- Recorded duration: 20.091 seconds
- Accepted sample count: 2,891
- Input events/second: 143.97807946195044
- Median input interval: 6.900000095367432 ms
- Maximum input gap: 7.900000095367432 ms
- Suspicious-gap count: 0
- Suspicious-gap warning/review notes: No policy warning was emitted.
- Buffer capacity/use: 2,891 / 262,144
- Rejected sample count: 0
- Overflow status: No
- Render frames/second: 143.97658140252705
- Median render interval: 6.900000000001455 ms
- Maximum frame gap: 7.100000000005821 ms
- Long Task API available: Yes
- Long-task count: 0
- Maximum long-task duration: Not applicable
- Buttons observed: None; every exported sample has `buttons: 0`.
- Final validity: Valid
- Validity reasons: None
- Interruption markers: None
- Exported raw-session filename:
  `dspds-m1-input-d39746aa-2c14-4a6e-9a34-a7d7912d667e.json`
- Exported raw-session SHA-256:
  `93f276bff89bf72a8f28401fcc6072f8ed57b1add27fc76e7d4ebdce16d3e8f5`
- Export schema/version: `dspds.m1-input-session` version 1
- Export replay sample count: 2,891
- Export replay dx/dy totals: dx `-22297`; dy `10410`
- Export replay path: Displayed successfully
- Export replay stable at 0.5x / 1x / 2x: Yes; sample count and dx/dy totals
  remained unchanged and no validation error appeared.
- Synthetic fixture replay result: Not reported in this physical test pass

### Run B — Escape and lock loss

- Status: Pending; not executed

### Run C/D — focus and visibility loss

- Status: Pending; not executed

### Chrome conclusion

- Conclusion: Pending / insufficient evidence
- Evidence supporting conclusion: Run A completed without reported overflow,
  rejection, suspicious gap, interruption, or replay mismatch.
- Unresolved risks: No held-button evidence, Escape/lock-loss evidence,
  focus/visibility-loss evidence, exact browser build, verified application
  commit, exact Windows version, or OS build.

## Edge

- Browser version: User-agent metadata reports Edge 151.0.0.0
  (`Edg/151.0.0.0`); exact browser build not independently reported.
- Capture ID: `d3dae327-443b-46a5-bd4e-828d0c5636c9`
- Pointer-lock request result: Supported; final export state is unlocked after
  completion.
- Unadjusted-input request result: Exported input mode is `unadjusted`.
- Adjusted fallback required: No
- Input mode recorded in export: `unadjusted`

### Run A — 20-second diagnostic

- Recording status: Complete
- Recorded duration: 20.0178 seconds
- Accepted sample count: 2,878
- Input events/second: 143.97669949486894
- Median input interval: 6.900000095367432 ms
- Maximum input gap: 7.700000047683716 ms
- Suspicious-gap count: 0
- Suspicious-gap warning/review notes: No policy warning was emitted.
- Buffer capacity/use: 2,878 / 262,144
- Rejected sample count: 0
- Overflow status: No
- Render frames/second: 143.9761804847832
- Median render interval: 6.900000000008731 ms
- Maximum frame gap: 7.100000000005821 ms
- Long Task API available: Yes
- Long-task count: 0
- Maximum long-task duration: Not applicable
- Buttons observed: None; every exported sample has `buttons: 0`.
- Final validity: Valid
- Validity reasons: None
- Interruption markers: None
- Exported raw-session filename:
  `dspds-m1-input-d3dae327-443b-46a5-bd4e-828d0c5636c9.json`
- Exported raw-session SHA-256:
  `f70ff7c34dbdc0252e03a9c3a89618b328fb040951b768b6c44b6839ec160276`
- Export schema/version: `dspds.m1-input-session` version 1
- Export replay sample count: 2,878
- Export replay dx/dy totals: dx `-8485`; dy `6359`
- Export replay path: Displayed successfully
- Export replay stable at 0.5x / 1x / 2x: Yes; sample count and dx/dy totals
  remained unchanged and no validation error appeared.
- Synthetic fixture replay result: Not reported in this physical test pass

### Run B — Escape and lock loss

- Status: Pending; not executed

### Run C/D — focus and visibility loss

- Status: Pending; not executed

### Edge conclusion

- Conclusion: Pending / insufficient evidence
- Evidence supporting conclusion: Run A completed without reported overflow,
  rejection, suspicious gap, interruption, or replay mismatch.
- Unresolved risks: No held-button evidence, Escape/lock-loss evidence,
  focus/visibility-loss evidence, exact browser build, verified application
  commit, exact Windows version, or OS build.

## Cross-browser comparison

- Pointer-lock differences: None visible in the two exports; both record
  `unadjusted`.
- Unadjusted-request differences: None visible in the two exports.
- Adjusted-fallback differences: Neither capture records adjusted fallback.
- Input cadence differences: Chrome 143.9781 events/s; Edge 143.9767 events/s.
- Gap-warning differences: Neither capture contains a suspicious gap.
- Render/long-task differences: Both report approximately 143.98 frames/s,
  maximum frame gap approximately 7.1 ms, and zero long tasks.
- Escape/lock-loss differences: Pending
- Focus/visibility differences: Pending
- Export/replay differences: Both exports validate and replay at every offered
  presentation speed without changing sample counts or dx/dy totals.
- Other discrepancies: The supplied browser labels were reversed. Export
  metadata identifies capture `d39746aa…` as Chrome and capture `d3dae327…` as
  Edge.

Input cadence and render cadence were collected independently, but their
observed rates are nearly identical to the configured 144 Hz display rate in
both browsers. This may reflect browser dispatch/coalescing behavior. It does
not establish 1000 Hz physical event delivery, prove the configured hardware
polling rate, or prove physical raw-input quality.

## Overall M1 physical-input conclusion

- Conclusion: **Pending — preliminary Run A evidence only**
- Evidence supporting conclusion: Both captures are schema-valid, complete,
  unadjusted-mode exports with no overflow, rejected samples, suspicious gaps,
  interruptions, long tasks, or replay mismatch.
- Required follow-up:
  1. Record the exact Windows version and OS build.
  2. Record exact Chrome and Edge builds and verify the application commit.
  3. Run held-button movement so button bitfields are observed.
  4. Run the separate Escape/pointer-lock-loss protocol.
  5. Run the separate focus/visibility-loss protocol.
  6. Record synthetic fixture replay.
  7. Review the near-exact input/render cadence match without treating the
     50 ms operational policy or 144 Hz observation as a scientific threshold.
- Reviewer: Pending
- Review date: Pending

## Deferred

- FOV-invariance procedure: Deferred to M2 because M1 does not implement FOV
  or sensitivity setup.
