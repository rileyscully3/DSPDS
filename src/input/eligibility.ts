import type { RawInputSample } from "../telemetry/schemas";
export const CAPTURE_POLICY_VERSION = "capture-2.0.0";
export function captureEligibility(
  samples: RawInputSample[],
  reason: string,
  overflow = 0,
) {
  const exclusions: string[] = [],
    qualifications: string[] = [];
  if (reason === "technicalInvalid") exclusions.push("capture-interrupted");
  if (reason === "timeout") exclusions.push("completion-timeout");
  if (overflow) exclusions.push("capacity-exceeded");
  if (
    !samples.some(
      (s) =>
        s.validity === "valid" && s.pointerLocked && Math.hypot(s.dx, s.dy) > 0,
    )
  )
    exclusions.push("no-locked-movement");
  for (const s of samples) {
    if (
      !Number.isFinite(s.dx) ||
      !Number.isFinite(s.dy) ||
      !Number.isFinite(s.timestampMs)
    )
      exclusions.push("nonfinite-input");
    if (s.validity !== "valid" && s.validity !== "gap")
      exclusions.push(s.validity);
    if (
      s.validity === "valid" &&
      (!s.pointerLocked || s.inputMode === "unlocked")
    )
      exclusions.push("unlocked-input");
    if (s.inputMode === "adjusted-fallback")
      qualifications.push("adjusted-fallback-not-equivalent-to-unadjusted");
    if (s.validity === "gap") qualifications.push("delivery-gap-unknown-cause");
  }
  if (
    samples.some(
      (s, i) =>
        i > 0 &&
        (s.sequence <= samples[i - 1]!.sequence ||
          s.timestampMs < samples[i - 1]!.timestampMs),
    )
  )
    exclusions.push("unordered-input");
  return {
    policyVersion: CAPTURE_POLICY_VERSION,
    valid: exclusions.length === 0,
    exclusions: [...new Set(exclusions)],
    qualifications: [...new Set(qualifications)],
  };
}
