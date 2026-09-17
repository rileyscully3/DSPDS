import { SeededRandom } from "../scenarios/protocol";
import type { RawInputSample } from "../telemetry/schemas";
import { integrate, stoppingTail } from "../analysis/metrics";
export type BaselineBlock =
  "arm-primary" | "wrist-primary" | "fingertip-primary" | "freestyle";
export function baselineTargets(seed: string, count = 24) {
  const r = new SeededRandom(seed);
  return Array.from({ length: count }, (_, i) => {
    const a = r.pick([2, 4, 8, 12, 18, 27, 32] as const),
      direction = ((i % 8) * Math.PI) / 4;
    return {
      id: `target-${i}`,
      xDeg: Math.cos(direction) * a,
      yDeg: Math.sin(direction) * a,
      family: `${a}`,
    };
  });
}
export function shuffledBaselineTargets(seed: string, block: BaselineBlock) {
  return new SeededRandom(`${seed}:${block}`).shuffle(baselineTargets(seed));
}
export function movementFeatures(
  samples: RawInputSample[],
  degreesPerCount: number,
) {
  const v = integrate(samples),
    duration = Math.max(
      0,
      (samples.at(-1)?.timestampMs ?? 0) - (samples[0]?.timestampMs ?? 0),
    );
  let reversals = 0;
  for (let i = 2; i < samples.length; i++) {
    if (
      Math.sign(samples[i - 1]!.dx) !== Math.sign(samples[i]!.dx) &&
      samples[i]!.dx !== 0
    )
      reversals++;
  }
  return {
    angularDistanceDeg: v.distance * degreesPerCount,
    durationMs: duration,
    peakSpeedDegPerSec: Math.max(
      0,
      ...samples
        .slice(1)
        .map(
          (s, i) =>
            (Math.hypot(s.dx, s.dy) * degreesPerCount * 1000) /
            Math.max(1, s.timestampMs - samples[i]!.timestampMs),
        ),
    ),
    pathEfficiency: v.distance ? Math.hypot(v.x, v.y) / v.distance : 0,
    correctionCount: reversals,
    directionReversalCount: reversals,
    settleTimeMs: 150,
    stoppingTailCounts: stoppingTail(samples),
  };
}
