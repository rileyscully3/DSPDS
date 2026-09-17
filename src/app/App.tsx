import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULTS, PROTOCOL_VERSION } from "../config/defaults";
import { buildModel, displacementMetrics } from "../analysis/metrics";
import {
  calibrationSummary,
  degreesPerRawCount,
  horizontalFovDeg,
} from "../profiles/quantities";
import { baselineTargets } from "../baseline/baseline";
import { nextAssistance } from "../form-blend/FormBlendMachine";
import { generateProtocol } from "../scenarios/protocol";
import { Repository } from "../storage/db";
import {
  createExport,
  importMissing,
  previewImport,
  validateImport,
} from "../storage/exportImport";
import type {
  ExportBundle,
  EquipmentProfile,
  RawInputSample,
  SessionRecord,
  SpatialModelSnapshot,
  TrialRecord,
  UserProfile,
} from "../telemetry/schemas";
import {
  TrainingScene,
  type CaptureComplete,
  type CaptureEvidence,
} from "./TrainingScene";
import { captureEligibility } from "../input/eligibility";

type Route =
  | "setup"
  | "home"
  | "diagnostic"
  | "dspds"
  | "results"
  | "practice"
  | "baseline"
  | "formBlend"
  | "history"
  | "insights"
  | "data"
  | "settings";
