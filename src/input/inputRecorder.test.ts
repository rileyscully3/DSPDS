import { describe, expect, test } from "vitest";
import { RenderCadenceCollector } from "./cadence";
import { InputRecorder } from "./inputRecorder";

function recorder(capacity = 8): InputRecorder {
  return new InputRecorder({
    sampleCapacity: capacity,
    markerCapacity: 8,
    idFactory: () => "capture-test",
  });
}

describe("InputRecorder", () => {
  test("retains every sample in exact event order with timestamps and buttons", () => {
    const input = recorder();
    input.start("unadjusted", 1_000, 10);
    input.record(11.25, 11.5, 4, -2, 0);
    input.record(12.25, 12.5, -7, 3, 1);
    input.record(13.25, 13.5, 2, 8, 3);
    input.stop(1_004, 14);

    const snapshot = input.snapshot();
    expect(snapshot.samples).toEqual([
      expect.objectContaining({
        sequence: 1,
        eventTimestampMs: 11.25,
        captureTimestampMs: 11.5,
        dx: 4,
        dy: -2,
        buttons: 0,
      }),
      expect.objectContaining({
        sequence: 2,
        eventTimestampMs: 12.25,
        captureTimestampMs: 12.5,
        dx: -7,
        dy: 3,
        buttons: 1,
      }),
      expect.objectContaining({
        sequence: 3,
        eventTimestampMs: 13.25,
        captureTimestampMs: 13.5,
        dx: 2,
        dy: 8,
        buttons: 3,
      }),
    ]);
    expect(Object.isFrozen(snapshot.samples)).toBe(true);
    expect(snapshot.inputCadence.acceptedSampleCount).toBe(3);
  });

  test("does not collapse multiple events into frame-level movement", () => {
    const input = recorder();
    input.start("synthetic", 1_000, 0);
    for (let index = 0; index < 6; index += 1) {
      input.record(index, index, 1, -1, 0);
    }
    expect(input.snapshot().samples).toHaveLength(6);
  });

  test("invalidates on overflow without overwriting accepted evidence", () => {
    const input = recorder(2);
    input.start("unadjusted", 1_000, 0);
    expect(input.record(1, 1, 10, 1, 0)).toBe(true);
    expect(input.record(2, 2, 20, 2, 0)).toBe(true);
    expect(input.record(3, 3, 30, 3, 0)).toBe(false);

    const snapshot = input.snapshot();
    expect(snapshot.samples.map(({ dx }) => dx)).toEqual([10, 20]);
    expect(snapshot.status).toBe("interrupted");
    expect(snapshot.validity).toBe("invalid");
    expect(snapshot.overflowed).toBe(true);
    expect(snapshot.inputCadence.rejectedSampleCount).toBe(1);
    expect(snapshot.interruptions.at(-1)).toMatchObject({
      reason: "buffer-overflow",
      resultingValidity: "invalid",
    });
  });

  test("marks inspectable operational gaps without discarding the sample", () => {
    const input = recorder();
    input.start("unadjusted", 1_000, 0);
    input.record(1, 1, 2, 0, 0);
    input.record(70, 70, 3, 0, 0);

    const snapshot = input.snapshot();
    expect(snapshot.samples).toHaveLength(2);
    expect(snapshot.samples[1]?.flags).toBe(1);
    expect(snapshot.validity).toBe("qualified");
    expect(snapshot.inputCadence.maximumGapMs).toBe(69);
    expect(snapshot.inputCadence.suspiciousGapCount).toBe(1);
    expect(snapshot.interruptions[0]).toMatchObject({
      sequence: 2,
      reason: "suspicious-sample-gap",
      observedGapMs: 69,
      resultingValidity: "qualified",
    });
    expect(snapshot.samples[1]?.sequence).toBe(3);
  });

  test.each([
    "pointer-lock-loss",
    "window-blur",
    "visibility-hidden",
    "user-cancelled",
    "pointer-lock-error",
    "capture-teardown",
  ] as const)("records %s as an ordered interruption", (reason) => {
    const input = recorder();
    input.start("unadjusted", 1_000, 0);
    input.record(1, 1, 1, 1, 0);
    input.interrupt(reason, 1_005, 5);
    expect(input.snapshot()).toMatchObject({
      status: "interrupted",
      validity: "interrupted",
      interruptions: [{ sequence: 2, reason }],
    });
  });

  test("adjusted fallback is qualified and restart creates a new recording", () => {
    let id = 0;
    const input = new InputRecorder({
      sampleCapacity: 4,
      markerCapacity: 4,
      idFactory: () => `capture-${++id}`,
    });
    input.start("adjusted", 1_000, 0);
    input.record(1, 1, 4, 0, 0);
    input.interrupt("window-blur", 1_002, 2);
    expect(input.snapshot().validityReasons).toContain("adjusted-fallback");

    input.start("unadjusted", 2_000, 0);
    input.record(1, 1, 9, 0, 0);
    const restarted = input.snapshot();
    expect(restarted.captureId).toBe("capture-2");
    expect(restarted.samples).toHaveLength(1);
    expect(restarted.samples[0]?.sequence).toBe(1);
    expect(restarted.samples[0]?.dx).toBe(9);
    expect(restarted.interruptions).toEqual([]);
  });

  test("identical raw traces remain identical under different frame schedules", () => {
    const trace = [
      [1, 3, -1, 0],
      [2, -5, 4, 1],
      [3, 2, 8, 0],
    ] as const;
    const capture = (frames: readonly number[]) => {
      const input = recorder();
      const render = new RenderCadenceCollector(16);
      input.start("synthetic", 1_000, 0);
      for (const [time, dx, dy, buttons] of trace) {
        input.record(time, time, dx, dy, buttons);
      }
      for (const frame of frames) render.recordFrame(frame);
      return { input: input.snapshot(), render: render.snapshot() };
    };
    const fast = capture([0, 8, 16, 24]);
    const slow = capture([0, 33, 66]);

    expect(fast.input.samples).toEqual(slow.input.samples);
    expect(
      fast.input.samples.reduce((total, sample) => total + sample.dx, 0),
    ).toBe(
      slow.input.samples.reduce((total, sample) => total + sample.dx, 0),
    );
    expect(fast.render.framesPerSecond).not.toBe(
      slow.render.framesPerSecond,
    );
  });
});
