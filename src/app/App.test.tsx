import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const dispose = vi.fn();
vi.mock("../engine/createDiagnosticEngine", () => ({
  mountDiagnosticEngine: vi.fn(() => ({ resize: vi.fn(), dispose })),
}));
import { App } from "./App";

beforeEach(() => {
  location.hash = "#/";
  dispose.mockClear();
});
afterEach(cleanup);
test("mounts the diagnostic and disposes it when navigating away", async () => {
  render(<App />);
  expect(screen.getByTestId("scene-host")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Boundaries" }));
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  await waitFor(() =>
    expect(screen.queryByTestId("scene-host")).not.toBeInTheDocument(),
  );
  expect(dispose).toHaveBeenCalledOnce();
});

test("loads the M1 input diagnostic from its hash route", () => {
  location.hash = "#/input-diagnostic";
  render(<App />);
  expect(
    screen.getByRole("heading", {
      name: "Browser input integrity diagnostic",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Start 20-second diagnostic" }),
  ).toBeEnabled();
});
