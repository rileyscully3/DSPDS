import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const dispose = vi.fn();
vi.mock("../engine/createDiagnosticEngine", () => ({
  mountDiagnosticEngine: vi.fn(() => ({ resize: vi.fn(), dispose })),
}));
import { App } from "./App";

beforeEach(() => {
  location.hash = "#/";
  dispose.mockClear();
});
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
