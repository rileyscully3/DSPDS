import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import syntheticFixture from "../test-support/fixtures/m1-synthetic-session.json";
import {
  DEFAULT_DIAGNOSTIC_DURATION_MS,
  type ValidityReason,
} from "../input/contracts";
import {
  InputDiagnosticSession,
  type InputDiagnosticSnapshot,
} from "../input/inputDiagnosticSession";
import {
  collectEnvironmentMetadata,
  createM1SessionExport,
  parseM1Session,
  type M1SessionExport,
} from "../telemetry/m1Session";
import { downloadM1Session } from "../telemetry/download";
import {
  createReplayPresentation,
  replayM1Session,
  type M1Replay,
} from "../telemetry/replay";
import { SceneHost } from "./SceneHost";

const POLL_INTERVAL_MS = 100;

export function InputDiagnosticScreen() {
  const captureSurfaceRef = useRef<HTMLElement>(null);
  const sessionRef = useRef<InputDiagnosticSession | null>(null);
  const [diagnostics, setDiagnostics] =
    useState<InputDiagnosticSnapshot | null>(null);
  const [remainingMs, setRemainingMs] = useState(
    DEFAULT_DIAGNOSTIC_DURATION_MS,
  );
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [replaySession, setReplaySession] = useState<M1SessionExport | null>(
    null,
  );
  const [replayError, setReplayError] = useState<string | null>(null);
  const [replaySpeed, setReplaySpeed] = useState(1);

  const refresh = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    const next = session.diagnostics();
    if (
      next.recording.status === "recording" &&
      next.recording.startedAtPerformanceMs !== null
    ) {
      const remaining = Math.max(
        0,
        DEFAULT_DIAGNOSTIC_DURATION_MS -
          (performance.now() - next.recording.startedAtPerformanceMs),
      );
      setRemainingMs(remaining);
      if (remaining === 0) session.stop();
    } else if (next.recording.status === "idle") {
      setRemainingMs(DEFAULT_DIAGNOSTIC_DURATION_MS);
    }
    setDiagnostics(session.diagnostics());
  }, []);

  useEffect(() => {
    const surface = captureSurfaceRef.current;
    if (!surface) return;
    const session = new InputDiagnosticSession(surface);
    sessionRef.current = session;
    refresh();
    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
      session.dispose();
      sessionRef.current = null;
    };
  }, [refresh]);

  const onFrame = useCallback((timestampMs: number) => {
    sessionRef.current?.recordFrame(timestampMs);
  }, []);

  const requestUnadjusted = async () => {
    await sessionRef.current?.requestUnadjustedFromUserGesture();
    refresh();
  };
  const requestAdjusted = async () => {
    await sessionRef.current?.requestAdjustedFromUserGesture();
    refresh();
  };
  const stop = () => {
    sessionRef.current?.stop();
    refresh();
  };
  const cancel = () => {
    sessionRef.current?.cancel();
    refresh();
  };
  const reset = () => {
    sessionRef.current?.reset();
    setLastExport(null);
    setReplaySession(null);
    setReplayError(null);
    refresh();
  };
  const exportCapture = () => {
    const session = sessionRef.current;
    if (!session) return;
    const current = session.diagnostics();
    const exported = createM1SessionExport(
      session.recordingSnapshot(),
      current.pointerLock,
      current.renderCadence,
      session.recorder.gapPolicy,
      collectEnvironmentMetadata(),
    );
    setLastExport(downloadM1Session(exported));
  };
  const loadFixture = () => {
    const parsed = parseM1Session(JSON.stringify(syntheticFixture));
    setReplaySession(parsed);
    setReplayError(null);
  };
  const loadReplayFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      setReplaySession(parseM1Session(await file.text()));
      setReplayError(null);
    } catch (error) {
      setReplaySession(null);
      setReplayError(
        error instanceof Error ? error.message : "Replay file is invalid.",
      );
    } finally {
      input.value = "";
    }
  };

  const replay = useMemo(
    () => (replaySession ? replayM1Session(replaySession) : null),
    [replaySession],
  );
  const presentation = useMemo(() => {
    if (!replaySession) return [];
    return createReplayPresentation(replaySession, replaySpeed);
  }, [replaySession, replaySpeed]);

  const recording = diagnostics?.recording;
  const pointerLock = diagnostics?.pointerLock;
  const renderCadence = diagnostics?.renderCadence;
  const recordingActive = recording?.status === "recording";
  const canExport =
    recording?.captureId !== null && recording?.captureId !== undefined;
  const fallbackVisible = pointerLock?.adjustedFallbackRequiresAction === true;

  return (
    <>
      <div className="eyebrow">Milestone 1 · technical input evidence</div>
      <h1>Browser input integrity diagnostic</h1>
      <p className="lede">
        This 20-second check preserves browser mouse events independently from
        rendering. Synthetic and fallback results are qualified evidence; only
        the pending Windows protocol can assess physical input quality.
      </p>

      <section
        ref={captureSurfaceRef}
        className="input-diagnostic"
        aria-label="M1 browser input diagnostic"
      >
        <div className="input-diagnostic__scene">
          <SceneHost onFrame={onFrame} />
          <div className="input-diagnostic__scene-label">
            Technical background only · movement does not control this scene
          </div>
        </div>

        <div className="input-diagnostic__controls">
          <div className="diagnostic-status" aria-live="polite">
            <span className="status-label">Recording</span>
            <strong>{humanize(recording?.status ?? "idle")}</strong>
            <span>{formatSeconds(remainingMs)} remaining</span>
          </div>

          <div className="button-row">
            <button
              className="action action--primary"
              type="button"
              onClick={requestUnadjusted}
              disabled={recordingActive}
            >
              Start 20-second diagnostic
            </button>
            {fallbackVisible ? (
              <button
                className="action action--qualified"
                type="button"
                onClick={requestAdjusted}
              >
                Continue with adjusted fallback
              </button>
            ) : null}
            <button
              className="action"
              type="button"
              onClick={stop}
              disabled={!recordingActive}
            >
              Stop
            </button>
            <button
              className="action"
              type="button"
              onClick={cancel}
              disabled={!recordingActive}
            >
              Cancel
            </button>
          </div>

          <div className="capability-panel">
            <h2>Pointer-lock capability</h2>
            <p>
              <strong>{humanize(pointerLock?.state ?? "unlocked")}</strong>
            </p>
            <p>{pointerLock?.detail ?? "Capability check is initializing."}</p>
            <p>
              Selected input mode:{" "}
              <strong>{recording?.inputMode ?? "not selected"}</strong>
            </p>
            {fallbackVisible ? (
              <p className="qualified-notice">
                Adjusted pointer lock is not equivalent to confirmed unadjusted
                input. Continuing requires the separate action above, and the
                export remains qualified.
              </p>
            ) : null}
          </div>
        </div>

        <section className="metrics" aria-label="Input and render cadence">
          <Metric
            label="Accepted samples"
            value={String(recording?.sampleCount ?? 0)}
          />
          <Metric
            label="Input events / second"
            value={formatRate(recording?.inputCadence.eventsPerSecond)}
          />
          <Metric
            label="Median input interval"
            value={formatMs(recording?.inputCadence.medianIntervalMs)}
          />
          <Metric
            label="Maximum input gap"
            value={formatMs(recording?.inputCadence.maximumGapMs)}
          />
          <Metric
            label="Suspicious gaps"
            value={String(recording?.inputCadence.suspiciousGapCount ?? 0)}
          />
          <Metric
            label="Render frames / second"
            value={formatRate(renderCadence?.framesPerSecond)}
          />
          <Metric
            label="Maximum frame gap"
            value={formatMs(renderCadence?.maximumFrameGapMs)}
          />
          <Metric
            label="Long tasks"
            value={
              renderCadence?.longTaskApiSupported
                ? String(renderCadence.longTaskCount)
                : "API unavailable"
            }
          />
          <Metric
            label="Buffer use"
            value={`${recording?.sampleCount ?? 0} / ${recording?.sampleCapacity ?? 262_144}`}
          />
          <Metric
            label="Overflow"
            value={recording?.overflowed ? "Yes — invalid" : "No"}
          />
          <Metric
            label="Buttons observed"
            value={describeButtons(recording?.buttonsObserved ?? 0)}
          />
          <Metric
            label="Validity"
            value={humanize(recording?.validity ?? "valid")}
          />
        </section>

        <ValidityNotice reasons={recording?.validityReasons ?? []} />

        <div className="diagnostic-actions">
          <div>
            <h2>Escape and interruption recovery</h2>
            <p>
              Escape exits pointer lock and interrupts the active recording.
              Focus or visibility loss also interrupts it. Return here and start
              a new recording; partial evidence is never merged.
            </p>
          </div>
          <div className="button-row">
            <button
              className="action"
              type="button"
              onClick={exportCapture}
              disabled={!canExport || recordingActive}
            >
              Export capture
            </button>
            <button className="action" type="button" onClick={loadFixture}>
              Load and replay synthetic fixture
            </button>
            <label className="action file-action">
              Load replay JSON
              <input
                type="file"
                accept="application/json,.json"
                onChange={loadReplayFile}
              />
            </label>
            <button
              className="action"
              type="button"
              onClick={reset}
              disabled={recordingActive}
            >
              Clear / reset
            </button>
          </div>
          {lastExport ? <p>Downloaded: {lastExport}</p> : null}
          {replayError ? <p role="alert">{replayError}</p> : null}
        </div>

        {replay ? (
          <ReplayPanel
            replay={replay}
            presentation={presentation}
            speed={replaySpeed}
            onSpeed={setReplaySpeed}
          />
        ) : null}
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ValidityNotice({ reasons }: { reasons: readonly ValidityReason[] }) {
  if (reasons.length === 0) {
    return (
      <div className="validity-notice validity-notice--clear">
        No interruption has been recorded.
      </div>
    );
  }
  return (
    <div
      className="validity-notice validity-notice--warning"
      role="alert"
      aria-live="assertive"
    >
      <strong>Evidence is not fully valid.</strong>
      <span> Reasons: {reasons.map(humanize).join(", ")}.</span>
    </div>
  );
}

function ReplayPanel({
  replay,
  presentation,
  speed,
  onSpeed,
}: {
  replay: M1Replay;
  presentation: readonly {
    readonly dx: number;
    readonly dy: number;
    readonly presentationOffsetMs: number;
  }[];
  speed: number;
  onSpeed: (speed: number) => void;
}) {
  const points = pathPoints(presentation);
  return (
    <section className="replay-panel" aria-label="Synthetic fixture replay">
      <div>
        <div className="eyebrow">Synthetic non-physical evidence</div>
        <h2>Deterministic 2D path replay</h2>
        <p>
          Raw records and timestamps remain unchanged. Speed changes
          presentation timing only and do not represent formal DSPDS output.
        </p>
        <div className="button-row" aria-label="Replay speed">
          {[0.5, 1, 2].map((option) => (
            <button
              className="action"
              type="button"
              key={option}
              aria-pressed={speed === option}
              onClick={() => onSpeed(option)}
            >
              {option}×
            </button>
          ))}
        </div>
        <p>
          {replay.totals.sampleCount} samples · total dx {replay.totals.deltaX}{" "}
          · total dy {replay.totals.deltaY}
        </p>
      </div>
      <svg
        className="replay-path"
        viewBox="0 0 320 220"
        role="img"
        aria-label="Integrated synthetic mouse movement path"
      >
        <polyline points={points} />
      </svg>
    </section>
  );
}

function pathPoints(
  samples: readonly { readonly dx: number; readonly dy: number }[],
): string {
  let x = 160;
  let y = 110;
  const points = [`${x},${y}`];
  for (const sample of samples) {
    x += sample.dx * 6;
    y += sample.dy * 6;
    points.push(`${x},${y}`);
  }
  return points.join(" ");
}

function describeButtons(bitfield: number): string {
  if (bitfield === 0) return "None";
  const names: string[] = [];
  if (bitfield & 1) names.push("Primary");
  if (bitfield & 2) names.push("Secondary");
  if (bitfield & 4) names.push("Auxiliary");
  return names.length > 0 ? names.join(", ") : `Bitfield ${bitfield}`;
}

function formatSeconds(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(1)} s`;
}

function formatRate(value: number | undefined): string {
  return value === undefined || value === 0 ? "—" : value.toFixed(1);
}

function formatMs(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(2)} ms`;
}

function humanize(value: string): string {
  return value.replaceAll("-", " ");
}
