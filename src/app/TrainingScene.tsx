import { useEffect, useRef, useState } from "react";
import {
  mountTrainingEngine,
  type TrainingSceneOptions,
} from "../engine/createTrainingEngine";
import { PointerLockInput } from "../input/PointerLockInput";
import { TrialMachine } from "../scenarios/TrialMachine";
import { captureEligibility } from "../input/eligibility";
import type { RawInputSample, TrialRecord } from "../telemetry/schemas";
export type CaptureEvidence = ReturnType<typeof captureEligibility> & {
  overflow: number;
  startedAtMs: number;
  endedAtMs: number;
};
export type CaptureComplete = (
  samples: RawInputSample[],
  reason: TrialRecord["completionReason"],
  evidence?: CaptureEvidence,
) => void;
export function TrainingScene({
  options,
  onComplete,
}: {
  options: TrainingSceneOptions;
  onComplete: CaptureComplete;
}) {
  const host = useRef<HTMLDivElement>(null),
    input = useRef<PointerLockInput | null>(null);
  const callback = useRef(onComplete);
  useEffect(() => {
    callback.current = onComplete;
  }, [onComplete]);
  const [started, setStarted] = useState(false),
    [diagnostic, setDiagnostic] = useState(
      "Reposition comfortably, then Begin.",
    );
  const beginRef = useRef<() => Promise<void>>(async () => {});
  // Depend on scalar scene conditions, not a fresh object from each UI render.
  const {
    scenario,
    formal,
    target: { xDeg, yDeg },
    viewMode,
    assistance,
    verticalFovDeg,
    degreesPerRawCount,
  } = options;
  useEffect(() => {
    const hostElement = host.current!;
    const engine = mountTrainingEngine(hostElement, {
      scenario,
      formal,
      target: { xDeg, yDeg },
      viewMode,
      assistance,
      verticalFovDeg,
      degreesPerRawCount,
    });
    const machine = new TrialMachine("autoWithClickFailsafe");
    machine.dispatch({ type: "ready", atMs: performance.now() });
    let done = false,
      startedAtMs = 0;
    const finish = (reason: TrialRecord["completionReason"]) => {
      if (done) return;
      done = true;
      capture.stop();
      const samples = capture.buffer.snapshot(),
        overflow = capture.buffer.overflowCount;
      const evidence = {
        ...captureEligibility(samples, reason, overflow),
        overflow,
        startedAtMs,
        endedAtMs: performance.now(),
      };
      if (overflow)
        setDiagnostic(
          "Capacity exceeded. Capture stopped; earlier evidence preserved.",
        );
      if (document.pointerLockElement === hostElement)
        document.exitPointerLock();
      callback.current(samples, reason, evidence);
    };
    const check = () => {
      if (machine.state === "COMPLETE") finish(machine.reason!);
    };
    const capture = new PointerLockInput(hostElement, 131072, undefined, {
      sample: (sample) => {
        machine.dispatch({ type: "sample", atMs: sample.timestampMs, sample });
        check();
      },
      click: (atMs) => {
        machine.dispatch({ type: "click", atMs });
        check();
      },
      interrupted: () => {
        machine.dispatch({ type: "interrupt", atMs: performance.now() });
        finish("technicalInvalid");
      },
    });
    capture.attach();
    input.current = capture;
    beginRef.current = async () => {
      if (await capture.request()) {
        startedAtMs = performance.now();
        machine.dispatch({ type: "start", atMs: startedAtMs });
        setStarted(true);
      } else
        setDiagnostic("Pointer lock was not acquired. Click Begin to retry.");
    };
    const timer = setInterval(() => {
      if (done) return;
      machine.dispatch({ type: "tick", atMs: performance.now() });
      check();
      const d = capture.diagnostics();
      if (d.state === "recording")
        setDiagnostic(
          d.unadjusted === "available"
            ? "Pointer locked · unadjusted requested"
            : "Pointer locked · adjusted fallback (qualified evidence)",
        );
    }, 25);
    return () => {
      done = true;
      clearInterval(timer);
      capture.dispose();
      engine.dispose();
      if (document.pointerLockElement === hostElement)
        document.exitPointerLock();
    };
  }, [
    scenario,
    formal,
    xDeg,
    yDeg,
    viewMode,
    assistance,
    verticalFovDeg,
    degreesPerRawCount,
  ]);
  return (
    <div className="training">
      <div
        ref={host}
        className="training__scene"
        aria-label={`${scenario} three-dimensional scene`}
      />
      <div className="hud hud--top">
        <span className="hud-chip">
          {formal ? "Formal assessment" : "Practice"}
        </span>
        <span className="hud-chip" role="status">
          {diagnostic}
        </span>
      </div>
      <div className="hud hud--bottom">
        {!started ? (
          <button
            className="btn btn--primary"
            onClick={() => beginRef.current()}
          >
            Begin capture
          </button>
        ) : (
          <span className="hud-chip">
            Move naturally, then settle or left-click anywhere. Escape
            interrupts.
          </span>
        )}
      </div>
    </div>
  );
}
