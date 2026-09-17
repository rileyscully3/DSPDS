import { describe, it, expect, vi } from "vitest";
import { PointerLockInput, type InputAdapter } from "./PointerLockInput";
import { MouseSampleBuffer } from "./MouseSampleBuffer";
import { TrialMachine } from "../scenarios/TrialMachine";
import { captureEligibility } from "./eligibility";
function fixture(capacity = 20) {
  let locked = false,
    time = 0;
  const adapter: InputAdapter = {
    document,
    window,
    now: () => time,
    locked: () => locked,
    request: vi.fn(async () => {
      locked = true;
    }),
  };
  const interrupted = vi.fn(),
    clicked = vi.fn();
  const capture = new PointerLockInput(
    document.createElement("div"),
    capacity,
    adapter,
    { interrupted, click: clicked },
  );
  const move = (dx = 12, dy = 4) => {
    const event = new MouseEvent("mousemove");
    Object.defineProperties(event, {
      movementX: { value: dx },
      movementY: { value: dy },
    });
    document.dispatchEvent(event);
  };
  return {
    capture,
    adapter,
    interrupted,
    clicked,
    move,
    setTime: (t: number) => {
      time = t;
    },
    lose: () => {
      locked = false;
      document.dispatchEvent(new Event("pointerlockchange"));
    },
  };
}
describe("production acquisition boundary", () => {
  it("ignores navigation before Begin and lock", () => {
    const f = fixture();
    f.capture.attach();
    f.move();
    expect(f.capture.buffer.snapshot()).toEqual([]);
    f.capture.dispose();
  });
  it("does not infer lock from a fulfilled request", async () => {
    const f = fixture();
    f.adapter.request = async () => {};
    f.capture.attach();
    expect(await f.capture.request()).toBe(false);
    f.move();
    expect(f.capture.buffer.length).toBe(0);
    f.capture.dispose();
  });
  it("denial preserves readiness without recording", async () => {
    const f = fixture();
    f.adapter.request = async () => {
      throw Error("denied");
    };
    f.capture.attach();
    expect(await f.capture.request()).toBe(false);
    f.move();
    expect(f.capture.diagnostics().lock).toBe("denied");
    expect(f.capture.buffer.length).toBe(0);
    f.capture.dispose();
  });
  it("labels fallback and routes real acquisition buttons", async () => {
    const f = fixture();
    const request = f.adapter.request;
    f.adapter.request = (e, u) => {
      if (u) throw Error("unsupported");
      return request(e, u);
    };
    f.capture.attach();
    await f.capture.request();
    f.move();
    document.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    expect(f.clicked).toHaveBeenCalledOnce();
    expect(f.capture.buffer.snapshot()[0]).toMatchObject({
      pointerLocked: true,
      inputMode: "adjusted-fallback",
    });
    f.capture.dispose();
  });
  it.each(["blur", "lock"] as const)(
    "stops and marks %s interruption",
    async (type) => {
      const f = fixture();
      f.capture.attach();
      await f.capture.request();
      f.move();
      if (type === "blur") window.dispatchEvent(new Event("blur"));
      else f.lose();
      f.move();
      expect(f.interrupted).toHaveBeenCalledOnce();
      expect(f.capture.buffer.length).toBe(2);
      expect(
        captureEligibility(f.capture.buffer.snapshot(), "technicalInvalid")
          .valid,
      ).toBe(false);
      f.capture.dispose();
    },
  );
  it("stops overflow without replacing accepted evidence", async () => {
    const f = fixture(2);
    f.capture.attach();
    await f.capture.request();
    f.move(1, 0);
    f.move(2, 0);
    f.move(3, 0);
    expect(f.capture.buffer.snapshot().map((s) => s.dx)).toEqual([1, 2]);
    expect(f.interrupted).toHaveBeenCalledWith("overflow");
    f.capture.dispose();
  });
  it("does not duplicate listeners across attachment or remount", async () => {
    for (let i = 0; i < 3; i++) {
      const f = fixture();
      f.capture.attach();
      f.capture.attach();
      await f.capture.request();
      f.move();
      expect(f.capture.buffer.length).toBe(1);
      f.capture.dispose();
      f.move();
      expect(f.capture.buffer.length).toBe(1);
    }
  });
  it("keeps gap uncertainty distinct from dropped reports", async () => {
    const f = fixture();
    f.capture.attach();
    await f.capture.request();
    f.move();
    f.setTime(100);
    f.move();
    const e = captureEligibility(f.capture.buffer.snapshot(), "click");
    expect(e.valid).toBe(true);
    expect(e.qualifications).toContain("delivery-gap-unknown-cause");
    f.capture.dispose();
  });
  it("rejects marker-only evidence", () => {
    const b = new MouseSampleBuffer();
    b.marker(1, "gap");
    expect(captureEligibility(b.snapshot(), "click").valid).toBe(false);
  });
  it("settles with no subsequent mouse event and enforces click minimum duration", () => {
    const m = new TrialMachine("autoWithClickFailsafe");
    m.dispatch({ type: "ready", atMs: 0 });
    m.dispatch({ type: "start", atMs: 0 });
    const b = new MouseSampleBuffer();
    const s = b.append(10, 5, 0, 0, true, "unadjusted")!;
    m.dispatch({ type: "sample", atMs: 10, sample: s });
    m.dispatch({ type: "click", atMs: 11 });
    expect(m.state).toBe("RECORDING");
    m.dispatch({ type: "tick", atMs: 160 });
    expect(m.reason).toBe("settled");
  });
});
