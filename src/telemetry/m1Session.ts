import {
  INPUT_RECORDER_VERSION,
  type CaptureStatus,
  type CaptureValidity,
  type GapPolicy,
  type InputCadenceSummary,
  type InputMode,
  type InterruptionMarker,
  type RawInputSample,
  type RecordingSnapshot,
  type RenderCadenceSummary,
  type ValidityReason,
} from "../input/contracts";
import type { PointerLockSnapshot } from "../input/pointerLockController";

export const M1_EXPORT_SCHEMA_ID = "dspds.m1-input-session" as const;
export const M1_EXPORT_SCHEMA_VERSION = 1 as const;

export type M1EvidenceSource =
  "physical-browser-capture" | "synthetic-fixture" | "replay";

export interface M1EnvironmentMetadata {
  readonly userAgent: string;
  readonly platform: string;
  readonly language: string;
  readonly hardwareConcurrency: number | null;
  readonly viewportWidthPx: number;
  readonly viewportHeightPx: number;
  readonly devicePixelRatio: number;
}

export interface M1SessionExport {
  readonly schemaId: typeof M1_EXPORT_SCHEMA_ID;
  readonly schemaVersion: typeof M1_EXPORT_SCHEMA_VERSION;
  readonly recorderVersion: typeof INPUT_RECORDER_VERSION;
  readonly captureId: string;
  readonly evidenceSource: M1EvidenceSource;
  readonly syntheticEvidenceNotice: string | null;
  readonly recording: {
    readonly status: CaptureStatus;
    readonly startedAtUnixMs: number;
    readonly endedAtUnixMs: number | null;
    readonly startedAtPerformanceMs: number;
    readonly endedAtPerformanceMs: number | null;
  };
  readonly pointerLock: PointerLockSnapshot;
  readonly inputMode: InputMode;
  readonly buffer: {
    readonly sampleCapacity: number;
    readonly acceptedSampleCount: number;
    readonly markerCapacity: number;
    readonly markerCount: number;
    readonly overflowed: boolean;
  };
  readonly samples: readonly RawInputSample[];
  readonly interruptions: readonly InterruptionMarker[];
  readonly inputCadence: InputCadenceSummary;
  readonly renderCadence: RenderCadenceSummary;
  readonly gapPolicy: GapPolicy;
  readonly validity: {
    readonly state: CaptureValidity;
    readonly reasons: readonly ValidityReason[];
  };
  readonly environment: M1EnvironmentMetadata;
}

export interface CreateM1SessionOptions {
  readonly source?: M1EvidenceSource;
  readonly syntheticEvidenceNotice?: string | null;
}

export function collectEnvironmentMetadata(): M1EnvironmentMetadata {
  return Object.freeze({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    viewportWidthPx: window.innerWidth,
    viewportHeightPx: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
  });
}

export function createM1SessionExport(
  recording: RecordingSnapshot,
  pointerLock: PointerLockSnapshot,
  renderCadence: RenderCadenceSummary,
  gapPolicy: GapPolicy,
  environment: M1EnvironmentMetadata,
  options: CreateM1SessionOptions = {},
): M1SessionExport {
  if (
    !recording.captureId ||
    recording.startedAtUnixMs === null ||
    recording.startedAtPerformanceMs === null ||
    recording.inputMode === null
  ) {
    throw new Error("A recording must be started before it can be exported.");
  }
  const source = options.source ?? "physical-browser-capture";
  const syntheticNotice =
    options.syntheticEvidenceNotice ??
    (source === "physical-browser-capture"
      ? null
      : "Synthetic or replayed browser data proves application logic only; it does not prove physical unadjusted-input quality.");
  return deepFreeze({
    schemaId: M1_EXPORT_SCHEMA_ID,
    schemaVersion: M1_EXPORT_SCHEMA_VERSION,
    recorderVersion: INPUT_RECORDER_VERSION,
    captureId: recording.captureId,
    evidenceSource: source,
    syntheticEvidenceNotice: syntheticNotice,
    recording: {
      status: recording.status,
      startedAtUnixMs: recording.startedAtUnixMs,
      endedAtUnixMs: recording.endedAtUnixMs,
      startedAtPerformanceMs: recording.startedAtPerformanceMs,
      endedAtPerformanceMs: recording.endedAtPerformanceMs,
    },
    pointerLock,
    inputMode: recording.inputMode,
    buffer: {
      sampleCapacity: recording.sampleCapacity,
      acceptedSampleCount: recording.sampleCount,
      markerCapacity: recording.markerCapacity,
      markerCount: recording.markerCount,
      overflowed: recording.overflowed,
    },
    samples: [...recording.samples],
    interruptions: [...recording.interruptions],
    inputCadence: recording.inputCadence,
    renderCadence,
    gapPolicy,
    validity: {
      state: recording.validity,
      reasons: [...recording.validityReasons],
    },
    environment,
  });
}