const routeFromHash = (): Route => {
  const r = location.hash.replace("#/", "") as Route;
  return [
    "setup",
    "home",
    "diagnostic",
    "dspds",
    "results",
    "practice",
    "baseline",
    "formBlend",
    "history",
    "insights",
    "data",
    "settings",
  ].includes(r)
    ? r
    : "setup";
};
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
function defaultEquipment(userId: string): EquipmentProfile {
  const dpi = DEFAULTS.input.dpi,
    cm = DEFAULTS.input.cmPer360;
  return {
    schemaVersion: 1,
    id: id("equipment"),
    userId,
    mouseName: "",
    dpi,
    selectedCmPer360: cm,
    measuredCmPer360: null,
    countsPerCm: null,
    verification: "calculated",
    verticalFovDeg: 90,
    horizontalFovDeg: horizontalFovDeg(90),
    degreesPerRawCount: degreesPerRawCount(dpi, cm),
    viewMode: "firstPerson",
    updatedAt: now(),
    calibrationRuns: [],
    recalibrationRecommended: false,
  };
}
function download(name: string, value: unknown) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
export function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [repo, setRepo] = useState<Repository | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [equipment, setEquipment] = useState<EquipmentProfile | null>(null);
  const [trials, setTrials] = useState<TrialRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [models, setModels] = useState<SpatialModelSnapshot[]>([]);

  const [notice, setNotice] = useState<string | null>(null);
  const [formRep, setFormRep] = useState(0);
  const go = (r: Route) => {
    location.hash = `#/${r}`;
  };
  useEffect(() => {
    const h = () => setRoute(routeFromHash());
    addEventListener("hashchange", h);
    return () => removeEventListener("hashchange", h);
  }, []);
  useEffect(() => {
    Repository.create()
      .then(async (r) => {
        setRepo(r);
        const d = await r.snapshot();
        setProfile(d.profiles[0] ?? null);
        setEquipment(
          d.equipment.find((e) => e.id === d.profiles[0]?.activeEquipmentId) ??
            d.equipment[0] ??
            null,
        );
        setTrials(d.trials);
        setSessions(d.sessions);
        setModels(d.models);
        if (d.profiles[0] && routeFromHash() === "setup") go("home");
      })
      .catch((e) =>
        setStorageError(e instanceof Error ? e.message : String(e)),
      );
  }, []);
  const seed = "formal-release-protocol-1";
  const protocol = useMemo(() => generateProtocol(seed), []);
  const mode = route === "practice" ? "practice" : "formal";
  const activeSession = sessions.find(
    (s) =>
      s.kind === "dspds" &&
      s.status === "in-progress" &&
      s.mode === mode &&
      s.protocolVersion === PROTOCOL_VERSION &&
      JSON.stringify(s.equipment) === JSON.stringify(equipment),
  );
  const scenarioIndex = activeSession?.trialIds.length ?? 0;
  const current = protocol[Math.min(scenarioIndex, protocol.length - 1)]!;
  const saveSetup = async (form: FormData) => {
    const userId = id("profile"),
      p: UserProfile = {
        schemaVersion: 1,
        id: userId,
        displayName: String(form.get("name") || "Local user"),
        createdAt: now(),
        updatedAt: now(),
        activeEquipmentId: "",
        preferences: { reducedMotion: false, textScale: 1 },
      };
    const e = defaultEquipment(userId);
    e.mouseName = String(form.get("mouse") || "Mouse");
    e.dpi = Number(form.get("dpi")) || null;
    e.selectedCmPer360 = Number(form.get("cm")) || null;
    e.verticalFovDeg = Number(form.get("fov")) || 90;
    e.horizontalFovDeg = horizontalFovDeg(e.verticalFovDeg);
    e.degreesPerRawCount =
      e.dpi && e.selectedCmPer360
        ? degreesPerRawCount(e.dpi, e.selectedCmPer360)
        : null;
    e.verification = e.dpi ? "calculated" : "relative-only";
    p.activeEquipmentId = e.id;
    try {
      await repo?.put("profiles", p);
      await repo?.put("equipment", e);
      setProfile(p);
      setEquipment(e);
      go("diagnostic");
    } catch (err) {
      setStorageError(String(err));
    }
  };
  const completeTrial = useCallback(
    async (
      samples: RawInputSample[],
      reason: TrialRecord["completionReason"],
      evidence?: CaptureEvidence,
    ) => {
      if (!equipment) return;
      if (!repo || scenarioIndex >= protocol.length) return;
      const sessionId = activeSession?.id ?? id("session");
      const mode = route === "practice" ? "practice" : "formal";
      const eligibility = evidence ?? captureEligibility(samples, reason);
      const valid = eligibility.valid;
      const trial: TrialRecord = {
        schemaVersion: 1,
        id: id("trial"),
        sessionId,
        scenario: current.scenario,
        scenarioVersion: "2.0.0",
        ...(evidence ? { capture: evidence } : {}),
        mode,
        seed,
        intended: {
          xDeg: current.xDeg,
          yDeg: current.yDeg,
          path: current.path,
        },
        completionMode: "autoWithClickFailsafe",
        completionReason: reason,
        rawSamples: samples,
        valid,
        exclusionReasons: eligibility.exclusions,
        metrics: valid ? displacementMetrics(current, samples) : [],
        createdAt: now(),
      };
      let session = sessions.find((s) => s.id === sessionId);
      if (!session)
        session = {
          schemaVersion: 1,
          id: sessionId,
          kind: "dspds",
          mode,
          protocolVersion: PROTOCOL_VERSION,
          seed,
          status: "in-progress",
          trialIds: [],
          equipment: structuredClone(equipment),
          startedAt: now(),
          completedAt: null,
          recovery: { recovered: false, lastCompletedTrialId: null },
          viewMode: "firstPerson",
        };
      session = {
        ...session,
        trialIds: [...session.trialIds, trial.id],
        recovery: { ...session.recovery, lastCompletedTrialId: trial.id },
      };
      try {
        const recovery = {
          id: session.id,
          schemaVersion: 1,
          session,
          updatedAt: now(),
        };
        await repo.atomic(
          [
            { store: "trials", value: trial, addOnly: true },
            { store: "sessions", value: session },
            { store: "recovery", value: recovery },
          ],
          { sessionId: session.id, trialCount: scenarioIndex },
        );
        setTrials((v) => [...v, trial]);
        setSessions((v) => [
          ...v.filter((s) => s.id !== session!.id),
          session!,
        ]);

        setNotice(
          valid
            ? "Trial saved. No result is shown during this formal block."
            : "Trial excluded because capture was interrupted.",
        );
      } catch (e) {
        setStorageError(`Trial was not saved: ${String(e)}`);
      }
    },
    [
      equipment,
      sessions,
      route,
      current,
      repo,
      activeSession,
      scenarioIndex,
      protocol.length,
    ],
  );
  const finishAssessment = async () => {
    if (!equipment) return;
    const session = activeSession;
    if (!session) {
      setNotice("No formal trials are available.");
      return;
    }
    if (
      session.mode !== "formal" ||
      session.trialIds.length !== protocol.length
    ) {
      setNotice(
        "Incomplete work is saved. Complete every controlled trial before creating an official assessment.",
      );
      return;
    }
    const all = trials.filter((t) => t.sessionId === session.id);
    if (
      all.length !== protocol.length ||
      session.trialIds.some((trialId, i) => {
        const t = all.find((t) => t.id === trialId),
          expected = protocol[i]!;
        return (
          !t ||
          t.mode !== "formal" ||
          t.scenario !== expected.scenario ||
          t.intended.xDeg !== expected.xDeg ||
          t.intended.yDeg !== expected.yDeg
        );
      })
    ) {
      setStorageError(
        "Protocol evidence does not match the session; completion withheld.",
      );
      return;
    }
    const completed = {
      ...session,
      status: "completed" as const,
      completedAt: now(),
    };
    const model = buildModel(
      session.id,
      all,
      session.equipment.verification === "physically-verified"
        ? session.equipment.countsPerCm
        : null,
    );
    await repo?.atomic(
      [
        { store: "sessions", value: completed },
        { store: "models", value: model, addOnly: true },
      ],
      { sessionId: session.id, trialCount: protocol.length },
    );
    setSessions((v) => v.map((s) => (s.id === completed.id ? completed : s)));
    setModels((v) => [...v, model]);
    go("results");
  };
  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      {route !== "setup" && <Header profile={profile} route={route} go={go} />}
      <main
        id="main"
        className={
          route === "dspds" || route === "practice" || route === "formBlend"
            ? "main main--scene"
            : "main"
        }
      >
        {storageError && (
          <div className="alert alert--error" role="alert">
            <strong>Local saving unavailable.</strong> {storageError} Do not
            rely on this session until storage works.
          </div>
        )}
        {notice && (
          <div className="toast" role="status">
            {notice}
            <button aria-label="Dismiss" onClick={() => setNotice(null)}>
              ×
            </button>
          </div>
        )}
        {route === "setup" && <Setup onSubmit={saveSetup} />}{" "}
        {route === "home" && (
          <Home
            profile={profile}
            equipment={equipment}
            models={models}
            sessions={sessions}
            go={go}
          />
        )}{" "}
        {route === "diagnostic" && <Diagnostic equipment={equipment} go={go} />}{" "}
        {(route === "dspds" || route === "practice") && (
          <Assessment
            mode={route === "dspds" ? "formal" : "practice"}
            geometry={current}
            equipment={equipment}
            index={scenarioIndex}
            total={protocol.length}
            onComplete={completeTrial}
            onFinish={finishAssessment}
          />
        )}{" "}
        {route === "results" && (
          <Results model={models.at(-1) ?? null} trials={trials} go={go} />
        )}{" "}
        {route === "baseline" && <Baseline seed={seed} go={go} />}{" "}
        {route === "formBlend" && (
          <FormBlend rep={formRep} setRep={setFormRep} go={go} />
        )}{" "}
        {route === "history" && (
          <History sessions={sessions} trials={trials} models={models} />
        )}{" "}
        {route === "insights" && (
          <Insights model={models.at(-1) ?? null} go={go} />
        )}{" "}
        {route === "data" && (
          <DataManager
            repo={repo}
            onNotice={setNotice}
            onRefresh={async () => {
              if (repo) {
                const d = await repo.snapshot();
                setTrials(d.trials);
                setSessions(d.sessions);
                setModels(d.models);
              }
            }}
          />
        )}{" "}
        {route === "settings" && (
          <Settings equipment={equipment} repo={repo} onChange={setEquipment} />
        )}
      </main>
    </div>
  );
}

