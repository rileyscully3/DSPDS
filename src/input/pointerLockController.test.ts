import { expect, test, vi } from "vitest";
import {
  PointerLockController,
  type PointerLockAdapter,
} from "./pointerLockController";

function createAdapter() {
  const changes = new Set<EventListener>();
  const errors = new Set<EventListener>();
  let locked: Element | null = null;
  const request = vi.fn(async (element: Element) => {
    locked = element;
    for (const listener of changes) listener(new Event("pointerlockchange"));
  });
  const adapter: PointerLockAdapter = {
    supported: true,
    lockedElement: () => locked,
    request,
    exit: vi.fn(() => {
      locked = null;
      for (const listener of changes) listener(new Event("pointerlockchange"));
    }),
    addChangeListener: (listener) => changes.add(listener),
    removeChangeListener: (listener) => changes.delete(listener),
    addErrorListener: (listener) => errors.add(listener),
    removeErrorListener: (listener) => errors.delete(listener),
  };
  return {
    adapter,
    changes,
    errors,
    request,
    loseLock() {
      locked = null;
      for (const listener of changes) listener(new Event("pointerlockchange"));
    },
  };
}

test("confirms active unadjusted mode from API result and lock change", async () => {
  const element = document.createElement("div");
  const fake = createAdapter();
  const controller = new PointerLockController(element, fake.adapter);
  await controller.requestUnadjustedFromUserGesture();
  expect(fake.request).toHaveBeenCalledWith(element, true);
  expect(controller.snapshot()).toMatchObject({
    state: "active-unadjusted",
    activeMode: "unadjusted",
  });
});

test("requires a separate explicit action for adjusted fallback", async () => {
  const element = document.createElement("div");
  const fake = createAdapter();
  fake.request.mockRejectedValueOnce(
    new DOMException("not supported", "NotSupportedError"),
  );
  const controller = new PointerLockController(element, fake.adapter);

  await controller.requestUnadjustedFromUserGesture();
  expect(controller.snapshot()).toMatchObject({
    state: "fallback-required",
    adjustedFallbackRequiresAction: true,
  });
  expect(fake.request).toHaveBeenCalledTimes(1);

  await controller.requestAdjustedFromUserGesture();
  expect(fake.request).toHaveBeenLastCalledWith(element, false);
  expect(controller.snapshot()).toMatchObject({
    state: "active-adjusted",
    activeMode: "adjusted",
  });
});

test("distinguishes denial, unexpected loss, and pointer-lock error", async () => {
  const denied = createAdapter();
  denied.request.mockRejectedValueOnce(
    new DOMException("denied", "NotAllowedError"),
  );
  const deniedController = new PointerLockController(
    document.createElement("div"),
    denied.adapter,
  );
  await deniedController.requestUnadjustedFromUserGesture();
  expect(deniedController.snapshot().state).toBe("denied");

  const fake = createAdapter();
  const onUnexpectedLoss = vi.fn();
  const onError = vi.fn();
  const controller = new PointerLockController(
    document.createElement("div"),
    fake.adapter,
    { onUnexpectedLoss, onError },
  );
  await controller.requestUnadjustedFromUserGesture();
  fake.loseLock();
  expect(onUnexpectedLoss).toHaveBeenCalledOnce();
  for (const listener of fake.errors) listener(new Event("pointerlockerror"));
  expect(controller.snapshot().state).toBe("error");
  expect(onError).toHaveBeenCalledOnce();
});

test("disposal removes every pointer-lock listener", () => {
  const fake = createAdapter();
  const controller = new PointerLockController(
    document.createElement("div"),
    fake.adapter,
  );
  expect(fake.changes.size).toBe(1);
  expect(fake.errors.size).toBe(1);
  controller.dispose();
  expect(fake.changes.size).toBe(0);
  expect(fake.errors.size).toBe(0);
});