export function serializeM1Session(session: M1SessionExport): string {
  assertM1SessionExport(session);
  return `${JSON.stringify(session, null, 2)}\n`;
}

export function parseM1Session(json: string): M1SessionExport {
  const value: unknown = JSON.parse(json);
  assertM1SessionExport(value);
  return deepFreeze(value);
}

export function assertM1SessionExport(
  value: unknown,
): asserts value is M1SessionExport {
  if (!isRecord(value)) throw new Error("M1 export must be an object.");
  if (
    value.schemaId !== M1_EXPORT_SCHEMA_ID ||
    value.schemaVersion !== M1_EXPORT_SCHEMA_VERSION
  ) {
    throw new Error("Unsupported M1 export schema.");
  }
  if (
    value.recorderVersion !== INPUT_RECORDER_VERSION ||
    typeof value.captureId !== "string" ||
    !Array.isArray(value.samples) ||
    !Array.isArray(value.interruptions)
  ) {
    throw new Error("Malformed M1 export metadata.");
  }
  if (
    !["physical-browser-capture", "synthetic-fixture", "replay"].includes(
      String(value.evidenceSource),
    ) ||
    !(
      value.syntheticEvidenceNotice === null ||
      typeof value.syntheticEvidenceNotice === "string"
    ) ||
    !["unadjusted", "adjusted", "synthetic"].includes(String(value.inputMode))
  ) {
    throw new Error("Malformed M1 evidence-source metadata.");
  }
  validateRecording(value.recording);
  validatePointerLock(value.pointerLock);
  validateCadence(value.inputCadence, "input");
  validateCadence(value.renderCadence, "render");
  validateValidity(value.validity);
  validateEnvironment(value.environment);
  validateSequenceOrder(value.samples, "sample");
  validateSequenceOrder(value.interruptions, "marker");
  let previousSequence = 0;
  const ordered = [...value.samples, ...value.interruptions].sort(
    (left, right) =>
      readSequence(left, "record") - readSequence(right, "record"),
  );
  for (const item of ordered) {
    const sequence = readSequence(item, "record");
    if (!Number.isInteger(sequence) || sequence <= previousSequence) {
      throw new Error("M1 stream sequences must be strictly increasing.");
    }
    previousSequence = sequence;
  }
  for (const sample of value.samples) validateSample(sample);
  for (const marker of value.interruptions) validateMarker(marker);
  if (
    !isRecord(value.buffer) ||
    !Number.isInteger(value.buffer.sampleCapacity) ||
    !Number.isInteger(value.buffer.markerCapacity) ||
    typeof value.buffer.overflowed !== "boolean" ||
    value.buffer.acceptedSampleCount !== value.samples.length ||
    value.buffer.markerCount !== value.interruptions.length
  ) {
    throw new Error("M1 buffer counts do not match exported records.");
  }
  if (
    !isRecord(value.gapPolicy) ||
    value.gapPolicy.classification !== "operational-browser-input-heuristic" ||
    !isFiniteNumber(value.gapPolicy.suspiciousGapMs)
  ) {
    throw new Error("M1 gap policy is missing or invalid.");
  }
}

