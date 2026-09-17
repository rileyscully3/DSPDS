import { describe, expect, it } from "vitest";
import { MouseSampleBuffer } from "./input/MouseSampleBuffer";
import { TrialMachine } from "./scenarios/TrialMachine";
import { generateProtocol } from "./scenarios/protocol";
import { buildModel, displacementMetrics, integrate } from "./analysis/metrics";
import {
  countsPer360,
  degreesPerRawCount,
  horizontalFovDeg,
} from "./profiles/quantities";
import { FormBlendMachine } from "./form-blend/FormBlendMachine";
import type {
  EquipmentSnapshot,
  RawInputSample,
  TrialRecord,
} from "./telemetry/schemas";
const sample = (
  sequence: number,
  dx: number,
  dy = 0,
  timestampMs = sequence * 10,
): RawInputSample => ({
  sequence,
  timestampMs,
  dx,
  dy,
  buttons: 0,
  pointerLocked: true,
  inputMode: "unadjusted",
  validity: "valid",
});
describe("first release evidence contracts", () => {
  it("retains event totals independent of render cadence", () => {
    const b = new MouseSampleBuffer(20);
    [1, 2, 3, 4].forEach((dx, i) => b.append(i, dx, 0, 0, true, "unadjusted"));
    expect(integrate(b.snapshot()).x).toBe(10);
    expect(b.snapshot().map((s) => s.sequence)).toEqual([0, 1, 2, 3]);
  });
  it("bounds capture and marks overflow instead of silently truncating", () => {
    const b = new MouseSampleBuffer(2);
    b.append(0, 1, 0, 0, true, "unadjusted");
    b.append(1, 2, 0, 0, true, "unadjusted");
    b.append(2, 3, 0, 0, true, "unadjusted");
    expect(b.overflowCount).toBe(1);
    expect(b.snapshot()).toMatchObject([
      { dx: 2 },
      { dx: 3, validity: "overflow" },
    ]);
  });
  it("interrupts rather than completing a partial formal trial", () => {
    const m = new TrialMachine("autoWithClickFailsafe");
    m.dispatch({ type: "ready", atMs: 0 });
    m.dispatch({ type: "start", atMs: 1 });
    m.dispatch({ type: "sample", atMs: 10, sample: sample(0, 3) });
    m.dispatch({ type: "interrupt", atMs: 11 });
    expect(m.state).toBe("INTERRUPTED");
  });
  it("settles automatically and supports click failsafe", () => {
    const m = new TrialMachine("autoWithClickFailsafe", 150);
    m.dispatch({ type: "ready", atMs: 0 });
    m.dispatch({ type: "start", atMs: 1 });
    m.dispatch({ type: "sample", atMs: 10, sample: sample(0, 3) });
    m.dispatch({ type: "sample", atMs: 20, sample: sample(1, 0) });
    m.dispatch({ type: "sample", atMs: 171, sample: sample(2, 0) });
    expect(m.state).toBe("COMPLETE");
  });
  it("generates every scenario deterministically", () => {
    const a = generateProtocol("same"),
      b = generateProtocol("same");
    expect(a).toEqual(b);
    expect(new Set(a.map((x) => x.scenario))).toEqual(
      new Set([
        "single",
        "chain",
        "predictableTrack",
        "dynamicStatic",
        "dynamicCamera",
        "line",
      ]),
    );
  });
  it("keeps count-to-angle mapping invariant across FOV", () => {
    const mapping = degreesPerRawCount(1600, 40);
    expect(countsPer360(1600, 40) * mapping).toBeCloseTo(360);
    expect(horizontalFovDeg(60)).not.toBe(horizontalFovDeg(110));
    expect(degreesPerRawCount(1600, 40)).toBe(mapping);
  });
  it("uses projected counts and explicit metric definitions", () => {
    const metrics = displacementMetrics({ xDeg: 10, yDeg: 0 }, [
      sample(0, 50),
      sample(1, 50),
    ]);
    expect(metrics.find((m) => m.id === "relativeCountsPerDegree")?.value).toBe(
      10,
    );
    expect(
      metrics.every((m) => m.unit && m.algorithmVersion && m.limitations),
    ).toBe(true);
  });
  it("never allows practice records into an official model", () => {
    const equipment = {} as EquipmentSnapshot;
    const base = {
      schemaVersion: 1 as const,
      id: "t",
      sessionId: "s",
      scenario: "single" as const,
      scenarioVersion: "1",
      seed: "s",
      intended: { xDeg: 10, yDeg: 0 },
      completionMode: "click" as const,
      completionReason: "click" as const,
      rawSamples: [sample(0, 100)],
      valid: true,
      exclusionReasons: [],
      metrics: displacementMetrics({ xDeg: 10, yDeg: 0 }, [sample(0, 100)]),
      createdAt: "2026-01-01",
    };
    const trials: TrialRecord[] = [
      { ...base, mode: "practice" },
      { ...base, id: "formal", mode: "formal" },
    ];
    const model = buildModel("assessment", trials, null);
    expect(model.findings[0]?.sampleCount).toBe(1);
    expect(model.sourceFormalAssessmentIds).toEqual(["assessment"]);
    expect(equipment).toBeDefined();
  });
  it("freezes only display output under hard stop", () => {
    const m = new FormBlendMachine("hard", 0.01);
    m.start();
    m.sample(sample(0, 20), { inGate: true });
    m.sample(sample(1, 10));
    expect(m.raw.at(-1)?.dx).toBe(10);
    expect(m.displayed.at(-1)?.yawDeg).toBeCloseTo(0.2);
    expect(m.rawCarryThrough).toBe(10);
  });
  it("rejects premature click and returns one coaching cue", () => {
    const m = new FormBlendMachine("none", 0.01);
    m.start();
    m.click();
    expect(m.summary().valid).toBe(false);
    expect(m.summary().cue.split(".").filter(Boolean)).toHaveLength(1);
  });
});
