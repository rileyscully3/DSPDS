export const RAW_SAMPLE_SCHEMA_VERSION = 1 as const;
export const INPUT_RECORDER_VERSION = "m1-recorder-v1" as const;
export const DEFAULT_DIAGNOSTIC_DURATION_MS = 20_000;
export const DEFAULT_SAMPLE_CAPACITY = 262_144;
export const DEFAULT_MARKER_CAPACITY = 128;

export type InputMode = "unadjusted" | "adjusted" | "synthetic";

export const SampleFlag = {
  None: 0,
  SuspiciousGapBefore: 1 << 0,
} as const;

export type CaptureValidity =
  | "valid"
  | "qualified"
  | "interrupted"
  | "invalid";

export type CaptureStatus =
  | "idle"
  | "recording"
  | "complete"
  | "interrupted";

export type InterruptionReason =
  | "pointer-lock-loss"
  | "window-blur"
  | "visibility-hidden"
  | "user-cancelled"
  | "buffer-overflow"
  | "pointer-lock-error"
  | "suspicious-sample-gap"
  | "capture-teardown";

export type ValidityReason = InterruptionReason | "adjusted-fallback";

export interface RawInputSample {
  readonly schemaVersion: typeof RAW_SAMPLE_SCHEMA_VERSION;
  /** Shared sample/marker stream order, starting at one. */
  readonly sequence: number;
  /** MouseEvent.timeStamp, milliseconds relative to the browser time origin. */
  readonly eventTimestampMs: number;
  /** performance.now() at listener entry, in the same documented time base. */
  readonly captureTimestampMs: number;
  readonly dx: number;
  readonly dy: number;
  /** Browser MouseEvent.buttons bitfield. */
  readonly buttons: number;
  readonly inputMode: InputMode;
  readonly flags: number;
}

export interface InterruptionMarker {
  readonly schemaVersion: 1;
  readonly sequence: number;
  /** performance.now(), milliseconds relative to the browser time origin. */
  readonly timestampMs: number;
  readonly reason: InterruptionReason;
  readonly resultingValidity: CaptureValidity;
  readonly observedGapMs: number | null;
}

export interface GapPolicy {
  readonly id: "m1-operational-gap-v1";
  readonly version: 1;
  readonly suspiciousGapMs: number;
  readonly classification: "operational-browser-input-heuristic";
}

export const M1_GAP_POLICY: GapPolicy = Object.freeze({
  id: "m1-operational-gap-v1",
  version: 1,
  suspiciousGapMs: 50,
  classification: "operational-browser-input-heuristic",
});

export interface InputCadenceSummary {
  readonly acceptedSampleCount: number;
  readonly intervalCount: number;
  readonly eventsPerSecond: number;
  readonly medianIntervalMs: number | null;
  readonly maximumGapMs: number | null;
  readonly suspiciousGapCount: number;
  readonly rejectedSampleCount: number;
  readonly overflowed: boolean;
}

export interface RenderCadenceSummary {
  readonly frameCount: number;
  readonly intervalCount: number;
  readonly framesPerSecond: number;
  readonly medianIntervalMs: number | null;
  readonly maximumFrameGapMs: number | null;
  readonly longTaskCount: number;
  readonly maximumLongTaskMs: number | null;
  readonly longTaskApiSupported: boolean;
}

export interface RecordingSnapshot {
  readonly captureId: string | null;
  readonly status: CaptureStatus;
  readonly validity: CaptureValidity;
  readonly validityReasons: readonly ValidityReason[];
  readonly inputMode: InputMode | null;
  readonly startedAtUnixMs: number | null;
  readonly endedAtUnixMs: number | null;
  readonly startedAtPerformanceMs: number | null;
  readonly endedAtPerformanceMs: number | null;
  readonly sampleCapacity: number;
  readonly sampleCount: number;
  readonly markerCapacity: number;
  readonly markerCount: number;
  readonly overflowed: boolean;
  readonly inputCadence: InputCadenceSummary;
  readonly samples: readonly RawInputSample[];
  readonly interruptions: readonly InterruptionMarker[];
}

export type RecorderDiagnostics = Omit<
  RecordingSnapshot,
  "samples" | "interruptions"
>;

export interface PointerEventLike {
  readonly timeStamp: number;
  readonly movementX: number;
  readonly movementY: number;
  readonly buttons: number;
}
