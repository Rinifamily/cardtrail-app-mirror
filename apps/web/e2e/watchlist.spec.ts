import { test, expect } from '@playwright/test';

test('watchlist page renders warning copy', async ({ page }) => {
  await page.goto('/profile/watchlist');
  await expect(page.getByText('关注列表 · Watchlist')).toBeVisible();
  await expect(page.getByText('本地存储提醒', { exact: false })).toBeVisible();
});

test('watchlist reads items from localStorage', async ({ page }) => {
  await page.addInitScript((items) => {
    window.localStorage.setItem('cardtrail_watchlist_v1', JSON.stringify(items));
  }, [
    {
      id: 'test-watch-1',
      cardId: 987654,
      targetPrice: 120,
      targetCurrency: 'CNY',
      alertEnabled: true,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      migrationStatus: 'pending',
    },
  ]);

  await page.goto('/profile/watchlist');
  await expect(page.getByText('Card #987654')).toBeVisible();
  await expect(page.getByText('目标价格')).toBeVisible();
});
