import { BrowserEventAdapter } from "./browserEventAdapter";
import { RenderCadenceCollector } from "./cadence";
import type {
  RecorderDiagnostics,
  RecordingSnapshot,
  RenderCadenceSummary,
} from "./contracts";
import { InputRecorder, type InputRecorderOptions } from "./inputRecorder";
import {
  PointerLockController,
  createBrowserPointerLockAdapter,
  type PointerLockAdapter,
  type PointerLockSnapshot,
} from "./pointerLockController";

export interface InputDiagnosticSnapshot {
  readonly recording: RecorderDiagnostics;
  readonly pointerLock: PointerLockSnapshot;
  readonly renderCadence: RenderCadenceSummary;
}

export interface InputDiagnosticSessionOptions {
  readonly recorder?: InputRecorderOptions;
  readonly pointerLockAdapter?: PointerLockAdapter;
  readonly documentTarget?: Document;
  readonly windowTarget?: Window;
  readonly performanceNow?: () => number;
  readonly unixNow?: () => number;
}

export class InputDiagnosticSession {
  readonly recorder: InputRecorder;
  readonly renderCadence = new RenderCadenceCollector();
  readonly pointerLock: PointerLockController;
  private readonly browserEvents: BrowserEventAdapter;
  private readonly performanceNow: () => number;
  private readonly unixNow: () => number;
  private disposed = false;

  constructor(
    pointerLockElement: Element,
    options: InputDiagnosticSessionOptions = {},
  ) {
    this.performanceNow = options.performanceNow ?? (() => performance.now());
    this.unixNow = options.unixNow ?? (() => Date.now());
    this.recorder = new InputRecorder(options.recorder);
    this.browserEvents = new BrowserEventAdapter(this.recorder, {
      documentTarget: options.documentTarget ?? document,
      windowTarget: options.windowTarget ?? window,
      performanceNow: this.performanceNow,
      unixNow: this.unixNow,
    });
    this.pointerLock = new PointerLockController(
      pointerLockElement,
      options.pointerLockAdapter ??
        createBrowserPointerLockAdapter(options.documentTarget ?? document),
      {
        onChange: (snapshot) => {
          if (
            snapshot.activeMode &&
            !this.recorder.isRecording
          ) {
            this.renderCadence.reset();
            this.renderCadence.observeLongTasks();
            this.recorder.start(
              snapshot.activeMode,
              this.unixNow(),
              this.performanceNow(),
            );
          }
        },
        onUnexpectedLoss: () => {
          this.recorder.interrupt(
            "pointer-lock-loss",
            this.unixNow(),
            this.performanceNow(),
          );
          this.renderCadence.disconnect();
        },
        onError: () => {
          this.recorder.interrupt(
            "pointer-lock-error",
            this.unixNow(),
            this.performanceNow(),
          );
          this.renderCadence.disconnect();
        },
      },
    );
  }

  requestUnadjustedFromUserGesture(): Promise<void> {
    this.assertUsable();
    return this.pointerLock.requestUnadjustedFromUserGesture();
  }

  requestAdjustedFromUserGesture(): Promise<void> {
    this.assertUsable();
    return this.pointerLock.requestAdjustedFromUserGesture();
  }

  recordFrame(timestampMs: number): void {
    if (this.recorder.isRecording) {
      this.renderCadence.recordFrame(timestampMs);
    }
  }

  stop(): void {
    this.recorder.stop(this.unixNow(), this.performanceNow());
    this.renderCadence.disconnect();
    this.pointerLock.exit();
  }

  cancel(): void {
    this.recorder.interrupt(
      "user-cancelled",
      this.unixNow(),
      this.performanceNow(),
    );
    this.renderCadence.disconnect();
    this.pointerLock.exit();
  }

  reset(): void {
    this.recorder.reset();
    this.renderCadence.reset();
  }

  diagnostics(): InputDiagnosticSnapshot {
    return Object.freeze({
      recording: this.recorder.diagnostics(),
      pointerLock: this.pointerLock.snapshot(),
      renderCadence: this.renderCadence.snapshot(),
    });
  }

  recordingSnapshot(): RecordingSnapshot {
    return this.recorder.snapshot();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.browserEvents.dispose();
    this.pointerLock.dispose();
    this.renderCadence.disconnect();
  }

  private assertUsable(): void {
    if (this.disposed) throw new Error("Input diagnostic session is disposed.");
  }
}
