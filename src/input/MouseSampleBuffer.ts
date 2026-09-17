import type {
  InputMode,
  RawInputSample,
  ValidityFlag,
} from "../telemetry/schemas";
export class MouseSampleBuffer {
  private readonly samples: RawInputSample[];
  private start = 0;
  private size = 0;
  private seq = 0;
  overflowCount = 0;
  constructor(readonly capacity = 131072) {
    if (capacity < 1) throw new Error("capacity must be positive");
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
  ) {
    const index = (this.start + this.size) % this.capacity;
    if (this.size === this.capacity) {
      this.start = (this.start + 1) % this.capacity;
      this.overflowCount++;
    } else this.size++;
    this.samples[index] = {
      sequence: this.seq++,
      timestampMs,
      dx,
      dy,
      buttons,
      pointerLocked,
      inputMode,
      validity:
        this.overflowCount && validity === "valid" ? "overflow" : validity,
    };
  }
  marker(timestampMs: number, validity: Exclude<ValidityFlag, "valid">) {
    this.append(timestampMs, 0, 0, 0, false, "unlocked", validity);
  }
  snapshot() {
    return Array.from({ length: this.size }, (_, i) => ({
      ...this.samples[(this.start + i) % this.capacity]!,
    }));
  }
  drain() {
    const value = this.snapshot();
    this.start = 0;
    this.size = 0;
    return value;
  }
  get length() {
    return this.size;
  }
}
