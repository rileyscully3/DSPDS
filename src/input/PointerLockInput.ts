import { MouseSampleBuffer } from "./MouseSampleBuffer";
export interface InputDiagnostics {
  lock: "idle" | "requesting" | "locked" | "lost" | "denied";
  unadjusted: "not-requested" | "available" | "unavailable";
  eventHz: number | null;
  gaps: number;
  overflow: number;
  samples: number;
}
export class PointerLockInput {
  readonly buffer: MouseSampleBuffer;
  private times: number[] = [];
  private active = false;
  private unadjusted: InputDiagnostics["unadjusted"] = "not-requested";
  private lock: InputDiagnostics["lock"] = "idle";
  private gaps = 0;
  constructor(
    private element: HTMLElement,
    capacity = 131072,
  ) {
    this.buffer = new MouseSampleBuffer(capacity);
  }
  private move = (event: MouseEvent) => {
    if (!this.active) return;
    const t = performance.now();
    const previous = this.times.at(-1);
    if (previous !== undefined && t - previous > 50) {
      this.gaps++;
      this.buffer.marker(t, "gap");
    }
    this.times.push(t);
    if (this.times.length > 512) this.times.shift();
    this.buffer.append(
      t,
      event.movementX,
      event.movementY,
      event.buttons,
      true,
      this.unadjusted === "available" ? "unadjusted" : "adjusted-fallback",
    );
  };
  private lockChange = () => {
    const locked = document.pointerLockElement === this.element;
    if (this.active && !locked) {
      this.lock = "lost";
      this.buffer.marker(performance.now(), "lock-loss");
    } else if (locked) this.lock = "locked";
  };
  private blur = () => {
    if (this.active) this.buffer.marker(performance.now(), "focus-loss");
  };
  attach() {
    if (this.active) return;
    this.active = true;
    document.addEventListener("mousemove", this.move);
    document.addEventListener("pointerlockchange", this.lockChange);
    window.addEventListener("blur", this.blur);
    document.addEventListener("visibilitychange", this.blur);
  }
  async request() {
    this.lock = "requesting";
    try {
      await this.element.requestPointerLock({ unadjustedMovement: true });
      this.unadjusted = "available";
    } catch {
      try {
        await this.element.requestPointerLock();
        this.unadjusted = "unavailable";
      } catch {
        this.lock = "denied";
        this.unadjusted = "unavailable";
      }
    }
  }
  diagnostics(): InputDiagnostics {
    const span =
      this.times.length > 1 ? this.times.at(-1)! - this.times[0]! : 0;
    return {
      lock: this.lock,
      unadjusted: this.unadjusted,
      eventHz: span > 0 ? ((this.times.length - 1) * 1000) / span : null,
      gaps: this.gaps,
      overflow: this.buffer.overflowCount,
      samples: this.buffer.length,
    };
  }
  dispose() {
    this.active = false;
    document.removeEventListener("mousemove", this.move);
    document.removeEventListener("pointerlockchange", this.lockChange);
    window.removeEventListener("blur", this.blur);
    document.removeEventListener("visibilitychange", this.blur);
  }
}
