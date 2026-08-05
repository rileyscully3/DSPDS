import { describe, expect, test } from "vitest";
import syntheticFixture from "../test-support/fixtures/m1-synthetic-session.json";
import { RenderCadenceCollector } from "../input/cadence";
import { M1_GAP_POLICY } from "../input/contracts";
import { InputRecorder } from "../input/inputRecorder";
import {
  createM1SessionExport,
  parseM1Session,
  serializeM1Session,
  type M1EnvironmentMetadata,
} from "./m1Session";
import { createReplayPresentation, replayM1Session } from "./replay";

const environment: M1EnvironmentMetadata = Object.freeze({
  userAgent: "vitest",
  platform: "test",
  language: "en",
  hardwareConcurrency: 4,
  viewportWidthPx: 1920,
  viewportHeightPx: 1080,
  devicePixelRatio: 1,
});

function createExport() {
  const input = new InputRecorder({
    sampleCapacity: 8,
    markerCapacity: 8,
    idFactory: () => "export-test",
  });
  input.start("synthetic", 1_000, 10);
  input.record(11, 11, 5, -3, 0);
  input.record(12, 12, -2, 8, 1);
  input.stop(1_002, 12);
  const render = new RenderCadenceCollector(8);
  render.recordFrame(0);
  render.recordFrame(16);
  return createM1SessionExport(
    input.snapshot(),
    Object.freeze({
      state: "unlocked",
      supported: true,
      activeMode: null,
      adjustedFallbackRequiresAction: false,
      detail: "Synthetic test.",
    }),
    render.snapshot(),
    M1_GAP_POLICY,
    environment,
    { source: "synthetic-fixture" },
  );
}

describe("M1 export and replay", () => {
  test("validates and round-trips the versioned schema without loss", () => {
    const original = createExport();
    const parsed = parseM1Session(serializeM1Session(original));
    expect(parsed).toEqual(original);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.samples)).toBe(true);
    expect(parsed.schemaId).toBe("dspds.m1-input-session");
    expect(parsed.schemaVersion).toBe(1);
  });

  test("rejects unsupported schemas and inconsistent buffer counts", () => {
    const valid = JSON.parse(serializeM1Session(createExport())) as Record<
      string,
      unknown
    >;
    expect(() =>
      parseM1Session(JSON.stringify({ ...valid, schemaVersion: 99 })),
    ).toThrow("Unsupported M1 export schema");
    const buffer = valid.buffer as Record<string, unknown>;
    expect(() =>
      parseM1Session(
        JSON.stringify({
          ...valid,
          buffer: { ...buffer, acceptedSampleCount: 999 },
        }),
      ),
    ).toThrow("buffer counts");
  });

  test("replays exact values, ordering, totals, and button records", () => {
    const exported = createExport();
    const replay = replayM1Session(exported);
    expect(replay.samples).toEqual(exported.samples);
    expect(replay.orderedStream.map(({ record }) => record.sequence)).toEqual([
      1, 2,
    ]);
    expect(replay.totals).toEqual({
      deltaX: 3,
      deltaY: 5,
      absoluteDeltaX: 7,
      absoluteDeltaY: 11,
      buttonsObserved: 1,
      sampleCount: 2,
      interruptionCount: 0,
    });
  });

  test("presentation speed never modifies raw timestamps or records", () => {
    const exported = createExport();
    const normal = createReplayPresentation(exported, 1);
    const double = createReplayPresentation(exported, 2);
    expect(normal[1]?.presentationOffsetMs).toBe(1);
    expect(double[1]?.presentationOffsetMs).toBe(0.5);
    expect(
      normal.map(({ rawCaptureTimestampMs }) => rawCaptureTimestampMs),
    ).toEqual(double.map(({ rawCaptureTimestampMs }) => rawCaptureTimestampMs));
    expect(
      exported.samples.map(({ captureTimestampMs }) => captureTimestampMs),
    ).toEqual([11, 12]);
  });

  test("committed synthetic fixture replays deterministically", () => {
    const fixture = parseM1Session(JSON.stringify(syntheticFixture));
    const first = replayM1Session(fixture);
    const second = replayM1Session(fixture);
    expect(first).toEqual(second);
    expect(first.totals).toEqual({
      deltaX: 0,
      deltaY: 0,
      absoluteDeltaX: 18,
      absoluteDeltaY: 18,
      buttonsObserved: 1,
      sampleCount: 4,
      interruptionCount: 0,
    });
    expect(fixture.evidenceSource).toBe("synthetic-fixture");
    expect(fixture.syntheticEvidenceNotice).toContain(
      "does not prove physical",
    );
  });
});
