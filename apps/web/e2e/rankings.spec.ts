import { test, expect } from '@playwright/test';

test.describe('Rankings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to rankings page before each test
    await page.goto('/rankings');
  });

  test('should display rankings page with header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /榜单.*Rankings/i })).toBeVisible();
  });

  test('should display top gainers by default', async ({ page }) => {
    // Check that gainers tab is active by default
    const gainersTab = page.getByRole('tab', { name: /涨幅榜/i });
    await expect(gainersTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should switch to fallers tab and update URL', async ({ page }) => {
    const fallersTab = page.getByRole('tab', { name: /跌幅榜/i });
    await fallersTab.click();
    
    await expect(fallersTab).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/category=fallers/);
  });

  test('should switch to volume tab and update URL', async ({ page }) => {
    const volumeTab = page.getByRole('tab', { name: /成交量榜/i });
    await volumeTab.click();
    
    await expect(volumeTab).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/category=volume/);
  });

  test('should switch to popularity tab and update URL', async ({ page }) => {
    const popularityTab = page.getByRole('tab', { name: /人气榜/i });
    await popularityTab.click();
    
    await expect(popularityTab).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/category=popularity/);
  });

  test('should filter by timeframe', async ({ page }) => {
    const button24h = page.getByRole('button', { name: '24H', exact: true });
    await button24h.click();
    
    await expect(page).toHaveURL(/timeframe=24h/);
    await expect(button24h).toHaveAttribute('aria-pressed', 'true');
  });

  test('should filter by 7d timeframe', async ({ page }) => {
    const button7d = page.getByRole('button', { name: '7D', exact: true });
    await button7d.click();
    
    await expect(page).toHaveURL(/timeframe=7d/);
  });

  test('should filter by 30d timeframe', async ({ page }) => {
    const button30d = page.getByRole('button', { name: '30D', exact: true });
    await button30d.click();
    
    await expect(page).toHaveURL(/timeframe=30d/);
  });

  test('should show/hide filters on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Initially filters should be hidden
    await expect(page.getByRole('button', { name: /Rare/i }).first()).not.toBeVisible();
    
    // Click show filters button
    await page.getByRole('button', { name: 'Show Filters' }).click();
    
    // Now filters should be visible
    await expect(page.getByRole('button', { name: /Rare/i }).first()).toBeVisible();
  });

  test('should apply rarity filter', async ({ page }) => {
    // Show filters first on mobile
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      await page.getByRole('button', { name: 'Show Filters' }).click();
    }
    
    const rareButton = page.getByRole('button', { name: 'Rare', exact: true });
    await rareButton.click();
    
    await expect(page).toHaveURL(/rarity=rare/);
  });

  test('should apply grade filter', async ({ page }) => {
    // Show filters first on mobile
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      const showFiltersBtn = page.getByRole('button', { name: /Show Filters|显示筛选/i });
      if (await showFiltersBtn.isVisible()) {
        await showFiltersBtn.click();
      }
    }
    
    // Click PSA 10 filter
    const psa10Button = page.getByRole('button', { name: /PSA 10/i }).first();
    await psa10Button.click();
    
    await expect(page).toHaveURL(/grade=psa10/);
  });

  test('should apply language filter', async ({ page }) => {
    // Show filters first on mobile
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      const showFiltersBtn = page.getByRole('button', { name: /Show Filters|显示筛选/i });
      if (await showFiltersBtn.isVisible()) {
        await showFiltersBtn.click();
      }
    }
    
    const jaButton = page.getByRole('button', { name: '日本語', exact: true });
    await jaButton.click();
    
    await expect(page).toHaveURL(/language=ja/);
  });

  test('should persist filters on page refresh', async ({ page }) => {
    // Apply multiple filters
    await page.goto('/rankings?category=volume&timeframe=30d');
    await page.reload();
    
    // Check that filters are still applied
    const volumeTab = page.getByRole('tab', { name: /成交量榜/i });
    await expect(volumeTab).toHaveAttribute('aria-selected', 'true');
    
    const button30d = page.getByRole('button', { name: '30D', exact: true });
    await expect(button30d).toHaveAttribute('aria-pressed', 'true');
  });

  test('should display empty state when no data', async ({ page }) => {
    // Mock API to return empty data
    await page.route('**/rest/v1/rpc/get_price_gainers*', route => 
      route.fulfill({ 
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    );
    
    await page.reload();
    await expect(page.getByText(/数据不足|No data available/i)).toBeVisible();
  });

  test('should render rank badges correctly', async ({ page }) => {
    // Wait for content to load
    await page.waitForSelector('[aria-label^="Rank"]', { timeout: 5000 });
    
    const rank1Badge = page.locator('[aria-label="Rank 1"]');
    if (await rank1Badge.count() > 0) {
      await expect(rank1Badge).toBeVisible();
    }
  });

  test('should navigate to card detail on card click', async ({ page }) => {
    // Wait for cards to load
    const cardLinks = page.locator('a[href^="/cards/"]');
    const count = await cardLinks.count();
    
    if (count > 0) {
      const firstCard = cardLinks.first();
      const href = await firstCard.getAttribute('href');
      
      await firstCard.click();
      await expect(page).toHaveURL(new RegExp(href || ''));
    }
  });

  test('should navigate tabs with arrow keys', async ({ page }) => {
    const tabs = page.locator('[role="tab"]');
    const firstTab = tabs.first();
    
    // Focus first tab
    await firstTab.focus();
    await expect(firstTab).toBeFocused();
    
    // Press ArrowRight to move to next tab
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    
    // Verify second tab is focused and active
    const secondTab = tabs.nth(1);
    await expect(secondTab).toBeFocused();
    await expect(secondTab).toHaveAttribute('aria-selected', 'true');
    
    // Press ArrowLeft to go back
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    
    // First tab should be focused again
    await expect(firstTab).toBeFocused();
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should navigate to last tab with End key', async ({ page }) => {
    const tabs = page.locator('[role="tab"]');
    const firstTab = tabs.first();
    
    await firstTab.focus();
    await page.keyboard.press('End');
    await page.waitForTimeout(300);
    
    const lastTab = tabs.last();
    await expect(lastTab).toBeFocused();
    await expect(lastTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should navigate to first tab with Home key', async ({ page }) => {
    const tabs = page.locator('[role="tab"]');
    const lastTab = tabs.last();
    
    await lastTab.click();
    await lastTab.focus();
    await page.keyboard.press('Home');
    await page.waitForTimeout(300);
    
    const firstTab = tabs.first();
    await expect(firstTab).toBeFocused();
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that page renders without horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
  });

  test('should be responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await expect(page.getByRole('heading', { name: /榜单.*Rankings/i })).toBeVisible();
    
    // Desktop should show filters without toggle
    await expect(page.getByRole('button', { name: 'Show Filters' })).not.toBeVisible();
  });
});

