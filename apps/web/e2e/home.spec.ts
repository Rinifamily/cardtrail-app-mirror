import { test, expect } from "@playwright/test";

test.describe("Home", () => {
  test("redirects to market", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/market/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("大盘");
  });

  test("test page shows Supabase data", async ({ page }) => {
    await page.goto("/test");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Supabase Connectivity Test");
    await expect(page.getByText(/Loaded/)).toBeVisible();

    const viewportWidth = page.viewportSize()?.width ?? 1280;
    const nav = page.getByTestId("bottom-nav");
    if (viewportWidth >= 768) {
      await expect(nav).toBeHidden();
    } else {
      await expect(nav).toBeVisible();
    }

    await expect(page.locator(".card")).toHaveCount(10);
  });
});
