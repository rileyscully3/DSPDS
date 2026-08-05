# M1 Windows Chrome and Edge input protocol

## Purpose and evidence boundary

This protocol is the required physical validation for M1 browser input
integrity. Run it on a Windows desktop with a physical mouse in current Chrome
and Edge. Cursor Cloud and hosted Playwright are not substitutes.

Synthetic events prove application logic only. This protocol evaluates whether
the browser reports a usable pointer-lock mode and whether event-level evidence
is stable enough to accept, qualify, or reject M1 on the tested hardware. It
does not prove sensor quality, anatomy, sensitivity, FOV behavior, or DSPDS
validity.

Use `docs/evidence/M1_WINDOWS_INPUT_RESULTS_TEMPLATE.md` for every result. Do
not overwrite observations from one browser with the other.

## Preparation

1. Check out the exact draft-PR commit under review.
2. Use Node from `.nvmrc`.
3. Run `npm ci`, `npm run build`, and serve the built application locally.
4. Close unnecessary applications that could cause focus changes or heavy
   system load. Do not alter mouse, Windows pointer, browser, display, or power
   settings solely to obtain a passing result.
5. Record:
   - date and application commit
   - Windows edition, version, and OS build
   - exact Chrome and Edge versions
   - mouse manufacturer and model
   - configured polling rate
   - configured DPI
   - display manufacturer and model
   - display refresh rate
6. Open `#/input-diagnostic` in a normal browser window. Use the same local
   application build for both browsers.

Do not publish physical raw-session files as public CI artifacts unless the
owner explicitly approves it. A filename, SHA-256, and reviewed summary are
enough for the result template.

## Run A — ordinary 20-second diagnostic

Perform this run once in Chrome and once in Edge.

1. Confirm the page reports an idle recording and no active pointer lock.
2. Select **Start 20-second diagnostic** with a deliberate click. Record:
   - pointer-lock request result
   - unadjusted-input request result
   - final controller state
3. If the page reports that unadjusted movement is unavailable or the request
   failed, do not treat an adjusted lock as automatic. Record the first result,
   read the qualification, then explicitly select **Continue with adjusted
   fallback**. Record that fallback was required.
4. During the 20 seconds, perform all of the following:
   - continuous moderate mouse movement
   - several rapid left/right and up/down reversals
   - primary, secondary, and auxiliary button presses where the mouse supports
     them
5. Let the timer stop the run. Do not press Escape during Run A.
6. Record:
   - accepted sample count
   - input events per second
   - median input interval
   - maximum input gap
   - suspicious-gap count and warning state
   - buffer use, rejected count, and overflow state
   - render frames per second
   - median render interval
   - maximum frame gap
   - Long Task API availability, long-task count, and maximum duration
   - buttons observed
   - final validity text and all reasons
7. Export the raw session. Record the filename.
8. In PowerShell, calculate and record its SHA-256:

   ```powershell
   Get-FileHash -Algorithm SHA256 .\dspds-m1-input-<capture-id>.json
   ```

9. Load that exported JSON through the diagnostic replay-file control. Verify:
   - the file is identified as replayed/non-physical evidence
   - sample and interruption counts match the export
   - raw dx/dy totals are repeatable
   - the same 2D path and totals appear at 0.5x, 1x, and 2x
   - speed changes do not modify raw timestamps or records
10. Load the committed synthetic fixture and record whether its documented
    deterministic zero-net zigzag replay appears.

## Run B — Escape and pointer-lock-loss behavior

Run separately so it cannot contaminate Run A.

1. Start a new diagnostic and move continuously for several seconds.
2. Press Escape once.
3. Verify the browser exits pointer lock.
4. Verify the page visibly marks pointer-lock loss and the recording as
   interrupted.
5. Verify the partial recording can be exported but is not labeled valid.
6. Start again only through the explicit start action.
7. Verify the new capture identifier, sample count, sequence, and evidence do
   not merge with the interrupted recording.
8. Record every discrepancy.

## Run C — deliberate focus loss

Run separately from A and B.

1. Start a new diagnostic and move continuously for several seconds.
2. Deliberately switch to another application or browser window.
3. Return to the diagnostic.
4. Verify focus loss or resulting pointer-lock loss is visibly recorded and the
   active recording is interrupted.
5. Verify capture did not silently resume.
6. Start again only through the explicit action and confirm it is a new
   recording.
7. Record every discrepancy.

## Run D — visibility loss where independently observable

If the browser permits a tab switch that produces a distinct hidden-visibility
event before or separately from focus/lock loss:

1. Start a new diagnostic.
2. Switch tabs.
3. Return and record the ordered interruption reason(s).
4. Confirm the recording did not silently resume or become valid.

If browser event ordering combines this with focus or lock loss, record the
actual observed order rather than inventing a separate result.

## Cross-browser review

After both browsers are complete:

1. Compare pointer-lock and unadjusted-request outcomes.
2. Compare whether adjusted fallback was required.
3. Compare sample counts and cadence summaries descriptively. Do not invent a
   scientific tolerance or declare a hardware polling-rate match from browser
   event counts alone.
4. Compare maximum/suspicious gaps, overflow, frame cadence, and long-task
   observations.
5. Compare Escape, pointer-lock-loss, focus-loss, export, and replay behavior.
6. List every Chrome/Edge discrepancy.
7. Assign one evidence conclusion per browser and one overall conclusion:
   - **Pass**: unadjusted request confirmed, required interruption behavior
     works, no overflow, export/replay is exact, and no unexplained defect was
     observed.
   - **Qualified fallback**: adjusted fallback was explicitly required and
     labeled, application behavior passed, and the evidence remains explicitly
     qualified.
   - **Failure**: evidence was silently lost/overwritten/merged, interruption
     handling failed, export/replay differed, overflow occurred, capability was
     misrepresented, or another unresolved integrity defect occurred.

Suspicious gaps require review using the recorded trace and operating context.
The 50 ms M1 policy is an operational browser heuristic, not a scientific
pass/fail threshold.

## Deferred test

Do not perform the broader FOV-invariance procedure from
`TEST_STRATEGY.md` in M1. Sensitivity and FOV setup do not exist yet and belong
to M2. Run that procedure only after those controls exist without scope
expansion.
