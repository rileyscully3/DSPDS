import type {
  InputCadenceSummary,
  RenderCadenceSummary,
} from "./contracts";

function median(values: Float64Array, length: number): number | null {
  if (length === 0) return null;
  const sorted = values.slice(0, length);
  sorted.sort();
  const middle = Math.floor(length / 2);
  if (length % 2 === 1) return sorted[middle] ?? null;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

export class InputCadenceCollector {
  private readonly intervals: Float64Array;
  private sampleCount = 0;
  private intervalCount = 0;
  private firstTimestampMs = 0;
  private lastTimestampMs = 0;
  private maximumGapMs = 0;
  private suspiciousGapCount = 0;

  constructor(maxSamples: number) {
    this.intervals = new Float64Array(Math.max(maxSamples - 1, 0));
  }

  record(timestampMs: number, suspicious: boolean): void {
    if (this.sampleCount === 0) {
      this.firstTimestampMs = timestampMs;
    } else {
      const interval = Math.max(0, timestampMs - this.lastTimestampMs);
      this.intervals[this.intervalCount] = interval;
      this.intervalCount += 1;
      if (interval > this.maximumGapMs) this.maximumGapMs = interval;
    }
    this.lastTimestampMs = timestampMs;
    this.sampleCount += 1;
    if (suspicious) this.suspiciousGapCount += 1;
  }

  reset(): void {
    this.sampleCount = 0;
    this.intervalCount = 0;
    this.firstTimestampMs = 0;
    this.lastTimestampMs = 0;
    this.maximumGapMs = 0;
    this.suspiciousGapCount = 0;
  }

  snapshot(
    rejectedSampleCount: number,
    overflowed: boolean,
  ): InputCadenceSummary {
    const observedDurationMs =
      this.sampleCount > 1
        ? this.lastTimestampMs - this.firstTimestampMs
        : 0;
    return Object.freeze({
      acceptedSampleCount: this.sampleCount,
      intervalCount: this.intervalCount,
      eventsPerSecond:
        observedDurationMs > 0
          ? ((this.sampleCount - 1) * 1000) / observedDurationMs
          : 0,
      medianIntervalMs: median(this.intervals, this.intervalCount),
      maximumGapMs:
        this.intervalCount === 0 ? null : this.maximumGapMs,
      suspiciousGapCount: this.suspiciousGapCount,
      rejectedSampleCount,
      overflowed,
    });
  }
}

const DEFAULT_FRAME_CAPACITY = 65_536;

export class RenderCadenceCollector {
  private readonly intervals: Float64Array;
  private frameCount = 0;
  private intervalCount = 0;
  private firstTimestampMs = 0;
  private lastTimestampMs = 0;
  private maximumFrameGapMs = 0;
  private longTaskCount = 0;
  private maximumLongTaskMs = 0;
  private observer: PerformanceObserver | null = null;
  private readonly longTaskSupported: boolean;

  constructor(frameCapacity = DEFAULT_FRAME_CAPACITY) {
    this.intervals = new Float64Array(Math.max(frameCapacity - 1, 0));
    this.longTaskSupported =
      typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes?.includes("longtask") === true;
  }

  recordFrame(timestampMs: number): void {
    if (this.frameCount === 0) {
      this.firstTimestampMs = timestampMs;
    } else if (this.intervalCount < this.intervals.length) {
      const interval = Math.max(0, timestampMs - this.lastTimestampMs);
      this.intervals[this.intervalCount] = interval;
      this.intervalCount += 1;
      if (interval > this.maximumFrameGapMs) {
        this.maximumFrameGapMs = interval;
      }
    }
    this.lastTimestampMs = timestampMs;
    this.frameCount += 1;
  }

  observeLongTasks(): void {
    if (!this.longTaskSupported || this.observer) return;
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.longTaskCount += 1;
        if (entry.duration > this.maximumLongTaskMs) {
          this.maximumLongTaskMs = entry.duration;
        }
      }
    });
    this.observer.observe({ entryTypes: ["longtask"] });
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  reset(): void {
    this.frameCount = 0;
    this.intervalCount = 0;
    this.firstTimestampMs = 0;
    this.lastTimestampMs = 0;
    this.maximumFrameGapMs = 0;
    this.longTaskCount = 0;
    this.maximumLongTaskMs = 0;
  }

  snapshot(): RenderCadenceSummary {
    const durationMs =
      this.frameCount > 1 ? this.lastTimestampMs - this.firstTimestampMs : 0;
    return Object.freeze({
      frameCount: this.frameCount,
      intervalCount: this.intervalCount,
      framesPerSecond:
        durationMs > 0 ? ((this.frameCount - 1) * 1000) / durationMs : 0,
      medianIntervalMs: median(this.intervals, this.intervalCount),
      maximumFrameGapMs:
        this.intervalCount === 0 ? null : this.maximumFrameGapMs,
      longTaskCount: this.longTaskCount,
      maximumLongTaskMs:
        this.longTaskCount === 0 ? null : this.maximumLongTaskMs,
      longTaskApiSupported: this.longTaskSupported,
    });
  }
}
