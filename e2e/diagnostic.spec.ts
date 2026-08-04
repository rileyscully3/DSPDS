import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

async function installPointerLockMock(
  page: import("@playwright/test").Page,
  fallbackRequired = false,
) {
  await page.addInitScript((fallback) => {
    let locked: Element | null = null;
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      get: () => locked,
    });
    document.exitPointerLock = () => {
      locked = null;
      document.dispatchEvent(new Event("pointerlockchange"));
    };
    Element.prototype.requestPointerLock = function (
      options?: PointerLockOptions,
    ) {
      if (fallback && options?.unadjustedMovement) {
        return Promise.reject(
          new DOMException("unadjusted unavailable", "NotSupportedError"),
        );
      }
      locked = document.querySelector(".input-diagnostic");
      queueMicrotask(() =>
        document.dispatchEvent(new Event("pointerlockchange")),
      );
      return Promise.resolve();
    };
  }, fallbackRequired);
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
]) {
  test(`diagnostic lifecycle at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      if (!request.url().startsWith("http://127.0.0.1:4173"))
        external.push(request.url());
    });
    await page.setViewportSize(viewport);
    await page.goto("/#/");
    await expect(page.locator(".scene-host canvas")).toHaveCount(1);
    await page.getByRole("button", { name: "Boundaries" }).click();
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.getByRole("button", { name: "Engine diagnostic" }).click();
    await expect(page.locator(".scene-host canvas")).toHaveCount(1);
    expect(external).toEqual([]);
    await mkdir("screenshots", { recursive: true });
    await page.screenshot({
      path: `screenshots/diagnostic-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
  });

  test(`M1 input diagnostic at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      if (!request.url().startsWith("http://127.0.0.1:4173")) {
        external.push(request.url());
      }
    });
    await page.setViewportSize(viewport);
    await page.goto("/#/input-diagnostic");
    await expect(
      page.getByRole("heading", {
        name: "Browser input integrity diagnostic",
      }),
    ).toBeVisible();
    await expect(page.locator(".scene-host canvas")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Start 20-second diagnostic" }),
    ).toBeEnabled();
    await expect(page.getByText("Pointer-lock capability")).toBeVisible();
    expect(external).toEqual([]);
    await mkdir("screenshots", { recursive: true });
    await page.screenshot({
      path: `screenshots/m1-input-diagnostic-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
  });
}
test("reduced motion remains functional", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/#/input-diagnostic");
  await expect(page.locator(".scene-host canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Boundaries" }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await context.close();
});

test("capture requires explicit interaction and interruptions do not merge", async ({
  page,
}) => {
  await installPointerLockMock(page);
  await page.goto("/#/input-diagnostic");
  await expect(page.getByText("Recording", { exact: true })).toBeVisible();
  await expect(
    page
      .locator(".metric")
      .filter({ hasText: "Accepted samples" })
      .locator("strong"),
  ).toHaveText("0");

  await page
    .getByRole("button", { name: "Start 20-second diagnostic" })
    .click();
  await expect(
    page.getByText("active unadjusted", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    document.dispatchEvent(
      new MouseEvent("mousemove", {
        movementX: 8,
        movementY: -3,
        buttons: 1,
      }),
    );
    document.dispatchEvent(
      new MouseEvent("mousemove", {
        movementX: -2,
        movementY: 4,
        buttons: 0,
      }),
    );
  });
  await expect(
    page
      .locator(".metric")
      .filter({ hasText: "Accepted samples" })
      .locator("strong"),
  ).toHaveText("2");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("user cancelled");

  await page
    .getByRole("button", { name: "Start 20-second diagnostic" })
    .click();
  await expect(
    page
      .locator(".metric")
      .filter({ hasText: "Accepted samples" })
      .locator("strong"),
  ).toHaveText("0");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
});

test("adjusted fallback is explicit, visible, and qualified", async ({
  page,
}) => {
  await installPointerLockMock(page, true);
  await page.goto("/#/input-diagnostic");
  await page
    .getByRole("button", { name: "Start 20-second diagnostic" })
    .click();
  await expect(
    page.getByText("fallback required", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Adjusted pointer lock is not equivalent"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue with adjusted fallback" })
    .click();
  await expect(
    page.getByText("active adjusted", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("adjusted fallback");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
});

test("versioned capture download and synthetic fixture replay work", async ({
  page,
}) => {
  await installPointerLockMock(page);
  await page.goto("/#/input-diagnostic");
  await page
    .getByRole("button", { name: "Start 20-second diagnostic" })
    .click();
  await page.evaluate(() => {
    document.dispatchEvent(
      new MouseEvent("mousemove", {
        movementX: 4,
        movementY: 2,
        buttons: 1,
      }),
    );
  });
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export capture" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^dspds-m1-input-.+\.json$/);
  const stream = await download.createReadStream();
  let json = "";
  for await (const chunk of stream) json += chunk.toString();
  const exported = JSON.parse(json) as {
    schemaId: string;
    schemaVersion: number;
  };
  expect(exported).toMatchObject({
    schemaId: "dspds.m1-input-session",
    schemaVersion: 1,
  });

  await page
    .getByRole("button", { name: "Load and replay synthetic fixture" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Deterministic 2D path replay" }),
  ).toBeVisible();
  await expect(
    page.getByText("4 samples · total dx 0 · total dy 0"),
  ).toBeVisible();
  await page.getByRole("button", { name: "2×" }).click();
  await expect(page.getByRole("button", { name: "2×" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("keyboard focus and repeated navigation retain one engine canvas", async ({
  page,
}) => {
  await page.goto("/#/input-diagnostic");
  await page.keyboard.press("Tab");
  await expect(page.locator("button:focus")).toHaveCount(1);
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole("button", { name: "Boundaries" }).click();
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.getByRole("button", { name: "Input diagnostic" }).click();
    await expect(page.locator(".scene-host canvas")).toHaveCount(1);
  }
});
