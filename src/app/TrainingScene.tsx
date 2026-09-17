import { useEffect, useRef, useState } from "react";
import {
  mountTrainingEngine,
  type TrainingSceneOptions,
} from "../engine/createTrainingEngine";
import { PointerLockInput } from "../input/PointerLockInput";
import type { RawInputSample } from "../telemetry/schemas";
export function TrainingScene({
  options,
  onComplete,
}: {
  options: TrainingSceneOptions;
  onComplete: (
    samples: RawInputSample[],
    reason: "click" | "technicalInvalid",
  ) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    input = useRef<PointerLockInput | null>(null),
    startedRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [diagnostic, setDiagnostic] = useState(
    "Click Begin to request pointer lock.",
  );
  useEffect(() => {
    const engine = mountTrainingEngine(host.current!, options);
    const capture = new PointerLockInput(host.current!);
    capture.attach();
    input.current = capture;
    const timer = setInterval(() => {
      const d = capture.diagnostics();
      setDiagnostic(
        `${d.lock} · ${d.unadjusted} · ${d.samples} browser events${d.eventHz ? ` · ${d.eventHz.toFixed(0)} Hz delivered` : ""}`,
      );
      if (d.lock === "lost" && startedRef.current)
        onComplete(capture.buffer.drain(), "technicalInvalid");
    }, 250);
    return () => {
      clearInterval(timer);
      capture.dispose();
      engine.dispose();
    };
  }, [options, onComplete]);
  return (
    <div className="training">
      <div
        ref={host}
        className="training__scene"
        aria-label={`${options.scenario} three-dimensional scene`}
      />
      <div className="hud hud--top">
        <span className="hud-chip">
          {options.formal ? "Formal assessment" : "Practice"}
        </span>
        <span className="hud-chip">{diagnostic}</span>
      </div>
      <div className="hud hud--bottom">
        {!started ? (
          <button
            className="btn btn--primary"
            onClick={async () => {
              await input.current?.request();
              startedRef.current = true;
              setStarted(true);
            }}
          >
            Begin capture
          </button>
        ) : (
          <>
            <span className="hud-chip">
              Move naturally, then click to complete
            </span>
            <button
              className="btn"
              onClick={() => onComplete(input.current!.buffer.drain(), "click")}
            >
              Complete movement
            </button>
          </>
        )}
      </div>
    </div>
  );
}
