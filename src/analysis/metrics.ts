import { ANALYSIS_VERSION } from "../config/defaults";
import { impliedCmPer360, median } from "../profiles/quantities";
import type {
  MetricValue,
  RawInputSample,
  SpatialModelSnapshot,
  TrialRecord,
} from "../telemetry/schemas";
const metric = (
  id: string,
  label: string,
  value: number | null,
  unit: string,
  definition: string,
  limitations: string,
): MetricValue => ({
  id,
  label,
  value,
  unit,
  definition,
  algorithmVersion: ANALYSIS_VERSION,
  validConditions:
    "Complete valid trial with ordered non-interrupted raw samples.",
  aggregation:
    "Median within matching scenario, direction, and amplitude conditions.",
  limitations,
});
export function integrate(samples: RawInputSample[]) {
  return samples.reduce(
    (a, s) => ({
      x: a.x + s.dx,
      y: a.y - s.dy,
      distance: a.distance + Math.hypot(s.dx, s.dy),
    }),
    { x: 0, y: 0, distance: 0 },
  );
}
export function displacementMetrics(
  intended: { xDeg: number; yDeg: number },
  samples: RawInputSample[],
): MetricValue[] {
  const raw = integrate(samples),
    theta = Math.hypot(intended.xDeg, intended.yDeg);
  if (theta === 0)
    return [
      metric(
        "movement.counts",
        "Movement",
        raw.distance,
        "raw count",
        "Integrated browser-delivered relative movement.",
        "Browser events are not verified physical sensor reports.",
      ),
    ];
  const ux = intended.xDeg / theta,
    uy = intended.yDeg / theta;
  const parallel = raw.x * ux + raw.y * uy,
    orthogonal = raw.x * uy - raw.y * ux;
  const cpd = parallel / theta;
  const direct = raw.distance ? Math.hypot(raw.x, raw.y) / raw.distance : 0;
  return [
    metric(
      "relativeCountsPerDegree",
      "Relative counts per degree",
      cpd,
      "raw count/deg",
      "Projected response counts divided by intended angular displacement.",
      "Open-loop response; not a prescribed sensitivity.",
    ),
    metric(
      "orthogonalError",
      "Orthogonal discrepancy",
      orthogonal,
      "raw count",
      "Response component perpendicular to the intended direction.",
      "Depends on browser-delivered event stream.",
    ),
    metric(
      "pathEfficiency",
      "Path efficiency",
      direct,
      "ratio",
      "Net path distance divided by total path distance.",
      "Zero movement reports zero; it is not a quality score.",
    ),
    metric(
      "stoppingTail",
      "Stopping tail",
      stoppingTail(samples),
      "raw count",
      "Movement accumulated in the final 150 ms.",
      "Event cadence influences temporal resolution.",
    ),
  ];
}
export function stoppingTail(samples: RawInputSample[]) {
  const end = samples.at(-1)?.timestampMs;
  if (end === undefined) return 0;
  return samples
    .filter((s) => s.timestampMs >= end - 150)
    .reduce((n, s) => n + Math.hypot(s.dx, s.dy), 0);
}
/** Descriptive only: no validated confidence interval or sensitivity recommendation. */
export function buildModel(
  assessmentId: string,
  trials: TrialRecord[],
  countsPerCm: number | null,
): SpatialModelSnapshot {
  const valid = trials.filter(
    (t) =>
      t.sessionId === assessmentId &&
      t.mode === "formal" &&
      t.valid &&
      t.scenarioVersion === "2.0.0" &&
      t.scenario === "single" &&
      t.capture?.policyVersion === "capture-2.0.0" &&
      t.capture.valid &&
      !t.capture.qualifications.length &&
      t.rawSamples.some(
        (s) =>
          s.validity === "valid" &&
          s.pointerLocked &&
          Math.hypot(s.dx, s.dy) > 0,
      ),
  );
  const evidence = valid.flatMap((t) => {
    const value = displacementMetrics(t.intended, t.rawSamples).find(
      (m) => m.id === "relativeCountsPerDegree",
    )?.value;
    return value !== null &&
      value !== undefined &&
      Number.isFinite(value) &&
      value > 0
      ? [{ trial: t, value }]
      : [];
  });
  const cpds = evidence.map((e) => e.value),
    central = median(cpds);
  const by = (lo: number, hi: number) =>
    median(
      evidence
        .filter((e) => {
          const a = Math.hypot(e.trial.intended.xDeg, e.trial.intended.yDeg);
          return a >= lo - 0.001 && a <= hi + 0.001;
        })
        .map((e) => e.value),
    );
  const bands = {
    central,
    micro: by(2, 4),
    small: by(8, 12),
    medium: by(18, 27),
    large: by(40, 50),
  };
  const completeBands = Object.values(bands).every((v) => v !== null);
  const physical =
    central !== null &&
    countsPerCm !== null &&
    Number.isFinite(countsPerCm) &&
    countsPerCm > 0 &&
    cpds.length >= 2;
  const groups = new Map<string, typeof evidence>();
  for (const e of evidence) {
    const t = e.trial,
      key = `${t.intended.xDeg.toFixed(4)},${t.intended.yDeg.toFixed(4)}:${t.completionReason}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    sourceFormalAssessmentIds: [assessmentId],
    latestAssessmentId: assessmentId,
    analysisVersion: ANALYSIS_VERSION,
    sourceTrialIds: evidence.map((e) => e.trial.id),
    confidence: "Low",
    sufficiency:
      central === null || !completeBands ? "insufficient" : "provisional",
    countsPerDegree: bands,
    impliedCmPer360: physical
      ? {
          low: impliedCmPer360(Math.min(...cpds), countsPerCm!)!,
          central: impliedCmPer360(central!, countsPerCm!)!,
          high: impliedCmPer360(Math.max(...cpds), countsPerCm!)!,
        }
      : null,
    rangeMeaning:
      "Observed minimum�maximum across eligible single-target responses; not uncertainty of the median or a recommended sensitivity range.",
    conditions: [...groups.entries()].map(([condition, rows]) => {
      const values = rows.map((r) => r.value),
        center = median(values)!;
      return {
        condition,
        trialIds: rows.map((r) => r.trial.id),
        count: rows.length,
        median: center,
        mad: median(values.map((v) => Math.abs(v - center)))!,
        unit: "raw count/deg",
      };
    }),
    findings: [
      {
        text:
          central === null
            ? "Insufficient eligible displacement evidence. Legacy, interrupted, practice, fallback, and gap-qualified input do not support this estimate."
            : "Descriptive single-target scale only. Confidence remains low: cross-scenario agreement and test-retest reliability are not established. Missing conditions remain insufficient.",
        metricIds: central === null ? [] : ["relativeCountsPerDegree"],
        sampleCount: cpds.length,
        confidence: "Low",
      },
    ],
  };
}
