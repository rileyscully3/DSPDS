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
      y: a.y + s.dy,
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
export function buildModel(
  assessmentId: string,
  trials: TrialRecord[],
  countsPerCm: number | null,
): SpatialModelSnapshot {
  const valid = trials.filter((t) => t.mode === "formal" && t.valid);
  const cpds = valid
    .flatMap((t) =>
      t.metrics
        .filter((m) => m.id === "relativeCountsPerDegree" && m.value !== null)
        .map((m) => m.value!),
    )
    .filter((v) => v > 0);
  const central = median(cpds);
  const by = (lo: number, hi: number) =>
    median(
      valid
        .filter((t) => {
          const a = Math.hypot(t.intended.xDeg, t.intended.yDeg);
          return a >= lo && a <= hi;
        })
        .flatMap((t) =>
          t.metrics
            .filter(
              (m) => m.id === "relativeCountsPerDegree" && m.value !== null,
            )
            .map((m) => m.value!),
        ),
    );
  const physical =
    central !== null && countsPerCm
      ? impliedCmPer360(central, countsPerCm)
      : null;
  const confidence =
    valid.length >= 40 ? "High" : valid.length >= 12 ? "Moderate" : "Low";
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    sourceFormalAssessmentIds: [assessmentId],
    latestAssessmentId: assessmentId,
    confidence,
    sufficiency:
      valid.length >= 40
        ? "sufficient"
        : valid.length
          ? "provisional"
          : "insufficient",
    countsPerDegree: {
      central,
      micro: by(2, 4),
      small: by(8, 12),
      medium: by(18, 27),
      large: by(40, 50),
    },
    impliedCmPer360:
      physical === null
        ? null
        : { low: physical * 0.9, central: physical, high: physical * 1.1 },
    findings:
      central === null
        ? [
            {
              text: "There is not enough valid displacement evidence to describe the spatial model.",
              metricIds: [],
              sampleCount: 0,
              confidence: "Low",
            },
          ]
        : [
            {
              text: "Your open-loop responses form a provisional spatial scale; inspect direction and amplitude evidence before drawing conclusions.",
              metricIds: ["relativeCountsPerDegree", "orthogonalError"],
              sampleCount: valid.length,
              confidence,
            },
          ],
  };
}