test.describe('Rankings - Card Selection & Comparison', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rankings');
  });

  test('should select and deselect cards', async ({ page }) => {
    // Wait for checkboxes to load
    await page.waitForSelector('[data-testid="card-checkbox"]', { timeout: 5000 });
    
    const checkboxes = page.locator('[data-testid="card-checkbox"]');
    const count = await checkboxes.count();
    
    if (count > 0) {
      const firstCheckbox = checkboxes.first();
      
      // Select card
      await firstCheckbox.check();
      await expect(firstCheckbox).toBeChecked();
      
      // Deselect card
      await firstCheckbox.uncheck();
      await expect(firstCheckbox).not.toBeChecked();
    }
  });

  test('should open comparison drawer with 2 selected cards', async ({ page }) => {
    await page.waitForSelector('[data-testid="card-checkbox"]', { timeout: 5000 });
    
    const checkboxes = page.locator('[data-testid="card-checkbox"]');
    const count = await checkboxes.count();
    
    if (count >= 2) {
      // Select first two cards
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // Drawer should appear
      await expect(page.getByRole('dialog', { name: /Compare/i })).toBeVisible();
      await expect(page.getByText(/2 of 3 selected/i)).toBeVisible();
    }
  });

  test('should enforce 3-card comparison limit', async ({ page }) => {
    await page.waitForSelector('[data-testid="card-checkbox"]', { timeout: 5000 });
    
    const checkboxes = page.locator('[data-testid="card-checkbox"]');
    const count = await checkboxes.count();
    
    if (count >= 4) {
      // Select first three cards
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await checkboxes.nth(2).check();
      
      // Fourth checkbox should be disabled
      await expect(checkboxes.nth(3)).toBeDisabled();
    }
  });

  test('should remove card from comparison drawer', async ({ page }) => {
    await page.waitForSelector('[data-testid="card-checkbox"]', { timeout: 5000 });
    
    const checkboxes = page.locator('[data-testid="card-checkbox"]');
    const count = await checkboxes.count();
    
    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // Wait for drawer to appear
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Click remove button for first card
      const removeButtons = page.getByRole('dialog').locator('button[aria-label^="Remove"]');
      if (await removeButtons.count() > 0) {
        await removeButtons.first().click();
        
        // Should now show 1 of 3 selected
        await expect(page.getByText(/1 of 3 selected/i)).toBeVisible();
      }
    }
  });

  test('should clear all selections', async ({ page }) => {
    await page.waitForSelector('[data-testid="card-checkbox"]', { timeout: 5000 });
    
    const checkboxes = page.locator('[data-testid="card-checkbox"]');
    const count = await checkboxes.count();
    
    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // Wait for drawer
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Click clear button
      await page.getByRole('button', { name: /Clear Selection/i }).click();
      
      // Drawer should disappear
      await expect(page.getByRole('dialog')).not.toBeVisible();
      
      // Checkboxes should be unchecked
      await expect(checkboxes.nth(0)).not.toBeChecked();
      await expect(checkboxes.nth(1)).not.toBeChecked();
    }
  });

  test('should close drawer with ESC key', async ({ page }) => {
    await page.waitForSelector('[data-testid="card-checkbox"]', { timeout: 5000 });
    
    const checkboxes = page.locator('[data-testid="card-checkbox"]');
    const count = await checkboxes.count();
    
    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Press ESC
      await page.keyboard.press('Escape');
      
      // Drawer should close
      await expect(page.getByRole('dialog')).not.toBeVisible();
    }
  });
});

