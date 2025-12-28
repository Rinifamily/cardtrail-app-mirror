import { test, expect } from '@playwright/test';

test.describe('Search Flow', () => {
  test('searches for cards and displays results', async ({ page }) => {
    await page.goto('/search');

    const searchInput = page.locator('input[aria-label="Search cards"]');
    await searchInput.fill('Pikachu');
    await searchInput.press('Enter');

    await page.waitForLoadState('networkidle');

    const cards = page.locator('[data-testid="card-grid-item"]');
    await expect(cards.first()).toBeVisible();
  });

  test('shows autocomplete suggestions', async ({ page }) => {
    await page.goto('/search');

    const searchInput = page.locator('input[aria-label="Search cards"]');
    await searchInput.fill('Pika');

    await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
    const suggestions = page.locator('[role="option"]');
    await expect(suggestions.first()).toBeVisible();
  });

  test('loads more cards via Load More button', async ({ page }) => {
    await page.goto('/search?q=Pikachu');

    await page.waitForLoadState('networkidle');
    const gridItems = page.locator('[data-testid="card-grid-item"]');
    const initialCount = await gridItems.count();

    const loadMoreButton = page.locator('button', { hasText: 'Load More' });
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();
      await page.waitForLoadState('networkidle');

      const newCount = await gridItems.count();
      expect(newCount).toBeGreaterThan(initialCount);
    }
  });

  test('displays all cards by default without filters', async ({ page }) => {
    await page.goto('/search');

    await page.waitForLoadState('networkidle');

    const cards = page.locator('[data-testid="card-grid-item"]');
    await expect(cards.first()).toBeVisible();
  });
});
