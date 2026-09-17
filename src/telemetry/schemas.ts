import type { DEFAULTS } from "../config/defaults";

export type InputMode = "unadjusted" | "adjusted-fallback" | "unlocked";
export type ValidityFlag =
  "valid" | "gap" | "focus-loss" | "lock-loss" | "overflow";
export interface RawInputSample {
  sequence: number;
  timestampMs: number;
  dx: number;
  dy: number;
  buttons: number;
  pointerLocked: boolean;
  inputMode: InputMode;
  validity: ValidityFlag;
}
export interface DisplaySample {
  timestampMs: number;
  yawDeg: number;
  pitchDeg: number;
  assistance: Assistance;
}
export type ScenarioId =
  | "single"
  | "chain"
  | "predictableTrack"
  | "dynamicStatic"
  | "dynamicCamera"
  | "line";
export type SessionMode = "formal" | "practice";
export type CompletionMode = "automatic" | "click" | "autoWithClickFailsafe";
export type Assistance =
  "demoHard" | "hard" | "reducedHard" | "soft" | "cue" | "none";
export interface EquipmentSnapshot {
  schemaVersion: 1;
  id: string;
  mouseName: string;
  dpi: number | null;
  selectedCmPer360: number | null;
  measuredCmPer360: number | null;
  countsPerCm: number | null;
  verification: "relative-only" | "calculated" | "physically-verified";
  verticalFovDeg: number;
  horizontalFovDeg: number;
  degreesPerRawCount: number | null;
  viewMode: "firstPerson" | "thirdPerson";
}
export interface MetricValue {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  definition: string;
  algorithmVersion: string;
  validConditions: string;
  aggregation: string;
  limitations: string;
}
export interface TrialRecord {
  schemaVersion: 1;
  id: string;
  sessionId: string;
  scenario: ScenarioId;
  scenarioVersion: string;
  mode: SessionMode;
  seed: string;
  intended: {
    xDeg: number;
    yDeg: number;
    path?: Array<{ tMs: number; xDeg: number; yDeg: number }>;
  };
  completionMode: CompletionMode;
  completionReason: "settled" | "click" | "timeout" | "technicalInvalid";
  capture?: {
    policyVersion: string;
    valid: boolean;
    exclusions: string[];
    qualifications: string[];
    overflow: number;
    startedAtMs: number;
    endedAtMs: number;
  };
  rawSamples: RawInputSample[];
  displayedTrace?: DisplaySample[];
  assistance?: Assistance;
  valid: boolean;
  exclusionReasons: string[];
  metrics: MetricValue[];
  createdAt: string;
}
export interface SessionRecord {
  schemaVersion: 1;
  id: string;
  kind: "dspds" | "baseline" | "formBlend";
  mode?: SessionMode;
  protocolVersion: string;
  seed: string;
  status: "in-progress" | "completed" | "interrupted";
  trialIds: string[];
  equipment: EquipmentSnapshot;
  startedAt: string;
  completedAt: string | null;
  recovery: { recovered: boolean; lastCompletedTrialId: string | null };
  viewMode: "firstPerson" | "thirdPerson";
}
export interface SpatialModelSnapshot {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  analysisVersion?: string;
  sourceTrialIds?: string[];
  rangeMeaning?: string;
  conditions?: Array<{
    condition: string;
    trialIds: string[];
    count: number;
    median: number;
    mad: number;
    unit: string;
  }>;
  sourceFormalAssessmentIds: string[];
  latestAssessmentId: string;
  confidence: "Low" | "Moderate" | "High";
  sufficiency: "insufficient" | "provisional" | "sufficient";
  countsPerDegree: {
    central: number | null;
    micro: number | null;
    small: number | null;
    medium: number | null;
    large: number | null;
  };
  impliedCmPer360: { low: number; central: number; high: number } | null;
  findings: Array<{
    text: string;
    metricIds: string[];
    sampleCount: number;
    confidence: "Low" | "Moderate" | "High";
  }>;
}
export interface UserProfile {
  schemaVersion: 1;
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  activeEquipmentId: string;
  preferences: { reducedMotion: boolean; textScale: number };
}
export interface EquipmentProfile extends EquipmentSnapshot {
  userId: string;
  updatedAt: string;
  calibrationRuns: Array<{ counts: number; distanceCm: number }>;
  recalibrationRecommended: boolean;
}
export interface ExportBundle {
  format: "form-blend-dspds-export";
  schemaVersion: 1;
  appVersion: string;
  exportedAt: string;
  scope: "full" | "summary";
  entities: {
    profiles: UserProfile[];
    equipment: EquipmentProfile[];
    sessions: SessionRecord[];
    trials: TrialRecord[];
    models: SpatialModelSnapshot[];
  };
  counts: Record<string, number>;
}
export type Defaults = typeof DEFAULTS;
