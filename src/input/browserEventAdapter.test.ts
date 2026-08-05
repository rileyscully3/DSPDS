import { afterEach, expect, test, vi } from "vitest";
import { BrowserEventAdapter } from "./browserEventAdapter";
import { InputRecorder } from "./inputRecorder";

function createRecorder(): InputRecorder {
  return new InputRecorder({
    sampleCapacity: 8,
    markerCapacity: 8,
    idFactory: () => "browser-adapter-test",
  });
}

afterEach(() => vi.restoreAllMocks());

test("browser mouse events append directly to the event-level buffer", () => {
  const input = createRecorder();
  let now = 10;
  const adapter = new BrowserEventAdapter(input, {
    performanceNow: () => now++,
    unixNow: () => 1_000,
  });
  input.start("unadjusted", 1_000, 0);
  document.dispatchEvent(
    new MouseEvent("mousemove", {
      movementX: 6,
      movementY: -4,
      buttons: 3,
    }),
  );
  document.dispatchEvent(
    new MouseEvent("mousemove", {
      movementX: -2,
      movementY: 9,
      buttons: 1,
    }),
  );
  expect(input.snapshot().samples).toEqual([
    expect.objectContaining({ dx: 6, dy: -4, buttons: 3 }),
    expect.objectContaining({ dx: -2, dy: 9, buttons: 1 }),
  ]);
  adapter.dispose();
});

test("focus and visibility loss interrupt active capture", () => {
  const input = createRecorder();
  const adapter = new BrowserEventAdapter(input, {
    performanceNow: () => 20,
    unixNow: () => 1_020,
  });
  input.start("unadjusted", 1_000, 0);
  window.dispatchEvent(new Event("blur"));
  expect(input.snapshot().interruptions[0]?.reason).toBe("window-blur");

  input.start("unadjusted", 2_000, 0);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  document.dispatchEvent(new Event("visibilitychange"));
  expect(input.snapshot().interruptions[0]?.reason).toBe("visibility-hidden");
  adapter.dispose();
});

test("disposal removes browser listeners and marks active teardown", () => {
  const input = createRecorder();
  const adapter = new BrowserEventAdapter(input, {
    performanceNow: () => 30,
    unixNow: () => 1_030,
  });
  input.start("unadjusted", 1_000, 0);
  adapter.dispose();
  expect(input.snapshot().interruptions[0]?.reason).toBe("capture-teardown");

  input.start("unadjusted", 2_000, 0);
  document.dispatchEvent(
    new MouseEvent("mousemove", { movementX: 99, movementY: 99 }),
  );
  expect(input.snapshot().samples).toEqual([]);
});