function Header({
  profile,
  route,
  go,
}: {
  profile: UserProfile | null;
  route: Route;
  go: (r: Route) => void;
}) {
  return (
    <header className="shell__header">
      <button className="brand" onClick={() => go("home")}>
        FORM BLEND <span>+ DSPDS</span>
      </button>
      <nav className="nav" aria-label="Primary navigation">
        {(
          [
            "home",
            "dspds",
            "practice",
            "baseline",
            "formBlend",
            "insights",
            "history",
            "data",
            "settings",
          ] as Route[]
        ).map((r) => (
          <button
            key={r}
            onClick={() => go(r)}
            aria-current={route === r ? "page" : undefined}
          >
            {r === "formBlend"
              ? "Form Blend"
              : r[0]!.toUpperCase() + r.slice(1)}
          </button>
        ))}
      </nav>
      <span className="profile-chip">{profile?.displayName ?? "Local"}</span>
    </header>
  );
}
function Setup({ onSubmit }: { onSubmit: (f: FormData) => void }) {
  return (
    <section className="setup">
      <div className="eyebrow">Private · local-first</div>
      <h1>
        Map how space feels.
        <br />
        Train how control finishes.
      </h1>
      <p className="lede">
        DSPDS records open-loop movement without showing your endpoint. Form
        Blend turns that evidence into a deliberate sweep, stop, correction, and
        click sequence.
      </p>
      <form className="card form" action={onSubmit}>
        <h2>Create your local profile</h2>
        <label>
          Display name
          <input className="input" name="name" required defaultValue="Player" />
        </label>
        <label>
          Mouse name
          <input
            className="input"
            name="mouse"
            required
            placeholder="Your mouse"
          />
        </label>
        <div className="form__row">
          <label>
            DPI (optional)
            <input
              className="input"
              name="dpi"
              type="number"
              min="100"
              defaultValue="1600"
            />
          </label>
          <label>
            Selected cm/360
            <input
              className="input"
              name="cm"
              type="number"
              min="1"
              step="0.1"
              defaultValue="40"
            />
          </label>
          <label>
            Vertical FOV
            <input
              className="input"
              name="fov"
              type="number"
              min="60"
              max="120"
              defaultValue="90"
            />
          </label>
        </div>
        <p className="fine">
          Stored only in this browser. Physical verification is optional and
          never blocks practice.
        </p>
        <button className="btn btn--primary" type="submit">
          Save and check input
        </button>
      </form>
    </section>
  );
}
function Home({
  profile,
  equipment,
  models,
  sessions,
  go,
}: {
  profile: UserProfile | null;
  equipment: EquipmentProfile | null;
  models: SpatialModelSnapshot[];
  sessions: SessionRecord[];
  go: (r: Route) => void;
}) {
  const active = sessions.find((s) => s.status === "in-progress");
  return (
    <>
      <div className="eyebrow">Good to see you, {profile?.displayName}</div>
      <h1>
        {active
          ? "Continue where evidence is safe."
          : models.length
            ? "Continue Form Blend."
            : "Build your first spatial model."}
      </h1>
      <p className="lede">
        {active
          ? "Everything through the last completed trial is saved."
          : "A formal assessment is recommended before the movement baseline and guided training."}
      </p>
      <div className="hero-grid">
        <section className="card card--accent">
          <span className="tag">Recommended</span>
          <h2>{active ? "Resume formal assessment" : "Begin formal DSPDS"}</h2>
          <p>
            Five open-loop scenarios · about 10–12 minutes · results withheld
            until completion.
          </p>
          <button className="btn btn--primary" onClick={() => go("dspds")}>
            {active ? "Resume" : "Review readiness"}
          </button>
        </section>
        <section className="card">
          <div className="stat">
            <strong>{models.at(-1)?.confidence ?? "—"}</strong>
            <span>model confidence</span>
          </div>
          <div className="stat">
            <strong>{equipment?.verification ?? "—"}</strong>
            <span>input profile</span>
          </div>
          <div className="stat">
            <strong>
              {sessions.filter((s) => s.status === "completed").length}
            </strong>
            <span>completed sessions</span>
          </div>
        </section>
      </div>
      <h2 className="section-title">Choose an activity</h2>
      <div className="cards">
        {[
          [
            "DSPDS practice",
            "Explore scenarios; archived separately.",
            "practice",
          ],
          [
            "Physical baseline",
            "Four visible-aim movement labels.",
            "baseline",
          ],
          [
            "Form Blend",
            "Guided sweep, stop, correction, finish.",
            "formBlend",
          ],
          ["Profile insights", "Model shape and evidence links.", "insights"],
        ].map(([t, d, r]) => (
          <button className="activity" key={t} onClick={() => go(r as Route)}>
            <span>{t}</span>
            <small>{d}</small>
            <b>→</b>
          </button>
        ))}
      </div>
    </>
  );
}

