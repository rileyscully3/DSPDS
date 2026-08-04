import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

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
    await page.getByRole("button", { name: "Diagnostic" }).click();
    await expect(page.locator(".scene-host canvas")).toHaveCount(1);
    expect(external).toEqual([]);
    await mkdir("screenshots", { recursive: true });
    await page.screenshot({
      path: `screenshots/diagnostic-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
  });
}
test("reduced motion remains functional", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/#/");
  await expect(page.locator(".scene-host canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Boundaries" }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await context.close();
});
