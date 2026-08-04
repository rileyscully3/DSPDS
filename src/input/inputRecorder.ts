import { InputCadenceCollector } from "./cadence";
import {
  DEFAULT_MARKER_CAPACITY,
  DEFAULT_SAMPLE_CAPACITY,
  M1_GAP_POLICY,
  SampleFlag,
  type CaptureStatus,
  type CaptureValidity,
  type GapPolicy,
  type InputMode,
  type InterruptionReason,
  type RecorderDiagnostics,
  type RecordingSnapshot,
  type ValidityReason,
} from "./contracts";
import {
  PreallocatedMarkerBuffer,
  PreallocatedSampleBuffer,
} from "./preallocatedBuffers";

export interface InputRecorderOptions {
  readonly sampleCapacity?: number;
  readonly markerCapacity?: number;
  readonly gapPolicy?: GapPolicy;
  readonly idFactory?: () => string;
}

function defaultIdFactory(): string {
  return crypto.randomUUID();
}

export class InputRecorder {
  readonly sampleCapacity: number;
  readonly markerCapacity: number;
  readonly gapPolicy: GapPolicy;
  private readonly samples: PreallocatedSampleBuffer;
  private readonly markers: PreallocatedMarkerBuffer;
  private readonly cadence: InputCadenceCollector;
  private readonly idFactory: () => string;
  private captureId: string | null = null;
  private status: CaptureStatus = "idle";
  private validity: CaptureValidity = "valid";
  private inputMode: InputMode | null = null;
  private startedAtUnixMs: number | null = null;
  private endedAtUnixMs: number | null = null;
  private startedAtPerformanceMs: number | null = null;
  private endedAtPerformanceMs: number | null = null;
  private streamSequence = 0;
  private rejectedSampleCount = 0;
  private overflowed = false;
  private buttonsObserved = 0;

  constructor(options: InputRecorderOptions = {}) {
    this.sampleCapacity = options.sampleCapacity ?? DEFAULT_SAMPLE_CAPACITY;
    this.markerCapacity = options.markerCapacity ?? DEFAULT_MARKER_CAPACITY;
    this.gapPolicy = options.gapPolicy ?? M1_GAP_POLICY;
    this.idFactory = options.idFactory ?? defaultIdFactory;
    this.samples = new PreallocatedSampleBuffer(this.sampleCapacity);
    this.markers = new PreallocatedMarkerBuffer(this.markerCapacity);
    this.cadence = new InputCadenceCollector(this.sampleCapacity);
  }

  get isRecording(): boolean {
    return this.status === "recording";
  }

  start(inputMode: InputMode, unixMs: number, performanceMs: number): string {
    if (this.status === "recording") {
      throw new Error("Cannot start while a recording is active.");
    }
    this.samples.clear();
    this.markers.clear();
    this.cadence.reset();
    this.captureId = this.idFactory();
    this.status = "recording";
    this.validity = inputMode === "adjusted" ? "qualified" : "valid";
    this.inputMode = inputMode;
    this.startedAtUnixMs = unixMs;
    this.endedAtUnixMs = null;
    this.startedAtPerformanceMs = performanceMs;
    this.endedAtPerformanceMs = null;
    this.streamSequence = 0;
    this.rejectedSampleCount = 0;
    this.overflowed = false;
    this.buttonsObserved = 0;
    return this.captureId;
  }

  record(
    eventTimestampMs: number,
    captureTimestampMs: number,
    dx: number,
    dy: number,
    buttons: number,
  ): boolean {
    if (this.status !== "recording" || !this.inputMode) return false;
    const previousTimestamp = this.samples.lastCaptureTimestampMs;
    const observedGapMs =
      previousTimestamp === null ? 0 : captureTimestampMs - previousTimestamp;
    const suspicious =
      previousTimestamp !== null &&
      observedGapMs > this.gapPolicy.suspiciousGapMs;
    let flags = SampleFlag.None;
    if (suspicious) {
      flags |= SampleFlag.SuspiciousGapBefore;
      if (this.validity === "valid") this.validity = "qualified";
      if (
        !this.markers.append(
          this.nextSequence(),
          captureTimestampMs,
          "suspicious-sample-gap",
          this.validity,
          observedGapMs,
        )
      ) {
        this.handleOverflow(captureTimestampMs);
        return false;
      }
    }
    const accepted = this.samples.append(
      this.nextSequence(),
      eventTimestampMs,
      captureTimestampMs,
      dx,
      dy,
      buttons,
      this.inputMode,
      flags,
    );
    if (!accepted) {
      this.handleOverflow(captureTimestampMs);
      return false;
    }
    this.cadence.record(captureTimestampMs, suspicious);
    this.buttonsObserved |= buttons;
    return true;
  }