function Diagnostic({
  equipment,
  go,
}: {
  equipment: EquipmentProfile | null;
  go: (r: Route) => void;
}) {
  return (
    <>
      <div className="eyebrow">Input readiness</div>
      <h1>Know what the browser can—and cannot—report.</h1>
      <div className="two-col">
        <section className="card">
          <h2>Browser capture</h2>
          <p>
            Pointer lock requests unadjusted movement first, then visibly falls
            back if unavailable. Every delivered mouse event is retained
            independently of rendering.
          </p>
          <ul className="evidence-list">
            <li>Individual ordered samples</li>
            <li>Focus, visibility, lock-loss and gap markers</li>
            <li>Bounded buffer with visible overflow</li>
            <li>Separate raw and displayed-camera traces</li>
          </ul>
          <button className="btn btn--primary" onClick={() => go("dspds")}>
            Continue to assessment
          </button>
        </section>
        <aside className="card warning">
          <h3>Physical validation pending</h3>
          <p>
            Browser-event cadence is not hardware polling rate and missing
            hardware reports cannot be ruled out here. Run the Windows Chrome
            and Edge manual protocol before treating capture as physically
            validated.
          </p>
        </aside>
      </div>
      <div className="quantity-row">
        <div>
          <span>Degrees / raw count</span>
          <strong>
            {equipment?.degreesPerRawCount?.toFixed(6) ?? "relative only"}
          </strong>
        </div>
        <div>
          <span>Vertical / horizontal FOV</span>
          <strong>
            {equipment?.verticalFovDeg.toFixed(0)}° /{" "}
            {equipment?.horizontalFovDeg.toFixed(1)}°
          </strong>
        </div>
        <div>
          <span>Verification</span>
          <strong>{equipment?.verification}</strong>
        </div>
      </div>
    </>
  );
}
function Assessment({
  mode,
  geometry,
  equipment,
  index,
  total,
  onComplete,
  onFinish,
}: {
  mode: "formal" | "practice";
  geometry: ReturnType<typeof generateProtocol>[number];
  equipment: EquipmentProfile | null;
  index: number;
  total: number;
  onComplete: CaptureComplete;
  onFinish: () => void;
}) {
  const names = {
    single: "Single displacement",
    chain: "Chained flick",
    predictableTrack: "Predictable camera follow",
    dynamicStatic: "Dynamic · static camera",
    dynamicCamera: "Dynamic · automatic follow",
    line: "Center-origin line tracing",
  };
  return (
    <section className="scene-page">
      <div className="scene-intro">
        <span className={mode === "formal" ? "tag" : "tag tag--neutral"}>
          {mode === "formal"
            ? "Formal assessment"
            : "Practice · archived separately"}
        </span>
        <h1>{names[geometry.scenario]}</h1>
        <p>
          {geometry.scenario === "single"
            ? "Move the amount that feels sufficient for the visible target. The camera and target will not respond."
            : geometry.scenario === "chain"
              ? "Flick toward the active target. Reorientation uses the intended target, never your measured endpoint."
              : geometry.scenario === "line"
                ? "Trace the line growing from center. Your path and endpoint remain hidden."
                : "Physically mirror the readable target or automatic camera motion. Your input cannot steer the view."}
        </p>
        <span className="progress">
          Trial {Math.min(index + 1, total)} of {total}
        </span>
      </div>
      {index < total && (
        <TrainingScene
          key={`${mode}-${index}`}
          options={{
            verticalFovDeg: equipment?.verticalFovDeg,
            degreesPerRawCount: equipment?.degreesPerRawCount,
            scenario: geometry.scenario,
            formal: mode === "formal",
            target: { xDeg: geometry.xDeg, yDeg: geometry.yDeg },
            viewMode: "firstPerson",
          }}
          onComplete={onComplete}
        />
      )}
      <div className="scene-actions">
        {mode === "formal" && (
          <button className="btn" onClick={onFinish} disabled={index < total}>
            Complete formal assessment
          </button>
        )}
        <p>
          No reticle, endpoint, live score, sensitivity estimate, or corrective
          coaching is shown during formal capture.
        </p>
      </div>
    </section>
  );
}
function Results({
  model,
  trials,
  go,
}: {
  model: SpatialModelSnapshot | null;
  trials: TrialRecord[];
  go: (r: Route) => void;
}) {
  if (!model)
    return (
      <Empty
        title="No official model yet"
        body="Complete eligible formal trials to create an immutable model snapshot."
        action="Begin assessment"
        onAction={() => go("dspds")}
      />
    );
  return (
    <>
      <div className="eyebrow">Official spatial model · immutable snapshot</div>
      <h1>
        {model.sufficiency === "insufficient"
          ? "Evidence is still insufficient."
          : "Your spatial scale is provisional and inspectable."}
      </h1>
      <p className="lede">
        Confidence describes evidence strength, not movement quality. This
        snapshot uses formal trials only.
      </p>
      <div className="result-grid">
        <section className="card card--accent">
          <span className="tag">{model.confidence} confidence</span>
          <h2>Spatial behavior first</h2>
          <p>{model.findings[0]?.text}</p>
          <div className="band-grid">
            {Object.entries(model.countsPerDegree).map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>
                  {v === null ? "insufficient" : `${v.toFixed(1)} counts/°`}
                </strong>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <span className="tag tag--neutral">Derived finding</span>
          <h2>Observed physical spread</h2>
          {model.impliedCmPer360 ? (
            <>
              <strong className="range">
                {model.impliedCmPer360.low.toFixed(1)}–
                {model.impliedCmPer360.high.toFixed(1)} cm/360
              </strong>
              <p>
                Observed median {model.impliedCmPer360.central.toFixed(1)}{" "}
                cm/360.{" "}
                {model.rangeMeaning ??
                  "Legacy experimental range: unsupported; not corrected evidence."}
              </p>
            </>
          ) : (
            <p>
              Verify counts per centimeter to express this estimate physically.
              Relative analysis remains available.
            </p>
          )}
        </section>
      </div>
      <section className="card">
        <h2>Evidence</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Valid</th>
              <th>Excluded</th>
              <th>Inspectable measurements</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                "single",
                "chain",
                "predictableTrack",
                "dynamicStatic",
                "dynamicCamera",
                "line",
              ] as const
            ).map((s) => {
              const rows = trials.filter(
                (t) =>
                  t.scenario === s &&
                  t.mode === "formal" &&
                  model.sourceFormalAssessmentIds.includes(t.sessionId),
              );
              return (
                <tr key={s}>
                  <td>{s}</td>
                  <td>{rows.filter((t) => t.valid).length}</td>
                  <td>{rows.filter((t) => !t.valid).length}</td>
                  <td>
                    {rows
                      .flatMap((t) => t.metrics.map((m) => m.label))
                      .slice(0, 3)
                      .join(", ") || "insufficient"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <div className="actions">
        <button className="btn btn--primary" onClick={() => go("baseline")}>
          Continue to physical baseline
        </button>
        <button className="btn" onClick={() => go("history")}>
          Inspect history
        </button>
      </div>
    </>
  );
}
function Baseline({ seed, go }: { seed: string; go: (r: Route) => void }) {
  const [block, setBlock] = useState(0);
  const blocks = [
    {
      name: "Arm-primary",
      instruction:
        "Move primarily with your arm. Keep the wrist and fingers relatively quiet.",
    },
    {
      name: "Wrist-primary",
      instruction: "Plant the forearm and move primarily at the wrist.",
    },
    {
      name: "Fingertip-primary",
      instruction:
        "Keep the heel of the hand and wrist planted. Move primarily with your fingertips.",
    },
    {
      name: "Freestyle",
      instruction: "Use whatever combination feels natural.",
    },
  ];
  const b = blocks[block]!;
  return (
    <>
      <div className="eyebrow">
        Visible-aim physical baseline · block {block + 1} of 4
      </div>
      <h1>{b.name}</h1>
      <p className="lede">
        {b.instruction} Labels describe your instructed movement; telemetry
        cannot prove anatomy.
      </p>
      <div className="baseline-stage">
        <div className="reticle" aria-hidden="true">
          +
        </div>
        <div
          className="visible-target"
          style={{
            transform: `translate(${baselineTargets(seed)[block]!.xDeg * 8}px,${baselineTargets(seed)[block]!.yDeg * 5}px)`,
          }}
        />
        <span>Visible aim is intentionally enabled for this baseline.</span>
      </div>
      <section className="card">
        <h2>Feedback waits until block completion</h2>
        <p>
          Speed, precision, smoothness, correction, stopping, direction, and
          movement envelope are recorded with equivalent seeded targets in
          shuffled order.
        </p>
        <button
          className="btn btn--primary"
          onClick={() => (block < 3 ? setBlock(block + 1) : go("formBlend"))}
        >
          {block < 3 ? "Complete block and continue" : "Complete baseline"}
        </button>
      </section>
    </>
  );
}
function FormBlend({
  rep,
  setRep,
  go,
}: {
  rep: number;
  setRep: (n: number) => void;
  go: (r: Route) => void;
}) {
  const assistance = nextAssistance(rep),
    [view, setView] = useState<"firstPerson" | "thirdPerson">("firstPerson");
  const complete = () => setRep(rep + 1);
  return (
    <section className="scene-page">
      <div className="scene-intro">
        <span className="tag">
          {assistance === "none" ? "Unassisted" : `${assistance} assistance`}
        </span>
        <h1>Sweep → stop → smaller flick → micro → click</h1>
        <p>
          Assistance changes displayed camera output only. The original
          browser-delivered samples remain unchanged for evaluation.
        </p>
        <div className="seg" role="radiogroup" aria-label="View mode">
          <button
            role="radio"
            aria-checked={view === "firstPerson"}
            onClick={() => setView("firstPerson")}
          >
            First person
          </button>
          <button
            role="radio"
            aria-checked={view === "thirdPerson"}
            onClick={() => setView("thirdPerson")}
          >
            Third person
          </button>
        </div>
      </div>
      <TrainingScene
        key={`${rep}-${view}`}
        options={{
          scenario: "formBlend",
          formal: false,
          target: { xDeg: 18, yDeg: 4 },
          viewMode: view,
          assistance,
        }}
        onComplete={complete}
      />
      <aside className="rep-panel">
        <span>
          Repetition {rep + 1} / {DEFAULTS.formBlend.onboardingMaxReps}
        </span>
        <strong>
          {assistance === "hard" || assistance === "demoHard"
            ? "Displayed camera freezes at the transition; raw carry-through remains recorded."
            : assistance === "soft"
              ? "Displayed camera is damped through the transition; raw input is not."
              : "Remove momentum before the smaller correction."}
        </strong>
        <button className="btn" onClick={() => go("history")}>
          End and review
        </button>
      </aside>
    </section>
  );
}
function History({
  sessions,
  trials,
  models,
}: {
  sessions: SessionRecord[];
  trials: TrialRecord[];
  models: SpatialModelSnapshot[];
}) {
  const [selected, setSelected] = useState<TrialRecord | null>(null);
  return (
    <>
      <div className="eyebrow">Session history and replay</div>
      <h1>Evidence stays attached to its conditions.</h1>
      {sessions.length === 0 ? (
        <Empty
          title="No sessions yet"
          body="Completed and interrupted sessions will appear here."
        />
      ) : (
        <div className="history-grid">
          <section className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Mode / view</th>
                  <th>Trials</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.startedAt).toLocaleDateString()}</td>
                    <td>{s.kind}</td>
                    <td>{s.status}</td>
                    <td>{s.mode ?? s.viewMode}</td>
                    <td>{s.trialIds.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="card">
            <h2>Selected repetition / raw path</h2>
            <select
              className="input"
              onChange={(e) =>
                setSelected(trials.find((t) => t.id === e.target.value) ?? null)
              }
              defaultValue=""
            >
              <option value="">Choose a trial</option>
              {trials.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.scenario} · {t.valid ? "valid" : "excluded"}
                </option>
              ))}
            </select>
            {selected ? (
              <>
                <div className="path-replay" aria-label="Raw path replay">
                  <svg
                    viewBox="-200 -120 400 240"
                    role="img"
                    aria-label="Integrated browser-delivered raw path"
                  >
                    <polyline
                      points={selected.rawSamples
                        .reduce(
                          (a, s) => {
                            const last = a.pos;
                            a.pos = { x: last.x + s.dx, y: last.y + s.dy };
                            a.points.push(`${a.pos.x},${a.pos.y}`);
                            return a;
                          },
                          { pos: { x: 0, y: 0 }, points: ["0,0"] } as {
                            pos: { x: number; y: number };
                            points: string[];
                          },
                        )
                        .points.join(" ")}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <p>
                  {selected.rawSamples.length} individual browser events ·{" "}
                  {selected.exclusionReasons.join(", ") || "no exclusions"}
                </p>
              </>
            ) : (
              <p className="muted">
                Select evidence to inspect it. This visualization is shown only
                after collection.
              </p>
            )}
          </section>
        </div>
      )}
      <section className="card">
        <h2>Official model timeline</h2>
        {models.length ? (
          models.map((m, i) => (
            <p key={m.id}>
              <strong>Snapshot {i + 1}</strong> · {m.confidence} confidence ·{" "}
              {m.sourceFormalAssessmentIds.length} formal assessment source
            </p>
          ))
        ) : (
          <p>No immutable snapshots yet.</p>
        )}
      </section>
    </>
  );
}
function Insights({
  model,
  go,
}: {
  model: SpatialModelSnapshot | null;
  go: (r: Route) => void;
}) {
  if (!model)
    return (
      <Empty
        title="Profile insights need formal evidence"
        body="Practice and training never update the official model."
        action="Begin formal assessment"
        onAction={() => go("dspds")}
      />
    );
  return (
    <>
      <div className="eyebrow">Profile insights</div>
      <h1>What your stored evidence supports.</h1>
      <div className="cards">
        {model.findings.map((f, i) => (
          <section className="card" key={i}>
            <span className="tag">{f.confidence} confidence</span>
            <h2>{f.text}</h2>
            <p>
              {f.sampleCount} contributing valid formal trials ·{" "}
              {f.metricIds.join(", ")}
            </p>
          </section>
        ))}
        <section className="card">
          <span className="tag tag--neutral">Normal restraint</span>
          <h2>Movement labels are not anatomical proof.</h2>
          <p>
            Similarity may be described as arm-like, wrist-like, fingertip-like,
            or unresolved only when evidence supports it.
          </p>
        </section>
      </div>
    </>
  );
}
function DataManager({
  repo,
  onNotice,
  onRefresh,
}: {
  repo: Repository | null;
  onNotice: (s: string) => void;
  onRefresh: () => void;
}) {
  const [preview, setPreview] = useState<string>("");
  const [pending, setPending] = useState<ExportBundle | null>(null);
  const load = async (file: File) => {
    if (!repo) return;
    try {
      const bundle = validateImport(JSON.parse(await file.text()));
      const p = await previewImport(repo, bundle);
      setPreview(
        `${Object.values(p.additions).reduce((a, b) => a + Number(b), 0)} additions; ${p.conflicts.length} conflicting IDs. Conflicts block the entire import.`,
      );
      setPending(p.conflicts.length ? null : bundle);
    } catch (e) {
      setPending(null);
      setPreview(`Import rejected without changing data: ${String(e)}`);
    }
  };
  return (
    <>
      <div className="eyebrow">Data management</div>
      <h1>Your data stays local until you export it.</h1>
      <div className="cards">
        <section className="card">
          <h2>Full export</h2>
          <p>
            Profiles, immutable equipment snapshots, raw browser events when
            retained, sessions, and models.
          </p>
          <button
            className="btn btn--primary"
            onClick={async () =>
              repo &&
              download(
                `dspds-full-${Date.now()}.json`,
                await createExport(repo, "full"),
              )
            }
          >
            Download full JSON
          </button>
        </section>
        <section className="card">
          <h2>Summary export</h2>
          <p>History and analyzed records without raw event arrays.</p>
          <button
            className="btn"
            onClick={async () =>
              repo &&
              download(
                `dspds-summary-${Date.now()}.json`,
                await createExport(repo, "summary"),
              )
            }
          >
            Download summary JSON
          </button>
        </section>
        <section className="card">
          <h2>Validated import</h2>
          <p>
            Known schema versions only. Conflicts are reported and existing
            records are never silently overwritten.
          </p>
          <label className="btn file">
            Choose JSON
            <input
              type="file"
              accept="application/json"
              onChange={(e) => e.target.files?.[0] && load(e.target.files[0])}
            />
          </label>
          {preview && <p role="status">{preview}</p>}
          {pending && (
            <button
              className="btn"
              onClick={async () => {
                try {
                  if (!repo) return;
                  await importMissing(repo, pending);
                  setPending(null);
                  await onRefresh();
                  onNotice("Import committed atomically.");
                } catch (e) {
                  setPreview(
                    `Import failed; transaction committed no new records: ${String(e)}`,
                  );
                }
              }}
            >
              Commit validated import
            </button>
          )}
        </section>
      </div>
      <section className="card warning">
        <h2>Deletion</h2>
        <p>
          Deletion is intentionally not offered in this experimental build
          because the final recoverable-deletion transaction is not complete.
          Export remains available.
        </p>
      </section>
    </>
  );
}
function Settings({
  equipment,
  repo,
  onChange,
}: {
  equipment: EquipmentProfile | null;
  repo: Repository | null;
  onChange: (e: EquipmentProfile) => void;
}) {
  const [runs, setRuns] = useState(equipment?.calibrationRuns ?? []);
  if (!equipment) return null;
  const update = async (e: EquipmentProfile) => {
    await repo?.put("equipment", e);
    onChange(e);
  };
  const summary = calibrationSummary(runs);
  return (
    <>
      <div className="eyebrow">Input and view setup</div>
      <h1>Explicit quantities, never silent changes.</h1>
      <section className="card form">
        <div className="form__row">
          <label>
            DPI
            <input
              className="input"
              type="number"
              value={equipment.dpi ?? ""}
              onChange={(ev) => {
                const dpi = Number(ev.target.value) || null;
                update({
                  ...equipment,
                  dpi,
                  degreesPerRawCount:
                    dpi && equipment.selectedCmPer360
                      ? degreesPerRawCount(dpi, equipment.selectedCmPer360)
                      : null,
                  verification: dpi ? "calculated" : "relative-only",
                  updatedAt: now(),
                  recalibrationRecommended: true,
                });
              }}
            />
          </label>
          <label>
            Selected cm/360
            <input
              className="input"
              type="number"
              value={equipment.selectedCmPer360 ?? ""}
              onChange={(ev) => {
                const cm = Number(ev.target.value) || null;
                update({
                  ...equipment,
                  selectedCmPer360: cm,
                  degreesPerRawCount:
                    equipment.dpi && cm
                      ? degreesPerRawCount(equipment.dpi, cm)
                      : null,
                  updatedAt: now(),
                  recalibrationRecommended: true,
                });
              }}
            />
          </label>
          <label>
            Vertical FOV
            <input
              className="input"
              min="60"
              max="120"
              type="number"
              value={equipment.verticalFovDeg}
              onChange={(ev) => {
                const fov = Number(ev.target.value);
                update({
                  ...equipment,
                  verticalFovDeg: fov,
                  horizontalFovDeg: horizontalFovDeg(fov),
                  updatedAt: now(),
                });
              }}
            />
          </label>
        </div>
        <p>
          Derived horizontal 16:9 FOV:{" "}
          <strong>{equipment.horizontalFovDeg.toFixed(2)}°</strong>. FOV never
          changes {equipment.degreesPerRawCount?.toFixed(6) ?? "relative"}{" "}
          degrees per raw count.
        </p>
      </section>
      <section className="card">
        <h2>Optional physical cm/360 verification</h2>
        <p>
          Complete three 360° runs, then enter browser-delivered horizontal
          counts and measured mouse travel. This records verification but never
          changes selected sensitivity without approval.
        </p>
        {[0, 1, 2].map((i) => (
          <div className="form__row" key={i}>
            <label>
              Run {i + 1} counts
              <input
                className="input"
                type="number"
                value={runs[i]?.counts ?? ""}
                onChange={(e) => {
                  const n = [...runs];
                  n[i] = {
                    counts: Number(e.target.value),
                    distanceCm: n[i]?.distanceCm ?? 0,
                  };
                  setRuns(n);
                }}
              />
            </label>
            <label>
              Distance cm
              <input
                className="input"
                type="number"
                step="0.1"
                value={runs[i]?.distanceCm ?? ""}
                onChange={(e) => {
                  const n = [...runs];
                  n[i] = {
                    counts: n[i]?.counts ?? 0,
                    distanceCm: Number(e.target.value),
                  };
                  setRuns(n);
                }}
              />
            </label>
          </div>
        ))}
        <button
          className="btn btn--primary"
          disabled={runs.length < 3 || summary.countsPerCm === null}
          onClick={() =>
            update({
              ...equipment,
              calibrationRuns: runs,
              countsPerCm: summary.countsPerCm,
              measuredCmPer360: summary.measuredCmPer360,
              verification: "physically-verified",
              updatedAt: now(),
            })
          }
        >
          Save verification
        </button>
        {summary.countsPerCm && (
          <p>
            {summary.measuredCmPer360?.toFixed(2)} cm median ·{" "}
            {summary.countsPerCm.toFixed(1)} counts/cm ·{" "}
            {summary.estimatedEffectiveDpi?.toFixed(0)} estimated effective DPI{" "}
            {summary.provisionalHighVariation
              ? "· high variation: retry recommended"
              : ""}
          </p>
        )}
      </section>
    </>
  );
}
function Empty({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <section className="empty">
      <div aria-hidden="true">◇</div>
      <h1>{title}</h1>
      <p>{body}</p>
      {action && (
        <button className="btn btn--primary" onClick={onAction}>
          {action}
        </button>
      )}
    </section>
  );
}
