import type {
  Assistance,
  DisplaySample,
  RawInputSample,
} from "../telemetry/schemas";
export type FormPhase =
  | "READY"
  | "PRIMARY_SWEEP"
  | "TRANSITION_CAPTURE"
  | "STABILITY_HOLD"
  | "SECONDARY_FLICK"
  | "MICRO_ADJUST"
  | "CLICK"
  | "REP_FEEDBACK"
  | "RESET";
export class FormBlendMachine {
  phase: FormPhase = "READY";
  readonly raw: RawInputSample[] = [];
  readonly displayed: DisplaySample[] = [];
  rawCarryThrough = 0;
  invalidReasons: string[] = [];
  private yaw = 0;
  private pitch = 0;
  private stableSince: number | null = null;
  private phaseStarted = 0;
  constructor(
    readonly assistance: Assistance,
    private degreesPerCount: number,
  ) {}
  start(t = 0) {
    if (this.phase === "READY") {
      this.phase = "PRIMARY_SWEEP";
      this.phaseStarted = t;
    }
  }
  sample(
    s: RawInputSample,
    signal: { inGate?: boolean; inSecondary?: boolean; inMicro?: boolean } = {},
  ) {
    this.raw.push({ ...s });
    const speed = Math.hypot(s.dx, s.dy);
    let factor = 1;
    if (
      this.phase === "TRANSITION_CAPTURE" ||
      this.phase === "STABILITY_HOLD"
    ) {
      if (this.assistance === "hard" || this.assistance === "demoHard")
        factor = 0;
      else if (this.assistance === "reducedHard") factor = 0.2;
      else if (this.assistance === "soft") factor = 0.45;
      this.rawCarryThrough += speed;
    }
    this.yaw += s.dx * this.degreesPerCount * factor;
    this.pitch += s.dy * this.degreesPerCount * factor;
    this.displayed.push({
      timestampMs: s.timestampMs,
      yawDeg: this.yaw,
      pitchDeg: this.pitch,
      assistance: this.assistance,
    });
    if (this.phase === "PRIMARY_SWEEP" && signal.inGate) {
      this.phase = "TRANSITION_CAPTURE";
      this.phaseStarted = s.timestampMs;
    } else if (this.phase === "TRANSITION_CAPTURE") {
      if (speed < 0.3) {
        this.stableSince ??= s.timestampMs;
        this.phase = "STABILITY_HOLD";
      } else this.stableSince = null;
    } else if (this.phase === "STABILITY_HOLD") {
      if (speed > 0.7) {
        this.stableSince = null;
        this.phase = "TRANSITION_CAPTURE";
      } else if (
        this.stableSince !== null &&
        s.timestampMs - this.stableSince >= 150
      )
        this.phase = "SECONDARY_FLICK";
    } else if (this.phase === "SECONDARY_FLICK" && signal.inSecondary)
      this.phase = "MICRO_ADJUST";
    else if (this.phase === "MICRO_ADJUST" && signal.inMicro)
      this.phase = "CLICK";
    if (s.timestampMs - this.phaseStarted > 5000 && this.phase !== "CLICK")
      this.invalidReasons.push("cautious-drag-provisional");
  }
  click() {
    if (this.phase === "CLICK") this.phase = "REP_FEEDBACK";
    else {
      this.invalidReasons.push("premature-click");
      this.phase = "REP_FEEDBACK";
    }
  }
  summary() {
    const separated =
      this.phase === "REP_FEEDBACK" &&
      !this.invalidReasons.includes("premature-click");
    return {
      valid: separated && this.invalidReasons.length === 0,
      weakestPhase: this.invalidReasons.length
        ? "phase order"
        : "transition control",
      accuracy: "stored separately",
      cue: this.invalidReasons.includes("premature-click")
        ? "Let the micro target sit still for a beat before you click."
        : "Begin removing speed slightly before the transition ring.",
      rawCarryThrough: this.rawCarryThrough,
    };
  }
}
export function nextAssistance(rep: number): Assistance {
  return rep < 1
    ? "demoHard"
    : rep < 4
      ? "hard"
      : rep < 7
        ? "reducedHard"
        : rep < 11
          ? "soft"
          : rep < 14
            ? "cue"
            : "none";
}
