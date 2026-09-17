export const DEFAULTS = {
  input: {
    dpi: 1600,
    cmPer360: 40,
    verticalFovDeg: 90,
    viewMode: "firstPerson" as const,
    dspdsCompletionMode: "autoWithClickFailsafe" as const,
  },
  dspds: {
    formalTargetMinutes: 11,
    settleWindowMs: 150,
    completionTimeoutMs: 3000,
    singleAnglesDeg: [2, 4, 8, 12, 18, 27, 40] as const,
    chainLength: [5, 8] as const,
    cameraSnapMs: 100,
    predictableCycles: 2.5,
    currentModelSnapshotCount: 3,
    recencyWeights: [1, 1.5, 2] as const,
  },
  baseline: {
    armReps: 16,
    wristReps: 16,
    fingertipReps: 20,
    freestyleReps: 24,
  },
  formBlend: {
    onboardingMaxReps: 20,
    assistedStages: [
      "demoHard",
      "hard",
      "reducedHard",
      "soft",
      "cue",
      "none",
    ] as const,
  },
  storage: { rawSessionRetentionMinimum: 100 },
} as const;
export const APP_VERSION = "1.0.0-experiment";
export const SCHEMA_VERSION = 1;
export const PROTOCOL_VERSION = "dspds-2.0.0";
export const ANALYSIS_VERSION = "analysis-2.0.0-descriptive";
