import { expect, test } from '@playwright/test';

const CARD_ID = process.env.E2E_CARD_ID ?? '1';

test.describe('Card detail page', () => {
  test('renders hero, price snapshot, chart, and transactions', async ({ page }) => {
    await page.goto(`/cards/${CARD_ID}`);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/CardTrail 指导价/)).toBeVisible();
    await expect(page.getByText(/价格走势/)).toBeVisible();
    await expect(page.getByText(/近期成交/)).toBeVisible();
  });

  test('switches grades via segmented control', async ({ page }) => {
    await page.goto(`/cards/${CARD_ID}`);

    const psa9 = page.getByRole('tab', { name: /PSA 9/i });
    await psa9.click();
    await expect(psa9).toHaveAttribute('aria-selected', 'true');

    const raw = page.getByRole('tab', { name: /Raw/i });
    await raw.click();
    await expect(raw).toHaveAttribute('aria-selected', 'true');
  });

  test('shows sticky CTA warning text on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/cards/${CARD_ID}`);

    const warning = page.getByText(/数据暂存本地/);
    await expect(warning).toBeVisible();

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('数据暂存本地');
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: /加入持仓/ }).click();
  });
});