test.describe('Rankings - Share Functionality', () => {
  test('should have share buttons for each card', async ({ page }) => {
    await page.goto('/rankings');
    
    await page.waitForSelector('[data-testid="share-button"]', { timeout: 5000 });
    
    const shareButtons = page.locator('[data-testid="share-button"]');
    const count = await shareButtons.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('share button should be accessible', async ({ page }) => {
    await page.goto('/rankings');
    
    await page.waitForSelector('[data-testid="share-button"]', { timeout: 5000 });
    
    const firstShareButton = page.locator('[data-testid="share-button"]').first();
    
    // Should have aria-label
    const ariaLabel = await firstShareButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toMatch(/Share|分享/);
  });

  test('share button should show inline status on copy', async ({ page, context }) => {
    await page.goto('/rankings');
    await page.waitForSelector('[data-testid="share-button"]', { timeout: 5000 });
    
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    const firstShareButton = page.locator('[data-testid="share-button"]').first();
    await firstShareButton.click();
    
    // Wait for status message to appear
    const statusMessage = page.locator('[role="status"]').first();
    
    // Should show success or error message
    if (await statusMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await statusMessage.textContent();
      expect(text).toBeTruthy();
    }
  });
});

test.describe('Rankings - Grade Filter', () => {
  test('should filter by PSA 10', async ({ page }) => {
    await page.goto('/rankings');
    
    // Show filters on mobile
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      const showBtn = page.getByRole('button', { name: /Show Filters|显示筛选/i });
      if (await showBtn.isVisible()) {
        await showBtn.click();
      }
    }
    
    const psa10Btn = page.getByRole('button', { name: /PSA 10/i }).first();
    await psa10Btn.click();
    
    // URL should update
    await expect(page).toHaveURL(/grade=psa10/);
    
    // Page should reload with filtered data
    await page.waitForLoadState('networkidle');
  });

  test('should filter by PSA 9', async ({ page }) => {
    await page.goto('/rankings');
    
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      const showBtn = page.getByRole('button', { name: /Show Filters|显示筛选/i });
      if (await showBtn.isVisible()) {
        await showBtn.click();
      }
    }
    
    const psa9Btn = page.getByRole('button', { name: /PSA 9/i }).first();
    await psa9Btn.click();
    
    await expect(page).toHaveURL(/grade=psa9/);
  });

  test('should filter by raw cards', async ({ page }) => {
    await page.goto('/rankings');
    
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      const showBtn = page.getByRole('button', { name: /Show Filters|显示筛选/i });
      if (await showBtn.isVisible()) {
        await showBtn.click();
      }
    }
    
    const rawBtn = page.getByRole('button', { name: /Raw|原卡/i }).first();
    await rawBtn.click();
    
    await expect(page).toHaveURL(/grade=raw/);
  });

  test('should persist grade filter on page refresh', async ({ page }) => {
    await page.goto('/rankings?grade=psa10');
    await page.reload();
    
    await expect(page).toHaveURL(/grade=psa10/);
  });
});