  stop(unixMs: number, performanceMs: number): void {
    if (this.status !== "recording") return;
    this.status = "complete";
    this.endedAtUnixMs = unixMs;
    this.endedAtPerformanceMs = performanceMs;
  }

  reset(): void {
    if (this.status === "recording") {
      throw new Error("An active recording must be stopped or cancelled first.");
    }
    this.samples.clear();
    this.markers.clear();
    this.cadence.reset();
    this.captureId = null;
    this.status = "idle";
    this.validity = "valid";
    this.inputMode = null;
    this.startedAtUnixMs = null;
    this.endedAtUnixMs = null;
    this.startedAtPerformanceMs = null;
    this.endedAtPerformanceMs = null;
    this.streamSequence = 0;
    this.rejectedSampleCount = 0;
    this.overflowed = false;
    this.buttonsObserved = 0;
  }

  interrupt(
    reason: Exclude<InterruptionReason, "suspicious-sample-gap">,
    unixMs: number,
    performanceMs: number,
    resultingValidity: "interrupted" | "invalid" = "interrupted",
  ): void {
    if (this.status !== "recording") return;
    this.validity = resultingValidity;
    this.markers.append(
      this.nextSequence(),
      performanceMs,
      reason,
      resultingValidity,
      Number.NaN,
    );
    this.status = "interrupted";
    this.endedAtUnixMs = unixMs;
    this.endedAtPerformanceMs = performanceMs;
  }

  diagnostics(): RecorderDiagnostics {
    const markers = this.markers.snapshot();
    return Object.freeze({
      captureId: this.captureId,
      status: this.status,
      validity: this.validity,
      validityReasons: this.validityReasons(markers),
      inputMode: this.inputMode,
      startedAtUnixMs: this.startedAtUnixMs,
      endedAtUnixMs: this.endedAtUnixMs,
      startedAtPerformanceMs: this.startedAtPerformanceMs,
      endedAtPerformanceMs: this.endedAtPerformanceMs,
      sampleCapacity: this.sampleCapacity,
      sampleCount: this.samples.length,
      markerCapacity: this.markerCapacity,
      markerCount: this.markers.length,
      overflowed: this.overflowed,
      buttonsObserved: this.buttonsObserved,
      inputCadence: this.cadence.snapshot(
        this.rejectedSampleCount,
        this.overflowed,
      ),
    });
  }

  snapshot(): RecordingSnapshot {
    const markers = this.markers.snapshot();
    return Object.freeze({
      ...this.diagnostics(),
      validityReasons: this.validityReasons(markers),
      samples: this.samples.snapshot(),
      interruptions: markers,
    });
  }

  private nextSequence(): number {
    this.streamSequence += 1;
    return this.streamSequence;
  }

  private handleOverflow(performanceMs: number): void {
    if (this.overflowed) return;
    this.overflowed = true;
    this.rejectedSampleCount += 1;
    this.validity = "invalid";
    this.markers.append(
      this.nextSequence(),
      performanceMs,
      "buffer-overflow",
      "invalid",
      Number.NaN,
    );
    this.status = "interrupted";
    this.endedAtUnixMs = Date.now();
    this.endedAtPerformanceMs = performanceMs;
  }

  private validityReasons(
    markers: readonly { readonly reason: InterruptionReason }[],
  ): readonly ValidityReason[] {
    const reasons = markers.map((marker) => marker.reason) as ValidityReason[];
    if (this.inputMode === "adjusted") reasons.unshift("adjusted-fallback");
    return Object.freeze([...new Set(reasons)]);
  }
}
