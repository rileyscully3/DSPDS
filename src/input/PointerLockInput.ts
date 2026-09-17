import { MouseSampleBuffer } from "./MouseSampleBuffer";
import type { RawInputSample, ValidityFlag } from "../telemetry/schemas";
export interface InputDiagnostics {
  lock: "idle" | "requesting" | "locked" | "lost" | "denied";
  unadjusted: "not-requested" | "available" | "unavailable";
  state: "idle" | "requesting" | "recording" | "stopped";
  eventHz: number | null;
  gaps: number;
  overflow: number;
  samples: number;
}
/** Injectable browser boundary. Tests replace this boundary, never stored evidence. */
export interface InputAdapter {
  document: Document;
  window: Window;
  now(): number;
  locked(element: HTMLElement): boolean;
  request(element: HTMLElement, unadjusted: boolean): Promise<void> | void;
}
export const browserInput: InputAdapter = {
  document,
  window,
  now: () => performance.now(),
  locked: (element) => document.pointerLockElement === element,
  request: (element, unadjusted) =>
    element.requestPointerLock(
      unadjusted ? { unadjustedMovement: true } : undefined,
    ),
};
export interface CaptureCallbacks {
  sample?(sample: RawInputSample): void;
  click?(atMs: number): void;
  interrupted?(reason: string): void;
}
export class PointerLockInput {
  readonly buffer: MouseSampleBuffer;
  private times: number[] = [];
  private attached = false;
  private state: InputDiagnostics["state"] = "idle";
  private unadjusted: InputDiagnostics["unadjusted"] = "not-requested";
  private lock: InputDiagnostics["lock"] = "idle";
  private gaps = 0;
  private generation = 0;
  constructor(
    private element: HTMLElement,
    capacity = 131072,
    private adapter: InputAdapter = browserInput,
    private callbacks: CaptureCallbacks = {},
  ) {
    this.buffer = new MouseSampleBuffer(capacity);
  }
  private interrupt(reason: Exclude<ValidityFlag, "valid">) {
    if (this.state !== "recording") return;
    this.buffer.marker(this.adapter.now(), reason);
    this.state = "stopped";
    this.callbacks.interrupted?.(reason);
  }
  private move = (event: MouseEvent) => {
    if (this.state !== "recording") return;
    if (!this.adapter.locked(this.element)) {
      this.lock = "lost";
      this.interrupt("lock-loss");
      return;
    }
    const t = this.adapter.now(),
      previous = this.times.at(-1);
    // A delivery interval is observable; dropped physical reports are not.
    if (previous !== undefined && t - previous > 50) {
      this.gaps++;
      this.buffer.marker(t, "gap");
    }
    this.times.push(t);
    if (this.times.length > 512) this.times.shift();
    const accepted = this.buffer.append(
      t,
      event.movementX,
      event.movementY,
      event.buttons,
      this.adapter.locked(this.element),
      this.unadjusted === "available" ? "unadjusted" : "adjusted-fallback",
    );
    if (!accepted) {
      this.state = "stopped";
      this.callbacks.interrupted?.("overflow");
      return;
    }
    this.callbacks.sample?.(accepted);
  };
  private click = (event: MouseEvent) => {
    if (
      this.state === "recording" &&
      event.button === 0 &&
      this.adapter.locked(this.element)
    )
      this.callbacks.click?.(this.adapter.now());
  };
  private lockChange = () => {
    if (this.adapter.locked(this.element)) this.lock = "locked";
    else if (this.state === "recording") {
      this.lock = "lost";
      this.interrupt("lock-loss");
    }
  };
  private blur = () => this.interrupt("focus-loss");
  private visibility = () => {
    if (this.adapter.document.visibilityState === "hidden") this.blur();
  };
  attach() {
    if (this.attached) return;
    this.attached = true;
    this.adapter.document.addEventListener("mousemove", this.move);
    this.adapter.document.addEventListener("mousedown", this.click);
    this.adapter.document.addEventListener(
      "pointerlockchange",
      this.lockChange,
    );
    this.adapter.window.addEventListener("blur", this.blur);
    this.adapter.document.addEventListener("visibilitychange", this.visibility);
  }
  async request(): Promise<boolean> {
    if (!this.attached || this.state !== "idle") return false;
    const generation = ++this.generation;
    this.state = "requesting";
    this.lock = "requesting";
    try {
      await this.adapter.request(this.element, true);
      this.unadjusted = "available";
    } catch {
      if (!this.attached || generation !== this.generation) return false;
      this.unadjusted = "unavailable";
      try {
        await this.adapter.request(this.element, false);
      } catch {
        this.lock = "denied";
        this.state = "idle";
        return false;
      }
    }
    if (!this.attached || generation !== this.generation) return false;
    if (!this.adapter.locked(this.element)) {
      this.lock = "denied";
      this.state = "idle";
      return false;
    }
    this.lock = "locked";
    this.state = "recording";
    return true;
  }
  stop() {
    this.state = "stopped";
  }
  diagnostics(): InputDiagnostics {
    const span =
      this.times.length > 1 ? this.times.at(-1)! - this.times[0]! : 0;
    return {
      state: this.state,
      lock: this.lock,
      unadjusted: this.unadjusted,
      eventHz: span > 0 ? ((this.times.length - 1) * 1000) / span : null,
      gaps: this.gaps,
      overflow: this.buffer.overflowCount,
      samples: this.buffer.length,
    };
  }
  dispose() {
    this.generation++;
    this.stop();
    this.attached = false;
    this.adapter.document.removeEventListener("mousemove", this.move);
    this.adapter.document.removeEventListener("mousedown", this.click);
    this.adapter.document.removeEventListener(
      "pointerlockchange",
      this.lockChange,
    );
    this.adapter.window.removeEventListener("blur", this.blur);
    this.adapter.document.removeEventListener(
      "visibilitychange",
      this.visibility,
    );
  }
}
