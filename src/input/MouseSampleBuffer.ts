import type {
  InputMode,
  RawInputSample,
  ValidityFlag,
} from "../telemetry/schemas";
/** Append-only bounded capture: capacity failure must never overwrite evidence. */
export class MouseSampleBuffer {
  private readonly samples: RawInputSample[];
  private size = 0;
  private seq = 0;
  overflowCount = 0;
  constructor(readonly capacity = 131072) {
    if (!Number.isInteger(capacity) || capacity < 1)
      throw new Error("capacity must be a positive integer");
    this.samples = new Array(capacity);
  }
  append(
    timestampMs: number,
    dx: number,
    dy: number,
    buttons: number,
    pointerLocked: boolean,
    inputMode: InputMode,
    validity: ValidityFlag = "valid",
  ): RawInputSample | null {
    if (this.size === this.capacity || this.overflowCount > 0) {
      this.overflowCount++;
      return null;
    }
    const sample = {
      sequence: this.seq++,
      timestampMs,
      dx,
      dy,
      buttons,
      pointerLocked,
      inputMode,
      validity,
    };
    this.samples[this.size++] = sample;
    return sample;
  }
  marker(timestampMs: number, validity: Exclude<ValidityFlag, "valid">) {
    return this.append(timestampMs, 0, 0, 0, false, "unlocked", validity);
  }
  snapshot() {
    return this.samples.slice(0, this.size).map((s) => ({ ...s }));
  }
  drain() {
    const value = this.snapshot();
    this.size = 0;
    return value;
  }
  get length() {
    return this.size;
  }
}
