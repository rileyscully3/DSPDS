# M1 Windows input results

> Blank evidence template. Do not mark a result successful without executing
> `docs/engineering/M1_WINDOWS_INPUT_PROTOCOL.md` on the recorded physical
> Windows Chrome and Edge environment.

## Test identity

- Tester:
- Date and time:
- Application commit:
- Local application URL:
- Windows edition:
- Windows version:
- Windows OS build:
- Mouse manufacturer/model:
- Configured polling rate:
- Configured DPI:
- Display manufacturer/model:
- Display refresh rate:

## Chrome

- Browser version:
- Pointer-lock request result:
- Unadjusted-input request result:
- Final pointer-lock state:
- Adjusted fallback required: Yes / No
- Input mode recorded in export:

### Run A — 20-second diagnostic

- Accepted sample count:
- Input events/second:
- Median input interval:
- Maximum input gap:
- Suspicious-gap count:
- Suspicious-gap warning/review notes:
- Buffer capacity/use:
- Rejected sample count:
- Overflow status:
- Render frames/second:
- Median render interval:
- Maximum frame gap:
- Long Task API available:
- Long-task count:
- Maximum long-task duration:
- Buttons observed:
- Final validity:
- Validity reasons:
- Exported raw-session filename:
- Exported raw-session SHA-256:
- Export reviewed for schema/version/mode:
- Export replay sample and interruption counts:
- Export replay dx/dy totals:
- Export replay path stable at 0.5x / 1x / 2x:
- Raw timestamps/records unchanged by replay speed:
- Synthetic fixture replay result:

### Run B — Escape and lock loss

- Escape exited pointer lock:
- Pointer-lock loss visible:
- Partial recording marked interrupted:
- Partial recording exportable:
- Explicit restart required:
- Restart used a new capture identifier:
- Restart did not merge samples/markers:
- Notes/discrepancies:

### Run C/D — focus and visibility loss

- Focus-loss action:
- Focus-loss marker visible:
- Visibility-hidden marker visible, if independently observable:
- Actual marker order:
- Recording interrupted:
- Silent resume prevented:
- Explicit restart created a new recording:
- Notes/discrepancies:

### Chrome conclusion

- Conclusion: Pass / Qualified fallback / Failure
- Evidence supporting conclusion:
- Unresolved risks:

## Edge

- Browser version:
- Pointer-lock request result:
- Unadjusted-input request result:
- Final pointer-lock state:
- Adjusted fallback required: Yes / No
- Input mode recorded in export:

### Run A — 20-second diagnostic

- Accepted sample count:
- Input events/second:
- Median input interval:
- Maximum input gap:
- Suspicious-gap count:
- Suspicious-gap warning/review notes:
- Buffer capacity/use:
- Rejected sample count:
- Overflow status:
- Render frames/second:
- Median render interval:
- Maximum frame gap:
- Long Task API available:
- Long-task count:
- Maximum long-task duration:
- Buttons observed:
- Final validity:
- Validity reasons:
- Exported raw-session filename:
- Exported raw-session SHA-256:
- Export reviewed for schema/version/mode:
- Export replay sample and interruption counts:
- Export replay dx/dy totals:
- Export replay path stable at 0.5x / 1x / 2x:
- Raw timestamps/records unchanged by replay speed:
- Synthetic fixture replay result:

### Run B — Escape and lock loss

- Escape exited pointer lock:
- Pointer-lock loss visible:
- Partial recording marked interrupted:
- Partial recording exportable:
- Explicit restart required:
- Restart used a new capture identifier:
- Restart did not merge samples/markers:
- Notes/discrepancies:

### Run C/D — focus and visibility loss

- Focus-loss action:
- Focus-loss marker visible:
- Visibility-hidden marker visible, if independently observable:
- Actual marker order:
- Recording interrupted:
- Silent resume prevented:
- Explicit restart created a new recording:
- Notes/discrepancies:

### Edge conclusion

- Conclusion: Pass / Qualified fallback / Failure
- Evidence supporting conclusion:
- Unresolved risks:

## Cross-browser comparison

- Pointer-lock differences:
- Unadjusted-request differences:
- Adjusted-fallback differences:
- Input cadence differences:
- Gap-warning differences:
- Render/long-task differences:
- Escape/lock-loss differences:
- Focus/visibility differences:
- Export/replay differences:
- Other discrepancies:

## Overall M1 physical-input conclusion

- Conclusion: Pass / Qualified fallback / Failure
- Evidence supporting conclusion:
- Required follow-up:
- Reviewer:
- Review date:

## Deferred

- FOV-invariance procedure: Deferred to M2 because M1 does not implement FOV
  or sensitivity setup.
