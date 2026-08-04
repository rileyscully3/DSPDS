import {
  RAW_SAMPLE_SCHEMA_VERSION,
  type CaptureValidity,
  type InputMode,
  type InterruptionMarker,
  type InterruptionReason,
  type RawInputSample,
} from "./contracts";

const INPUT_MODE_CODE: Readonly<Record<InputMode, number>> = {
  unadjusted: 1,
  adjusted: 2,
  synthetic: 3,
};

const INPUT_MODE_FROM_CODE: Readonly<Record<number, InputMode>> = {
  1: "unadjusted",
  2: "adjusted",
  3: "synthetic",
};

const INTERRUPTION_REASONS: readonly InterruptionReason[] = [
  "pointer-lock-loss",
  "window-blur",
  "visibility-hidden",
  "user-cancelled",
  "buffer-overflow",
  "pointer-lock-error",
  "suspicious-sample-gap",
  "capture-teardown",
];

const VALIDITIES: readonly CaptureValidity[] = [
  "valid",
  "qualified",
  "interrupted",
  "invalid",
];

export class PreallocatedSampleBuffer {
  readonly capacity: number;
  private readonly sequences: Float64Array;
  private readonly eventTimestamps: Float64Array;
  private readonly captureTimestamps: Float64Array;
  private readonly deltaX: Float64Array;
  private readonly deltaY: Float64Array;
  private readonly buttons: Uint16Array;
  private readonly modes: Uint8Array;
  private readonly flags: Uint16Array;
  private lengthValue = 0;

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError("Sample capacity must be a positive integer.");
    }
    this.capacity = capacity;
    this.sequences = new Float64Array(capacity);
    this.eventTimestamps = new Float64Array(capacity);
    this.captureTimestamps = new Float64Array(capacity);
    this.deltaX = new Float64Array(capacity);
    this.deltaY = new Float64Array(capacity);
    this.buttons = new Uint16Array(capacity);
    this.modes = new Uint8Array(capacity);
    this.flags = new Uint16Array(capacity);
  }

  get length(): number {
    return this.lengthValue;
  }

  get lastCaptureTimestampMs(): number | null {
    return this.lengthValue === 0
      ? null
      : (this.captureTimestamps[this.lengthValue - 1] ?? null);
  }

  append(
    sequence: number,
    eventTimestampMs: number,
    captureTimestampMs: number,
    dx: number,
    dy: number,
    buttons: number,
    inputMode: InputMode,
    sampleFlags: number,
  ): boolean {
    const index = this.lengthValue;
    if (index >= this.capacity) return false;
    this.sequences[index] = sequence;
    this.eventTimestamps[index] = eventTimestampMs;
    this.captureTimestamps[index] = captureTimestampMs;
    this.deltaX[index] = dx;
    this.deltaY[index] = dy;
    this.buttons[index] = buttons;
    this.modes[index] = INPUT_MODE_CODE[inputMode];
    this.flags[index] = sampleFlags;
    this.lengthValue = index + 1;
    return true;
  }

  clear(): void {
    this.lengthValue = 0;
  }

  snapshot(): readonly RawInputSample[] {
    const samples = new Array<RawInputSample>(this.lengthValue);
    for (let index = 0; index < this.lengthValue; index += 1) {
      const mode = INPUT_MODE_FROM_CODE[this.modes[index] ?? 0];
      if (!mode) throw new Error("Corrupt input mode in sample buffer.");
      samples[index] = Object.freeze({
        schemaVersion: RAW_SAMPLE_SCHEMA_VERSION,
        sequence: this.sequences[index] ?? 0,
        eventTimestampMs: this.eventTimestamps[index] ?? 0,
        captureTimestampMs: this.captureTimestamps[index] ?? 0,
        dx: this.deltaX[index] ?? 0,
        dy: this.deltaY[index] ?? 0,
        buttons: this.buttons[index] ?? 0,
        inputMode: mode,
        flags: this.flags[index] ?? 0,
      });
    }
    return Object.freeze(samples);
  }
}

export class PreallocatedMarkerBuffer {
  readonly capacity: number;
  private readonly sequences: Float64Array;
  private readonly timestamps: Float64Array;
  private readonly reasons: Uint8Array;
  private readonly validities: Uint8Array;
  private readonly gapValues: Float64Array;
  private readonly hasGap: Uint8Array;
  private lengthValue = 0;

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError("Marker capacity must be a positive integer.");
    }
    this.capacity = capacity;
    this.sequences = new Float64Array(capacity);
    this.timestamps = new Float64Array(capacity);
    this.reasons = new Uint8Array(capacity);
    this.validities = new Uint8Array(capacity);
    this.gapValues = new Float64Array(capacity);
    this.hasGap = new Uint8Array(capacity);
  }

  get length(): number {
    return this.lengthValue;
  }

  append(
    sequence: number,
    timestampMs: number,
    reason: InterruptionReason,
    resultingValidity: CaptureValidity,
    observedGapMs: number,
  ): boolean {
    const index = this.lengthValue;
    if (index >= this.capacity) return false;
    this.sequences[index] = sequence;
    this.timestamps[index] = timestampMs;
    this.reasons[index] = INTERRUPTION_REASONS.indexOf(reason) + 1;
    this.validities[index] = VALIDITIES.indexOf(resultingValidity) + 1;
    if (Number.isFinite(observedGapMs)) {
      this.hasGap[index] = 1;
      this.gapValues[index] = observedGapMs;
    } else {
      this.hasGap[index] = 0;
    }
    this.lengthValue = index + 1;
    return true;
  }

  clear(): void {
    this.lengthValue = 0;
  }

  snapshot(): readonly InterruptionMarker[] {
    const markers = new Array<InterruptionMarker>(this.lengthValue);
    for (let index = 0; index < this.lengthValue; index += 1) {
      const reason = INTERRUPTION_REASONS[(this.reasons[index] ?? 0) - 1];
      const validity = VALIDITIES[(this.validities[index] ?? 0) - 1];
      if (!reason || !validity) {
        throw new Error("Corrupt interruption marker buffer.");
      }
      markers[index] = Object.freeze({
        schemaVersion: 1,
        sequence: this.sequences[index] ?? 0,
        timestampMs: this.timestamps[index] ?? 0,
        reason,
        resultingValidity: validity,
        observedGapMs: this.hasGap[index] ? (this.gapValues[index] ?? 0) : null,
      });
    }
    return Object.freeze(markers);
  }
}
