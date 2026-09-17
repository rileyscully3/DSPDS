import type { CompletionMode, RawInputSample } from "../telemetry/schemas";
export type TrialState =
  "PREPARE" | "READY" | "RECORDING" | "SETTLING" | "COMPLETE" | "INTERRUPTED";
export class TrialMachine {
  state: TrialState = "PREPARE";
  reason: "settled" | "click" | "timeout" | "technicalInvalid" | null = null;
  private lastMovement = 0;
  private startedAt = 0;
  private movement = 0;
  constructor(
    readonly completionMode: CompletionMode,
    readonly settleWindowMs = 150,
    readonly minMovement = 2,
    readonly minimumDurationMs = 150,
  ) {}
  dispatch(event: {
    type: "ready" | "start" | "sample" | "click" | "interrupt" | "tick";
    atMs: number;
    sample?: RawInputSample;
  }) {
    if (this.state === "PREPARE" && event.type === "ready") {
      this.state = "READY";
      return;
    }
    if (this.state === "READY" && event.type === "start") {
      this.startedAt = this.lastMovement = event.atMs;
      this.state = "RECORDING";
      return;
    }
    if (this.state !== "RECORDING" && this.state !== "SETTLING") return;
    if (event.type === "interrupt") {
      this.state = "INTERRUPTED";
      this.reason = "technicalInvalid";
      return;
    }
    if (event.type === "sample" && event.sample?.validity === "valid") {
      const distance = Math.hypot(event.sample.dx, event.sample.dy);
      this.movement += distance;
      if (distance > 0) {
        this.lastMovement = event.atMs;
        this.state = "RECORDING";
      }
    }
    if (
      this.movement < this.minMovement ||
      event.atMs - this.startedAt < this.minimumDurationMs
    )
      return;
    if (event.type === "click" && this.completionMode !== "automatic") {
      this.state = "COMPLETE";
      this.reason = "click";
      return;
    }
    if (this.completionMode !== "click" && event.atMs > this.lastMovement) {
      this.state = "SETTLING";
      if (event.atMs - this.lastMovement >= this.settleWindowMs) {
        this.state = "COMPLETE";
        this.reason = "settled";
      }
    }
  }
}
