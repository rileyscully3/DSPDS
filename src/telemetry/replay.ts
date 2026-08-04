import type {
  InterruptionMarker,
  RawInputSample,
} from "../input/contracts";
import {
  assertM1SessionExport,
  type M1SessionExport,
} from "./m1Session";

export interface ReplayTotals {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly absoluteDeltaX: number;
  readonly absoluteDeltaY: number;
  readonly buttonsObserved: number;
  readonly sampleCount: number;
  readonly interruptionCount: number;
}

export type ReplayStreamRecord =
  | { readonly kind: "sample"; readonly record: RawInputSample }
  | { readonly kind: "interruption"; readonly record: InterruptionMarker };

export interface M1Replay {
  readonly source: "synthetic-or-replayed-non-physical-evidence";
  readonly captureId: string;
  readonly samples: readonly RawInputSample[];
  readonly interruptions: readonly InterruptionMarker[];
  readonly orderedStream: readonly ReplayStreamRecord[];
  readonly totals: ReplayTotals;
}

export interface ReplayPresentationPoint {
  readonly sequence: number;
  readonly presentationOffsetMs: number;
  readonly rawCaptureTimestampMs: number;
  readonly dx: number;
  readonly dy: number;
}

export function replayM1Session(session: M1SessionExport): M1Replay {
  assertM1SessionExport(session);
  let deltaX = 0;
  let deltaY = 0;
  let absoluteDeltaX = 0;
  let absoluteDeltaY = 0;
  let buttonsObserved = 0;
  for (const sample of session.samples) {
    deltaX += sample.dx;
    deltaY += sample.dy;
    absoluteDeltaX += Math.abs(sample.dx);
    absoluteDeltaY += Math.abs(sample.dy);
    buttonsObserved |= sample.buttons;
  }
  const orderedStream: ReplayStreamRecord[] = [
    ...session.samples.map(
      (record): ReplayStreamRecord => ({ kind: "sample", record }),
    ),
    ...session.interruptions.map(
      (record): ReplayStreamRecord => ({ kind: "interruption", record }),
    ),
  ];
  orderedStream.sort(
    (left, right) => left.record.sequence - right.record.sequence,
  );
  return Object.freeze({
    source: "synthetic-or-replayed-non-physical-evidence",
    captureId: session.captureId,
    samples: session.samples,
    interruptions: session.interruptions,
    orderedStream: Object.freeze(orderedStream),
    totals: Object.freeze({
      deltaX,
      deltaY,
      absoluteDeltaX,
      absoluteDeltaY,
      buttonsObserved,
      sampleCount: session.samples.length,
      interruptionCount: session.interruptions.length,
    }),
  });
}

export function createReplayPresentation(
  session: M1SessionExport,
  speed: number,
): readonly ReplayPresentationPoint[] {
  assertM1SessionExport(session);
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new RangeError("Replay speed must be greater than zero.");
  }
  const firstTimestamp = session.samples[0]?.captureTimestampMs ?? 0;
  return Object.freeze(
    session.samples.map((sample) =>
      Object.freeze({
        sequence: sample.sequence,
        presentationOffsetMs:
          (sample.captureTimestampMs - firstTimestamp) / speed,
        rawCaptureTimestampMs: sample.captureTimestampMs,
        dx: sample.dx,
        dy: sample.dy,
      }),
    ),
  );
}
