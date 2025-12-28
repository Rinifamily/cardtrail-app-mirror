import { test, expect, type Page } from "@playwright/test";

const TAB_LABELS = ["大盘", "持仓", "搜卡", "榜单", "我的"];

function getNavLink(page: Page, label: string) {
  return page.getByRole("link", { name: label, exact: true });
}

test.describe("Bottom navigation", () => {
  test("is visible on mobile viewports", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    const nav = page.getByTestId("bottom-nav");
    await expect(nav).toBeVisible();

    for (const label of TAB_LABELS) {
      await expect(getNavLink(page, label)).toBeVisible();
    }
  });

  test("is hidden on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dashboard");

    await expect(page.getByTestId("bottom-nav")).toBeHidden();
  });

  test("supports navigation between tabs", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");

    await getNavLink(page, "搜卡").click();
    await expect(page).toHaveURL(/\/search/);

    await getNavLink(page, "持仓").click();
    await expect(page).toHaveURL(/\/collection/);
  });
});