function validateRecording(value: unknown): void {
  if (
    !isRecord(value) ||
    !["idle", "recording", "complete", "interrupted"].includes(
      String(value.status),
    ) ||
    !isFiniteNumber(value.startedAtUnixMs) ||
    !isFiniteNumber(value.startedAtPerformanceMs) ||
    !isNullableFiniteNumber(value.endedAtUnixMs) ||
    !isNullableFiniteNumber(value.endedAtPerformanceMs)
  ) {
    throw new Error("Malformed M1 recording metadata.");
  }
}

function validatePointerLock(value: unknown): void {
  if (
    !isRecord(value) ||
    typeof value.state !== "string" ||
    typeof value.supported !== "boolean" ||
    !(
      value.activeMode === null ||
      ["unadjusted", "adjusted", "synthetic"].includes(String(value.activeMode))
    ) ||
    typeof value.adjustedFallbackRequiresAction !== "boolean" ||
    typeof value.detail !== "string"
  ) {
    throw new Error("Malformed M1 pointer-lock metadata.");
  }
}

function validateCadence(value: unknown, label: string): void {
  if (!isRecord(value)) throw new Error(`Malformed M1 ${label} cadence.`);
  const numericKeys =
    label === "input"
      ? [
          "acceptedSampleCount",
          "intervalCount",
          "eventsPerSecond",
          "suspiciousGapCount",
          "rejectedSampleCount",
        ]
      : ["frameCount", "intervalCount", "framesPerSecond", "longTaskCount"];
  const nullableKeys =
    label === "input"
      ? ["medianIntervalMs", "maximumGapMs"]
      : ["medianIntervalMs", "maximumFrameGapMs", "maximumLongTaskMs"];
  if (
    !numericKeys.every((key) => isFiniteNumber(value[key])) ||
    !nullableKeys.every((key) => isNullableFiniteNumber(value[key])) ||
    (label === "input" && typeof value.overflowed !== "boolean") ||
    (label === "render" && typeof value.longTaskApiSupported !== "boolean")
  ) {
    throw new Error(`Malformed M1 ${label} cadence fields.`);
  }
}

function validateValidity(value: unknown): void {
  if (
    !isRecord(value) ||
    !["valid", "qualified", "interrupted", "invalid"].includes(
      String(value.state),
    ) ||
    !Array.isArray(value.reasons) ||
    !value.reasons.every((reason) => typeof reason === "string")
  ) {
    throw new Error("Malformed M1 validity metadata.");
  }
}

function validateEnvironment(value: unknown): void {
  if (
    !isRecord(value) ||
    typeof value.userAgent !== "string" ||
    typeof value.platform !== "string" ||
    typeof value.language !== "string" ||
    !isNullableFiniteNumber(value.hardwareConcurrency) ||
    !isFiniteNumber(value.viewportWidthPx) ||
    !isFiniteNumber(value.viewportHeightPx) ||
    !isFiniteNumber(value.devicePixelRatio)
  ) {
    throw new Error("Malformed M1 environment metadata.");
  }
}

function validateSequenceOrder(
  values: readonly unknown[],
  label: string,
): void {
  let previous = 0;
  for (const value of values) {
    const sequence = readSequence(value, label);
    if (!Number.isInteger(sequence) || sequence <= previous) {
      throw new Error(`M1 ${label} records are not in stream order.`);
    }
    previous = sequence;
  }
}

function validateSample(value: unknown): void {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isFiniteNumber(value.eventTimestampMs) ||
    !isFiniteNumber(value.captureTimestampMs) ||
    !isFiniteNumber(value.dx) ||
    !isFiniteNumber(value.dy) ||
    !Number.isInteger(value.buttons) ||
    !["unadjusted", "adjusted", "synthetic"].includes(String(value.inputMode))
  ) {
    throw new Error("Malformed M1 raw input sample.");
  }
  readSequence(value, "sample");
}

function validateMarker(value: unknown): void {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isFiniteNumber(value.timestampMs) ||
    typeof value.reason !== "string" ||
    typeof value.resultingValidity !== "string"
  ) {
    throw new Error("Malformed M1 interruption marker.");
  }
  readSequence(value, "marker");
}

function readSequence(value: unknown, label: string): number {
  if (!isRecord(value) || !isFiniteNumber(value.sequence)) {
    throw new Error(`Malformed M1 ${label} sequence.`);
  }
  return value.sequence;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}
