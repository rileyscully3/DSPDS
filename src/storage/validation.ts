import type { ExportBundle } from "../telemetry/schemas";
type Check = (value: unknown, path: string) => void;
const fail = (p: string): never => {
  throw new Error(`Invalid import: ${p}`);
};
const str: Check = (v, p) => {
  if (typeof v !== "string") fail(p);
};
const id: Check = (v, p) => {
  str(v, p);
  if (!v) fail(p);
};
const num: Check = (v, p) => {
  if (typeof v !== "number" || !Number.isFinite(v)) fail(p);
};
const positive: Check = (v, p) => {
  num(v, p);
  if ((v as number) <= 0) fail(p);
};
const integer: Check = (v, p) => {
  num(v, p);
  if (!Number.isInteger(v) || (v as number) < 0) fail(p);
};
const bool: Check = (v, p) => {
  if (typeof v !== "boolean") fail(p);
};
const date: Check = (v, p) => {
  str(v, p);
  if (!Number.isFinite(Date.parse(v as string))) fail(p);
};
const nullable =
  (check: Check): Check =>
  (v, p) => {
    if (v !== null) check(v, p);
  };
const optional =
  (check: Check): Check =>
  (v, p) => {
    if (v !== undefined) check(v, p);
  };
const one =
  (...values: unknown[]): Check =>
  (v, p) => {
    if (!values.includes(v)) fail(p);
  };
const array =
  (check: Check): Check =>
  (v, p) => {
    if (!Array.isArray(v)) fail(p);
    (v as unknown[]).forEach((x, i) => check(x, `${p}[${i}]`));
  };
const object =
  (shape: Record<string, Check>): Check =>
  (v, p) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) fail(p);
    for (const [key, check] of Object.entries(shape))
      check((v as Record<string, unknown>)[key], `${p}.${key}`);
  };
const base = { id, schemaVersion: one(1) };
const view = one("firstPerson", "thirdPerson"),
  mode = one("formal", "practice"),
  assistance = one("demoHard", "hard", "reducedHard", "soft", "cue", "none");
