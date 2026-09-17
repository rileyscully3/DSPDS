import { DEFAULTS, PROTOCOL_VERSION } from "../config/defaults";
import type { ScenarioId } from "../telemetry/schemas";
export class SeededRandom {
  private state: number;
  constructor(seed: string) {
    this.state =
      [...seed].reduce(
        (a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619),
        2166136261,
      ) >>> 0;
  }
  next() {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state / 4294967296;
  }
  pick<T>(items: readonly T[]) {
    return items[Math.floor(this.next() * items.length)]!;
  }
  shuffle<T>(items: readonly T[]) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  }
}
export interface TrialGeometry {
  scenario: ScenarioId;
  xDeg: number;
  yDeg: number;
  path: Array<{ tMs: number; xDeg: number; yDeg: number }>;
  family: string;
}
const directions = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.707, 0.707],
  [-0.707, 0.707],
  [0.707, -0.707],
  [-0.707, -0.707],
] as const;
export function generateProtocol(seed: string): TrialGeometry[] {
  const r = new SeededRandom(seed);
  const out: TrialGeometry[] = [];
  for (const angle of DEFAULTS.dspds.singleAnglesDeg)
    for (let n = 0; n < 2; n++) {
      const d = r.pick(directions);
      out.push({
        scenario: "single",
        xDeg: d[0] * angle,
        yDeg: d[1] * angle,
        path: [],
        family: `${angle}deg`,
      });
    }
  for (let n = 0; n < 12; n++) {
    const d = r.pick(directions),
      a = r.pick([6, 12, 24] as const);
    out.push({
      scenario: "chain",
      xDeg: d[0] * a,
      yDeg: d[1] * a,
      path: [],
      family: n % 3 === 0 ? "reversal" : "continuation",
    });
  }
  for (const scenario of [
    "predictableTrack",
    "dynamicStatic",
    "dynamicCamera",
  ] as const)
    for (let n = 0; n < 4; n++) {
      const path = Array.from({ length: 151 }, (_, i) => {
        const t = i * 20,
          phase = (i / 150) * Math.PI * 5;
        return {
          tMs: t,
          xDeg: Math.sin(phase) * 14,
          yDeg:
            scenario === "predictableTrack"
              ? Math.sin(phase * 0.5) * 2
              : Math.sin(phase * 0.63) * 5,
        };
      });
      out.push({
        scenario,
        xDeg: 0,
        yDeg: 0,
        path,
        family: n % 2 ? "constant-speed" : "sinusoidal",
      });
    }
  for (const a of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const length = r.pick([8, 18, 32] as const),
      rad = (a * Math.PI) / 180;
    out.push({
      scenario: "line",
      xDeg: Math.cos(rad) * length,
      yDeg: Math.sin(rad) * length,
      path: Array.from({ length: 61 }, (_, i) => ({
        tMs: i * 25,
        xDeg: (Math.cos(rad) * length * i) / 60,
        yDeg: (Math.sin(rad) * length * i) / 60,
      })),
      family: `${a}deg`,
    });
  }
  return r.shuffle(out);
}
export const protocolMetadata = {
  version: PROTOCOL_VERSION,
  notes:
    "Seeded angular geometry; formal target counts are protocol implementation constants, not validated scientific thresholds.",
};
