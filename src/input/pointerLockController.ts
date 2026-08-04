import type { InputMode } from "./contracts";

export type PointerLockState =
  | "unlocked"
  | "unsupported"
  | "requesting-unadjusted"
  | "requesting-adjusted"
  | "fallback-required"
  | "denied"
  | "request-failed"
  | "active-unadjusted"
  | "active-adjusted"
  | "error";

export interface PointerLockSnapshot {
  readonly state: PointerLockState;
  readonly supported: boolean;
  readonly activeMode: InputMode | null;
  readonly adjustedFallbackRequiresAction: boolean;
  readonly detail: string;
}

export interface PointerLockAdapter {
  readonly supported: boolean;
  lockedElement(): Element | null;
  request(element: Element, unadjusted: boolean): Promise<void>;
  exit(): void;
  addChangeListener(listener: EventListener): void;
  removeChangeListener(listener: EventListener): void;
  addErrorListener(listener: EventListener): void;
  removeErrorListener(listener: EventListener): void;
}

export function createBrowserPointerLockAdapter(
  documentTarget: Document = document,
): PointerLockAdapter {
  return {
    supported: "pointerLockElement" in documentTarget,
    lockedElement: () => documentTarget.pointerLockElement,
    async request(element, unadjusted) {
      const request = element.requestPointerLock?.bind(element);
      if (!request) {
        throw new DOMException(
          "Pointer Lock API is unavailable.",
          "NotSupportedError",
        );
      }
      const result = unadjusted
        ? request({ unadjustedMovement: true })
        : request();
      await Promise.resolve(result);
    },
    exit: () => documentTarget.exitPointerLock?.(),
    addChangeListener: (listener) =>
      documentTarget.addEventListener("pointerlockchange", listener),
    removeChangeListener: (listener) =>
      documentTarget.removeEventListener("pointerlockchange", listener),
    addErrorListener: (listener) =>
      documentTarget.addEventListener("pointerlockerror", listener),
    removeErrorListener: (listener) =>
      documentTarget.removeEventListener("pointerlockerror", listener),
  };
}

export interface PointerLockControllerCallbacks {
  readonly onChange?: (snapshot: PointerLockSnapshot) => void;
  readonly onUnexpectedLoss?: () => void;
  readonly onError?: () => void;
}

export class PointerLockController {
  private state: PointerLockState;
  private pendingMode: InputMode | null = null;
  private disposed = false;
  private readonly onPointerLockChange = () => this.handleChange();
  private readonly onPointerLockError = () => this.handleError();

  constructor(
    private readonly element: Element,
    private readonly adapter: PointerLockAdapter,
    private readonly callbacks: PointerLockControllerCallbacks = {},
  ) {
    this.state = adapter.supported ? "unlocked" : "unsupported";
    adapter.addChangeListener(this.onPointerLockChange);
    adapter.addErrorListener(this.onPointerLockError);
  }

  snapshot(): PointerLockSnapshot {
    const activeMode =
      this.state === "active-unadjusted"
        ? "unadjusted"
        : this.state === "active-adjusted"
          ? "adjusted"
          : null;
    return Object.freeze({
      state: this.state,
      supported: this.adapter.supported,
      activeMode,
      adjustedFallbackRequiresAction:
        this.state === "fallback-required" || this.state === "request-failed",
      detail: detailForState(this.state),
    });
  }

  async requestUnadjustedFromUserGesture(): Promise<void> {
    this.assertUsable();
    if (!this.adapter.supported) {
      this.setState("unsupported");
      return;
    }
    this.pendingMode = "unadjusted";
    this.setState("requesting-unadjusted");
    try {
      await this.adapter.request(this.element, true);
      if (this.adapter.lockedElement() === this.element) this.handleChange();
    } catch (error) {
      this.pendingMode = null;
      if (isDomExceptionNamed(error, "NotAllowedError")) {
        this.setState("denied");
      } else if (isDomExceptionNamed(error, "NotSupportedError")) {
        this.setState("fallback-required");
      } else {
        this.setState("request-failed");
      }
    }
  }

  async requestAdjustedFromUserGesture(): Promise<void> {
    this.assertUsable();
    if (this.state !== "fallback-required" && this.state !== "request-failed") {
      throw new Error(
        "Adjusted pointer lock requires a failed or unavailable unadjusted request.",
      );
    }
    this.pendingMode = "adjusted";
    this.setState("requesting-adjusted");
    try {
      await this.adapter.request(this.element, false);
      if (this.adapter.lockedElement() === this.element) this.handleChange();
    } catch (error) {
      this.pendingMode = null;
      this.setState(
        isDomExceptionNamed(error, "NotAllowedError")
          ? "denied"
          : "request-failed",
      );
    }
  }

  exit(): void {
    this.adapter.exit();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.adapter.removeChangeListener(this.onPointerLockChange);
    this.adapter.removeErrorListener(this.onPointerLockError);
  }

  private handleChange(): void {
    if (this.disposed) return;
    const locked = this.adapter.lockedElement() === this.element;
    if (locked) {
      if (
        this.state === "active-unadjusted" ||
        this.state === "active-adjusted"
      ) {
        return;
      }
      const mode = this.pendingMode ?? "adjusted";
      this.pendingMode = null;
      this.setState(
        mode === "unadjusted" ? "active-unadjusted" : "active-adjusted",
      );
      return;
    }
    const wasActive =
      this.state === "active-unadjusted" || this.state === "active-adjusted";
    this.pendingMode = null;
    this.setState(this.adapter.supported ? "unlocked" : "unsupported");
    if (wasActive) this.callbacks.onUnexpectedLoss?.();
  }

  private handleError(): void {
    if (this.disposed) return;
    this.pendingMode = null;
    this.setState("error");
    this.callbacks.onError?.();
  }

  private setState(state: PointerLockState): void {
    this.state = state;
    this.callbacks.onChange?.(this.snapshot());
  }

  private assertUsable(): void {
    if (this.disposed) throw new Error("Pointer lock controller is disposed.");
  }
}

function isDomExceptionNamed(error: unknown, name: string): boolean {
  return error instanceof DOMException
    ? error.name === name
    : typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === name;
}

function detailForState(state: PointerLockState): string {
  switch (state) {
    case "unsupported":
      return "Pointer Lock API is unavailable in this environment.";
    case "requesting-unadjusted":
      return "Requesting pointer lock with unadjusted movement.";
    case "requesting-adjusted":
      return "Requesting explicitly accepted adjusted pointer lock.";
    case "fallback-required":
      return "Unadjusted movement is unavailable. Adjusted fallback is qualified evidence and requires a separate action.";
    case "denied":
      return "The browser denied pointer lock. Retry from an explicit click.";
    case "request-failed":
      return "The unadjusted request failed. Adjusted fallback remains a separate qualified action.";
    case "active-unadjusted":
      return "Pointer lock is active and the unadjusted request succeeded.";
    case "active-adjusted":
      return "Pointer lock is active in adjusted fallback mode; evidence is qualified.";
    case "error":
      return "The browser reported a pointer-lock error.";
    default:
      return "Pointer lock is not active.";
  }
}