const equipmentShape = {
  ...base,
  mouseName: str,
  dpi: nullable(positive),
  selectedCmPer360: nullable(positive),
  measuredCmPer360: nullable(positive),
  countsPerCm: nullable(positive),
  verification: one("relative-only", "calculated", "physically-verified"),
  verticalFovDeg: ((v, p) => {
    num(v, p);
    if ((v as number) < 60 || (v as number) > 120) fail(p);
  }) as Check,
  horizontalFovDeg: positive,
  degreesPerRawCount: nullable(positive),
  viewMode: view,
};
const sample = object({
  sequence: integer,
  timestampMs: num,
  dx: num,
  dy: num,
  buttons: integer,
  pointerLocked: bool,
  inputMode: one("unadjusted", "adjusted-fallback", "unlocked"),
  validity: one("valid", "gap", "focus-loss", "lock-loss", "overflow"),
});
const metric = object({
  id,
  label: str,
  value: nullable(num),
  unit: id,
  definition: str,
  algorithmVersion: id,
  validConditions: str,
  aggregation: str,
  limitations: str,
});
const validators: Record<keyof ExportBundle["entities"], Check> = {
  profiles: object({
    ...base,
    displayName: str,
    createdAt: date,
    updatedAt: date,
    activeEquipmentId: id,
    preferences: object({ reducedMotion: bool, textScale: positive }),
  }),
  equipment: object({
    ...equipmentShape,
    userId: id,
    updatedAt: date,
    calibrationRuns: array(object({ counts: num, distanceCm: positive })),
    recalibrationRecommended: bool,
  }),
  sessions: object({
    ...base,
    kind: one("dspds", "baseline", "formBlend"),
    mode: optional(mode),
    protocolVersion: id,
    seed: id,
    status: one("in-progress", "completed", "interrupted"),
    trialIds: array(id),
    equipment: object(equipmentShape),
    startedAt: date,
    completedAt: nullable(date),
    recovery: object({ recovered: bool, lastCompletedTrialId: nullable(id) }),
    viewMode: view,
  }),
  trials: object({
    ...base,
    sessionId: id,
    scenario: one(
      "single",
      "chain",
      "predictableTrack",
      "dynamicStatic",
      "dynamicCamera",
      "line",
    ),
    scenarioVersion: id,
    mode,
    seed: id,
    intended: object({
      xDeg: num,
      yDeg: num,
      path: optional(array(object({ tMs: num, xDeg: num, yDeg: num }))),
    }),
    completionMode: one("automatic", "click", "autoWithClickFailsafe"),
    completionReason: one("settled", "click", "timeout", "technicalInvalid"),
    rawSamples: array(sample),
    displayedTrace: optional(
      array(
        object({ timestampMs: num, yawDeg: num, pitchDeg: num, assistance }),
      ),
    ),
    assistance: optional(assistance),
    valid: bool,
    exclusionReasons: array(str),
    metrics: array(metric),
    createdAt: date,
    capture: optional(
      object({
        policyVersion: one("capture-2.0.0"),
        valid: bool,
        exclusions: array(str),
        qualifications: array(str),
        overflow: integer,
        startedAtMs: num,
        endedAtMs: num,
      }),
    ),
  }),
  models: object({
    ...base,
    createdAt: date,
    sourceFormalAssessmentIds: array(id),
    latestAssessmentId: id,
    confidence: one("Low", "Moderate", "High"),
    sufficiency: one("insufficient", "provisional", "sufficient"),
    countsPerDegree: object({
      central: nullable(num),
      micro: nullable(num),
      small: nullable(num),
      medium: nullable(num),
      large: nullable(num),
    }),
    impliedCmPer360: nullable(object({ low: num, central: num, high: num })),
    findings: array(
      object({
        text: str,
        metricIds: array(id),
        sampleCount: integer,
        confidence: one("Low", "Moderate", "High"),
      }),
    ),
    analysisVersion: optional(id),
    sourceTrialIds: optional(array(id)),
    rangeMeaning: optional(str),
    conditions: optional(
      array(
        object({
          condition: id,
          trialIds: array(id),
          count: integer,
          median: num,
          mad: num,
          unit: id,
        }),
      ),
    ),
  }),
};
export function validateEntities(value: unknown): ExportBundle {
  object({
    format: one("form-blend-dspds-export"),
    schemaVersion: one(1),
    appVersion: id,
    exportedAt: date,
    scope: one("full", "summary"),
    entities: object(
      Object.fromEntries(
        Object.entries(validators).map(([k, v]) => [k, array(v)]),
      ),
    ),
    counts: object(
      Object.fromEntries(Object.keys(validators).map((k) => [k, integer])),
    ),
  })(value, "bundle");
  const b = value as ExportBundle,
    e = b.entities;
  for (const name of Object.keys(validators) as Array<keyof typeof e>) {
    if (new Set(e[name].map((x) => x.id)).size !== e[name].length)
      fail(`${name}: duplicate IDs`);
    if (b.counts[name] !== e[name].length) fail(`${name}: count mismatch`);
  }
  const profiles = new Map(e.profiles.map((p) => [p.id, p])),
    equipment = new Map(e.equipment.map((p) => [p.id, p])),
    sessions = new Map(e.sessions.map((s) => [s.id, s])),
    trials = new Map(e.trials.map((t) => [t.id, t]));
  for (const p of e.profiles)
    if (equipment.get(p.activeEquipmentId)?.userId !== p.id)
      fail("active equipment reference");
  for (const p of e.equipment)
    if (!profiles.has(p.userId)) fail("equipment owner");
  for (const s of e.sessions) {
    if (!equipment.has(s.equipment.id)) fail("session equipment reference");
    if (s.kind === "dspds" && (!s.mode || s.viewMode !== "firstPerson"))
      fail("DSPDS provenance");
    if (s.status === "completed" && !s.completedAt) fail("completion time");
    if (new Set(s.trialIds).size !== s.trialIds.length)
      fail("duplicate session trial");
    for (const tid of s.trialIds)
      if (trials.get(tid)?.sessionId !== s.id) fail("session trial reference");
    if (
      s.recovery.lastCompletedTrialId !== null &&
      s.recovery.lastCompletedTrialId !== s.trialIds.at(-1)
    )
      fail("recovery progress");
  }
  for (const t of e.trials) {
    const s = sessions.get(t.sessionId);
    if (!s || !s.trialIds.includes(t.id) || s.mode !== t.mode)
      fail("trial session/mode reference");
    if (
      t.rawSamples.some(
        (v, i) =>
          i > 0 &&
          (v.sequence <= t.rawSamples[i - 1]!.sequence ||
            v.timestampMs < t.rawSamples[i - 1]!.timestampMs),
      )
    )
      fail("raw sample ordering");
    if (
      t.valid &&
      (t.completionReason === "technicalInvalid" || t.exclusionReasons.length)
    )
      fail("contradictory validity");
    if (
      t.capture &&
      (t.capture.valid !== t.valid || (t.capture.overflow > 0 && t.valid))
    )
      fail("capture validity");
  }
  for (const m of e.models) {
    if (!m.sourceFormalAssessmentIds.includes(m.latestAssessmentId))
      fail("latest assessment reference");
    for (const sid of m.sourceFormalAssessmentIds) {
      const s = sessions.get(sid);
      if (
        !s ||
        s.kind !== "dspds" ||
        s.mode !== "formal" ||
        s.status !== "completed"
      )
        fail("official model source provenance");
    }
    for (const tid of m.sourceTrialIds ?? []) {
      const t = trials.get(tid);
      if (
        !t ||
        !m.sourceFormalAssessmentIds.includes(t.sessionId) ||
        t.mode !== "formal"
      )
        fail("model evidence reference");
    }
    if (
      m.impliedCmPer360 &&
      !(
        m.impliedCmPer360.low <= m.impliedCmPer360.central &&
        m.impliedCmPer360.central <= m.impliedCmPer360.high
      )
    )
      fail("range ordering");
  }
  return structuredClone(b);
}
