import { expect, test } from "@playwright/test";

test.describe("Market dashboard", () => {
  test("renders CTI hero and updates timeframe", async ({ page }) => {
    await page.goto("/market");

    const ctiValue = page.getByTestId("cti-value");
    await expect(ctiValue).toHaveText(/\d+/);

    const chart = page.getByTestId("candlestick-chart");
    await expect(chart).toHaveAttribute("data-points", /\d+/);

    await page.getByRole("tab", { name: /30d/i }).click();
    await page.waitForURL(/range=30d/);

    await expect(chart).toHaveAttribute("data-points", /\d+/);
  });

  test("sub-index carousel scrolls horizontally", async ({ page }) => {
    const viewport = page.viewportSize();
    if (viewport && viewport.width > 640) {
      await page.setViewportSize({ width: 520, height: viewport.height });
    }

    await page.goto("/market");

    const carousel = page.getByTestId("subindex-carousel");
    const initialScroll = await carousel.evaluate((el) => el.scrollLeft);

    await carousel.evaluate((el) =>
      el.scrollBy({ left: 200, behavior: "smooth" }),
    );
    await page.waitForTimeout(300);

    const finalScroll = await carousel.evaluate((el) => el.scrollLeft);
    expect(finalScroll).toBeGreaterThan(initialScroll);
  });
});
