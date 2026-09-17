import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
async function setup(page: import("@playwright/test").Page) {
  await page.goto("/#/setup");
  await page.getByLabel("Mouse name").fill("Synthetic Fixture Mouse");
  await page.getByRole("button", { name: "Save and check input" }).click();
  await expect(
    page.getByRole("heading", { name: /Know what the browser/ }),
  ).toBeVisible();
}
for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
])
  test(`first-use and main surfaces at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      if (!r.url().startsWith("http://127.0.0.1:4173")) external.push(r.url());
    });
    await page.setViewportSize(viewport);
    await setup(page);
    await mkdir("screenshots", { recursive: true });
    await page.screenshot({
      path: `screenshots/input-readiness-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Home" }).click();
    await expect(
      page.getByRole("heading", { name: /Build your first spatial model/ }),
    ).toBeVisible();
    await page.screenshot({
      path: `screenshots/home-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Practice", exact: true }).click();
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect(page.getByText(/No reticle, endpoint/)).toBeVisible();
    await page.screenshot({
      path: `screenshots/dspds-practice-${viewport.width}x${viewport.height}.png`,
    });
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("button", { name: "Form Blend", exact: true })
      .click();
    await expect(
      page.getByText(/Assistance changes displayed camera output only/),
    ).toBeVisible();
    await page.getByRole("radio", { name: "Third person" }).click();
    await expect(page.locator("canvas")).toHaveCount(1);
    await page.screenshot({
      path: `screenshots/form-blend-third-person-${viewport.width}x${viewport.height}.png`,
    });
    expect(external).toEqual([]);
  });
test("empty, data, and reduced-motion states remain usable", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await setup(page);
  await page.getByRole("button", { name: "Insights" }).click();
  await expect(
    page.getByRole("heading", { name: /need formal evidence/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Data" }).click();
  await expect(
    page.getByRole("heading", { name: /Your data stays local/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/Deletion is intentionally not offered/),
  ).toBeVisible();
  await context.close();
});
