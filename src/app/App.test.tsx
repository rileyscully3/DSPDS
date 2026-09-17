import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { App } from "./App";
beforeEach(() => {
  location.hash = "#/setup";
});
test("starts with an honest local-first setup flow", async () => {
  render(<App />);
  expect(
    screen.getByRole("heading", { name: /Map how space feels/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Physical verification is optional/),
  ).toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /saving unavailable/,
  );
});
