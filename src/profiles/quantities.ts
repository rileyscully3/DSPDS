export function horizontalFovDeg(
  verticalFovDeg: number,
  aspect = 16 / 9,
): number {
  return (
    (2 * Math.atan(Math.tan((verticalFovDeg * Math.PI) / 360) * aspect) * 180) /
    Math.PI
  );
}
export function countsPer360(dpi: number, cmPer360: number): number {
  return dpi * (cmPer360 / 2.54);
}
export function degreesPerRawCount(dpi: number, cmPer360: number): number {
  return 360 / countsPer360(dpi, cmPer360);
}
export function impliedCmPer360(
  relativeCountsPerDegree: number,
  countsPerCm: number,
): number | null {
  return countsPerCm > 0 ? (relativeCountsPerDegree * 360) / countsPerCm : null;
}
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}
export function calibrationSummary(
  runs: Array<{ counts: number; distanceCm: number }>,
) {
  const distances = runs
    .filter((r) => r.distanceCm > 0)
    .map((r) => r.distanceCm);
  const cpcm = runs
    .filter((r) => r.distanceCm > 0)
    .map((r) => Math.abs(r.counts) / r.distanceCm);
  const measuredCmPer360 = median(distances),
    countsPerCm = median(cpcm);
  const spread =
    measuredCmPer360 === null
      ? null
      : median(distances.map((v) => Math.abs(v - measuredCmPer360)));
  return {
    measuredCmPer360,
    countsPerCm,
    estimatedEffectiveDpi: countsPerCm === null ? null : countsPerCm * 2.54,
    variationCm: spread,
    provisionalHighVariation:
      spread !== null &&
      measuredCmPer360 !== null &&
      spread / measuredCmPer360 > 0.1,
  };
}
