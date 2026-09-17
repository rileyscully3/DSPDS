import type { CompletionMode, RawInputSample } from "../telemetry/schemas";
export type TrialState =
  "PREPARE" | "READY" | "RECORDING" | "SETTLING" | "COMPLETE" | "INTERRUPTED";
export class TrialMachine {
  state: TrialState = "PREPARE";
  private belowSince: number | null = null;
  private movement = 0;
  constructor(
    readonly completionMode: CompletionMode,
    readonly settleWindowMs = 150,
    readonly minMovement = 2,
  ) {}
  dispatch(event: {
    type: "ready" | "start" | "sample" | "click" | "interrupt";
    atMs: number;
    sample?: RawInputSample;
  }) {
    if (
      event.type === "interrupt" &&
      (this.state === "RECORDING" || this.state === "SETTLING")
    ) {
      this.state = "INTERRUPTED";
      return;
    }
    if (this.state === "PREPARE" && event.type === "ready") {
      this.state = "READY";
      return;
    }
    if (this.state === "READY" && event.type === "start") {
      this.state = "RECORDING";
      return;
    }
    if (
      (this.state === "RECORDING" || this.state === "SETTLING") &&
      event.type === "click" &&
      this.movement >= this.minMovement &&
      this.completionMode !== "automatic"
    ) {
      this.state = "COMPLETE";
      return;
    }
    if (
      (this.state === "RECORDING" || this.state === "SETTLING") &&
      event.type === "sample" &&
      event.sample
    ) {
      const speed = Math.hypot(event.sample.dx, event.sample.dy);
      this.movement += speed;
      if (speed > 0.25) {
        this.belowSince = null;
        this.state = "RECORDING";
      } else if (
        this.movement >= this.minMovement &&
        this.completionMode !== "click"
      ) {
        this.belowSince ??= event.atMs;
        this.state = "SETTLING";
        if (event.atMs - this.belowSince >= this.settleWindowMs)
          this.state = "COMPLETE";
      }
    }
  }
}
