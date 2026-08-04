import type { InputRecorder } from "./inputRecorder";

export interface BrowserEventAdapterOptions {
  readonly documentTarget?: Document;
  readonly windowTarget?: Window;
  readonly performanceNow?: () => number;
  readonly unixNow?: () => number;
}

export class BrowserEventAdapter {
  private readonly documentTarget: Document;
  private readonly windowTarget: Window;
  private readonly performanceNow: () => number;
  private readonly unixNow: () => number;
  private disposed = false;
  private readonly onMouseMove = (event: MouseEvent) => {
    this.recorder.record(
      event.timeStamp,
      this.performanceNow(),
      event.movementX,
      event.movementY,
      event.buttons,
    );
  };
  private readonly onBlur = () => {
    this.recorder.interrupt(
      "window-blur",
      this.unixNow(),
      this.performanceNow(),
    );
  };
  private readonly onVisibilityChange = () => {
    if (this.documentTarget.visibilityState === "hidden") {
      this.recorder.interrupt(
        "visibility-hidden",
        this.unixNow(),
        this.performanceNow(),
      );
    }
  };

  constructor(
    private readonly recorder: InputRecorder,
    options: BrowserEventAdapterOptions = {},
  ) {
    this.documentTarget = options.documentTarget ?? document;
    this.windowTarget = options.windowTarget ?? window;
    this.performanceNow = options.performanceNow ?? (() => performance.now());
    this.unixNow = options.unixNow ?? (() => Date.now());
    this.documentTarget.addEventListener("mousemove", this.onMouseMove);
    this.windowTarget.addEventListener("blur", this.onBlur);
    this.documentTarget.addEventListener(
      "visibilitychange",
      this.onVisibilityChange,
    );
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.documentTarget.removeEventListener("mousemove", this.onMouseMove);
    this.windowTarget.removeEventListener("blur", this.onBlur);
    this.documentTarget.removeEventListener(
      "visibilitychange",
      this.onVisibilityChange,
    );
    this.recorder.interrupt(
      "capture-teardown",
      this.unixNow(),
      this.performanceNow(),
    );
  }
}
