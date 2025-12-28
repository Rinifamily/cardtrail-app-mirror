# CardTrail Testing Strategy

**Document Version:** 1.0  
**Last Updated:** December 4, 2025  
**Status:** Golden Source - Ready for Implementation  
**Owner:** Development Team  
**Related Docs:** [Backend Architecture](backend-architecture.md), [Frontend Architecture](frontend-architecture.md), [Developer Workflow](developer-workflow.md)

---

## 📖 Overview

This document defines the comprehensive testing strategy for CardTrail, a Pokemon TCG price tracking application. Our testing approach ensures reliability, performance, and excellent user experience across all features while maintaining rapid development velocity.

### Testing Philosophy

**Test What Matters, Skip What Doesn't**

We follow a pragmatic testing philosophy that focuses on:
- ✅ **User-facing functionality** (can users complete their goals?)
- ✅ **Business logic correctness** (is CT Price calculated accurately?)
- ✅ **Critical user journeys** (search → view → add to collection)
- ❌ **Implementation details** (internal function names, React hooks)
- ❌ **Third-party library code** (trust Supabase, Next.js, React)

### Why Testing Matters for CardTrail

1. **Financial Data Accuracy**: Users trust our CT Price calculations for investment decisions
2. **Mobile-First Experience**: Must work flawlessly on diverse mobile devices
3. **Data Integrity**: 28,000+ cards must remain consistent and accessible
4. **Chinese Market**: PIIL compliance requires careful data handling
5. **Rapid Development**: Tests enable confident refactoring and iteration

---

## 🎯 Goals & Philosophy

### Core Principles

#### 1. Testing Pyramid

We follow the testing pyramid to balance speed, cost, and confidence:

```
        /\
       /  \        E2E Tests (Playwright)
      / 10%\       - Critical user journeys
     /------\      - Cross-browser validation
    /        \     Integration Tests
   /   30%    \    - API + Database
  /------------\   - Component integration
 /              \  Unit Tests
/      60%       \ - Business logic
-----------------  - Utility functions
```

**Distribution Rationale:**
- **Unit Tests (60%)**: Fast, cheap, catch bugs early
- **Integration Tests (30%)**: Verify system components work together
- **E2E Tests (10%)**: Validate critical user flows on real browsers

#### 2. Test ROI (Return on Investment)

**High ROI Tests (Write These):**
- CT Price calculation algorithm (complex business logic)
- User authentication flows (security-critical)
- Card search functionality (core feature)
- Collection CRUD operations (data integrity)
- Price history queries (performance-sensitive)

**Low ROI Tests (Skip These):**
- Simple getter/setter functions
- Trivial UI components (Button, Input without logic)
- Next.js framework code
- Supabase SDK methods
- Third-party library behavior

#### 3. Test Confidence Over Coverage

**We prioritize:**
- ✅ Can I refactor without breaking things?
- ✅ Will this alert me when users can't complete tasks?
- ✅ Does this test fail when it should?

**Over:**
- ❌ "We have 90% code coverage"
- ❌ "We test every function"
- ❌ "We have 5000 tests"

**Target Coverage:**
- Critical paths: 90%+
- Business logic: 80%+
- UI components: 50%+
- Overall codebase: 70%+

---

## 🏗️ Testing Stack

### Technology Choices

| Test Type | Framework | Why Chosen |
|-----------|-----------|------------|
| **E2E** | Playwright | Best cross-browser support, mobile viewport testing, fast, reliable |
| **Integration** | Vitest | Fast Vite-based testing, ESM support, compatible with Next.js |
| **Unit** | Vitest + React Testing Library | Industry standard for React, excellent documentation |
| **Visual** | Playwright (future) | Built-in screenshot comparison |
| **Performance** | Lighthouse CI | Web Vitals tracking in CI/CD |

### Installation

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "happy-dom": "^12.10.3",
    "@supabase/supabase-js": "^2.38.0"
  }
}
```

---

## 🏗️ Test Organization

### Directory Structure

```
apps/web/
├── __tests__/
│   ├── e2e/                           # Playwright E2E tests
│   │   ├── auth/
│   │   │   ├── login.spec.ts
│   │   │   ├── signup.spec.ts
│   │   │   └── password-reset.spec.ts
│   │   ├── cards/
│   │   │   ├── search-flow.spec.ts
│   │   │   ├── card-profile.spec.ts
│   │   │   └── autocomplete.spec.ts
│   │   ├── collections/
│   │   │   ├── add-to-collection.spec.ts
│   │   │   ├── edit-collection.spec.ts
│   │   │   ├── delete-collection.spec.ts
│   │   │   └── portfolio-summary.spec.ts
│   │   ├── market/
│   │   │   ├── market-dashboard.spec.ts
│   │   │   └── cti-chart.spec.ts
│   │   └── fixtures/
│   │       ├── auth.ts
│   │       ├── cards.ts
│   │       └── collections.ts
│   │
│   ├── integration/                    # API + Service integration tests
│   │   ├── api/
│   │   │   ├── cards/
│   │   │   │   ├── search.test.ts
│   │   │   │   ├── get-card.test.ts
│   │   │   │   └── price-history.test.ts
│   │   │   ├── collections/
│   │   │   │   ├── create.test.ts
│   │   │   │   ├── update.test.ts
│   │   │   │   ├── delete.test.ts
│   │   │   │   └── list.test.ts
│   │   │   └── market/
│   │   │       ├── indices.test.ts
│   │   │       └── rankings.test.ts
│   │   └── services/
│   │       ├── ebay-service.test.ts
│   │       ├── price-calculator.test.ts
│   │       └── supabase-client.test.ts
│   │
│   └── unit/                          # Unit tests
│       ├── lib/
│       │   ├── price-algorithm/
│       │   │   ├── calculate-ct-price.test.ts
│       │   │   ├── remove-outliers.test.ts
│       │   │   └── apply-recency-weights.test.ts
│       │   ├── utils/
│       │   │   ├── currency.test.ts
│       │   │   ├── date.test.ts
│       │   │   └── formatting.test.ts
│       │   └── validations/
│       │       ├── card-schema.test.ts
│       │       └── collection-schema.test.ts
│       ├── components/
│       │   ├── cards/
│       │   │   ├── CardGrid.test.tsx
│       │   │   ├── CardItem.test.tsx
│       │   │   └── PriceChart.test.tsx
│       │   └── collections/
│       │       ├── AddCollectionForm.test.tsx
│       │       └── PortfolioSummary.test.tsx
│       └── hooks/
│           ├── useAuth.test.ts
│           ├── useCards.test.ts
│           └── useCollection.test.ts
│
├── playwright.config.ts
└── vitest.config.ts
```

### Naming Conventions

**Test Files:**
- E2E: `*.spec.ts` (Playwright convention)
- Integration: `*.test.ts`
- Unit: `*.test.ts` or `*.test.tsx` (React components)

**Test Descriptions:**
- Use descriptive names: `should return CT price when valid transactions exist`
- Avoid vague names: `test1`, `it works`

**Test Organization:**
```typescript
// Group related tests
describe('CT Price Calculator', () => {
  describe('with valid transaction data', () => {
    it('should calculate weighted average correctly', () => {});
    it('should apply recency weights', () => {});
  });
  
  describe('with outliers', () => {
    it('should remove outliers using IQR method', () => {});
  });
  
  describe('error cases', () => {
    it('should throw error when no transactions', () => {});
    it('should handle missing price data', () => {});
  });
});
```

---

## 🏗️ E2E Testing with Playwright

### Configuration

```typescript
// apps/web/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail build on CI if tests were accidentally skipped
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests
  retries: process.env.CI ? 2 : 0,
  
  // Reporter
  reporter: process.env.CI
    ? [['html'], ['github']]
    : [['html'], ['list']],
  
  use: {
    // Base URL
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Collect trace on failure
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
  },
  
  // Test against multiple browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile viewports (CRITICAL for CardTrail - 70%+ mobile users)
    {
      name: 'Mobile Chrome - iPhone 13',
      use: {
        ...devices['iPhone 13'],
      },
    },
    {
      name: 'Mobile Chrome - Pixel 5',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Chrome - Galaxy S23',
      use: {
        viewport: { width: 360, height: 780 },
        userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 3,
      },
    },
    {
      name: 'Mobile Safari - iPhone SE',
      use: {
        ...devices['iPhone SE'],
      },
    },
    {
      name: 'Tablet - iPad Air',
      use: {
        ...devices['iPad (gen 7)'],
      },
    },
  ],
  
  // Dev server
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### Critical E2E Test Flows

#### 1. Authentication Flow

```typescript
// __tests__/e2e/auth/signup-login-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('User can sign up with email and password', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill signup form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="password-confirm-input"]', 'SecurePass123!');
    
    // Submit form
    await page.click('[data-testid="signup-button"]');
    
    // Should redirect to email verification page
    await expect(page).toHaveURL(/\/verify-email/);
    await expect(page.locator('h1')).toContainText('Check your email');
  });
  
  test('User can log in with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    
    // Submit
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to home/search page
    await expect(page).toHaveURL(/\/(search|home)/);
    
    // Should show user menu
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
  
  test('User cannot log in with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'WrongPassword');
    await page.click('[data-testid="login-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid email or password');
    
    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });
  
  test('User can log out', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/(search|home)/);
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
    
    // User menu should not be visible
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
  });
});
```

#### 2. Card Search Flow

```typescript
// __tests__/e2e/cards/search-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Card Search Flow', () => {
  test('User can search for Pikachu and view results', async ({ page }) => {
    await page.goto('/search');
    
    // Search for card
    await page.fill('[data-testid="search-input"]', 'Pikachu');
    await page.click('[data-testid="search-button"]');
    
    // Wait for results to load
    await page.waitForSelector('[data-testid="card-result"]');
    
    // Should show multiple Pikachu cards
    const results = page.locator('[data-testid="card-result"]');
    await expect(results).toHaveCount(20); // First page has 20 results
    
    // First result should contain "Pikachu"
    await expect(results.first()).toContainText('Pikachu');
  });
  
  test('User can filter search by rarity', async ({ page }) => {
    await page.goto('/search?q=Pikachu');
    await page.waitForSelector('[data-testid="card-result"]');
    
    // Open filter panel
    await page.click('[data-testid="filter-button"]');
    
    // Select "Rare Holo" rarity
    await page.click('[data-testid="rarity-filter"]');
    await page.click('[data-testid="rarity-option-rare-holo"]');
    
    // Apply filters
    await page.click('[data-testid="apply-filters-button"]');
    
    // Wait for filtered results
    await page.waitForSelector('[data-testid="card-result"]');
    
    // All results should have "Rare Holo" badge
    const rarityBadges = page.locator('[data-testid="rarity-badge"]');
    await expect(rarityBadges.first()).toContainText('Rare Holo');
  });
  
  test('User can sort results by price', async ({ page }) => {
    await page.goto('/search?q=Charizard');
    await page.waitForSelector('[data-testid="card-result"]');
    
    // Open sort dropdown
    await page.click('[data-testid="sort-dropdown"]');
    
    // Select "Price: High to Low"
    await page.click('[data-testid="sort-price-desc"]');
    
    // Wait for sorted results
    await page.waitForSelector('[data-testid="card-result"]');
    
    // Get prices
    const prices = await page.locator('[data-testid="card-price"]').allTextContents();
    
    // Prices should be in descending order
    const numericPrices = prices.map(p => parseFloat(p.replace(/[^0-9.]/g, '')));
    expect(numericPrices).toEqual([...numericPrices].sort((a, b) => b - a));
  });
  
  test('Autocomplete shows suggestions as user types', async ({ page }) => {
    await page.goto('/search');
    
    // Start typing
    await page.fill('[data-testid="search-input"]', 'Pik');
    
    // Wait for autocomplete
    await page.waitForSelector('[data-testid="autocomplete-dropdown"]');
    
    // Should show suggestions
    const suggestions = page.locator('[data-testid="autocomplete-suggestion"]');
    await expect(suggestions).toHaveCount(10); // Max 10 suggestions
    
    // First suggestion should contain "Pikachu"
    await expect(suggestions.first()).toContainText('Pikachu');
    
    // Click first suggestion
    await suggestions.first().click();
    
    // Should navigate to card profile page
    await expect(page).toHaveURL(/\/search\/cards\/\d+/);
  });
});
```

#### 3. Card Profile Page

```typescript
// __tests__/e2e/cards/card-profile.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Card Profile Page', () => {
  test('Card profile displays all essential information', async ({ page }) => {
    // Navigate to specific card (use known card ID from test database)
    await page.goto('/search/cards/1');
    
    // Card image should be visible
    await expect(page.locator('[data-testid="card-image"]')).toBeVisible();
    
    // Card name should be displayed
    await expect(page.locator('[data-testid="card-name"]')).toBeVisible();
    
    // CT Price should be displayed
    await expect(page.locator('[data-testid="ct-price"]')).toBeVisible();
    const priceText = await page.locator('[data-testid="ct-price"]').textContent();
    expect(priceText).toMatch(/¥\d+(\.\d{2})?/); // Should be in CNY format
    
    // Grading tabs should be visible
    await expect(page.locator('[data-testid="grading-tabs"]')).toBeVisible();
    
    // Price chart should be visible
    await expect(page.locator('[data-testid="price-chart"]')).toBeVisible();
    
    // Card details should be visible
    await expect(page.locator('[data-testid="card-details"]')).toBeVisible();
  });
  
  test('User can switch between grading tiers', async ({ page }) => {
    await page.goto('/search/cards/1');
    await page.waitForSelector('[data-testid="ct-price"]');
    
    // Get PSA 10 price
    const psa10Price = await page.locator('[data-testid="ct-price"]').textContent();
    
    // Switch to PSA 9 tab
    await page.click('[data-testid="grading-tab-psa9"]');
    
    // Wait for price to update
    await page.waitForTimeout(500); // Allow for animation
    
    // Get PSA 9 price
    const psa9Price = await page.locator('[data-testid="ct-price"]').textContent();
    
    // Prices should be different
    expect(psa10Price).not.toBe(psa9Price);
    
    // Chart should update
    await expect(page.locator('[data-testid="price-chart"]')).toBeVisible();
  });
  
  test('Price chart is interactive', async ({ page }) => {
    await page.goto('/search/cards/1');
    await page.waitForSelector('[data-testid="price-chart"]');
    
    // Hover over chart
    const chart = page.locator('[data-testid="price-chart"]');
    await chart.hover();
    
    // Tooltip should appear
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
    
    // Tooltip should show price and date
    const tooltipText = await page.locator('[data-testid="chart-tooltip"]').textContent();
    expect(tooltipText).toMatch(/¥\d+/); // Price
    expect(tooltipText).toMatch(/\d{4}-\d{2}-\d{2}/); // Date
  });
  
  test('User can change price chart time period', async ({ page }) => {
    await page.goto('/search/cards/1');
    await page.waitForSelector('[data-testid="price-chart"]');
    
    // Click 1M button
    await page.click('[data-testid="period-1M"]');
    await page.waitForTimeout(500);
    
    // Click 6M button
    await page.click('[data-testid="period-6M"]');
    await page.waitForTimeout(500);
    
    // Chart should still be visible and updated
    await expect(page.locator('[data-testid="price-chart"]')).toBeVisible();
  });
  
  test('Add to Collection button opens modal', async ({ page, context }) => {
    // Login first
    await context.addCookies([{
      name: 'sb-access-token',
      value: 'test-token',
      domain: 'localhost',
      path: '/',
    }]);
    
    await page.goto('/search/cards/1');
    
    // Click "Add to Collection" button
    await page.click('[data-testid="add-to-collection-button"]');
    
    // Modal should open
    await expect(page.locator('[data-testid="add-collection-modal"]')).toBeVisible();
    
    // Form fields should be present
    await expect(page.locator('[data-testid="quantity-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="purchase-price-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="purchase-date-input"]')).toBeVisible();
  });
});
```

#### 4. Collection Management Flow

```typescript
// __tests__/e2e/collections/add-to-collection.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Collection Management', () => {
  test.use({
    storageState: '__tests__/e2e/fixtures/auth-state.json', // Logged-in state
  });
  
  test('User can add card to collection', async ({ page }) => {
    // Navigate to card profile
    await page.goto('/search/cards/1');
    
    // Click "Add to Collection"
    await page.click('[data-testid="add-to-collection-button"]');
    await expect(page.locator('[data-testid="add-collection-modal"]')).toBeVisible();
    
    // Fill form
    await page.fill('[data-testid="quantity-input"]', '2');
    await page.fill('[data-testid="purchase-price-input"]', '150.00');
    await page.selectOption('[data-testid="currency-select"]', 'CNY');
    await page.fill('[data-testid="purchase-date-input"]', '2024-12-01');
    
    // Submit
    await page.click('[data-testid="submit-button"]');
    
    // Success toast should appear
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Card added to collection');
    
    // Navigate to collections page
    await page.goto('/collection');
    
    // Card should be in collection
    await expect(page.locator('[data-testid="collection-item"]').first()).toBeVisible();
  });
  
  test('User can edit collection entry', async ({ page }) => {
    await page.goto('/collection');
    await page.waitForSelector('[data-testid="collection-item"]');
    
    // Click edit on first item
    await page.click('[data-testid="collection-item"]').first().locator('[data-testid="edit-button"]').click();
    
    // Modal should open with pre-filled data
    await expect(page.locator('[data-testid="edit-collection-modal"]')).toBeVisible();
    
    // Update quantity
    await page.fill('[data-testid="quantity-input"]', '3');
    
    // Submit
    await page.click('[data-testid="submit-button"]');
    
    // Success toast
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Collection updated');
    
    // Quantity should be updated in list
    await expect(page.locator('[data-testid="collection-item"]').first()).toContainText('×3');
  });
  
  test('User can delete collection entry', async ({ page }) => {
    await page.goto('/collection');
    await page.waitForSelector('[data-testid="collection-item"]');
    
    // Get initial count
    const initialCount = await page.locator('[data-testid="collection-item"]').count();
    
    // Click delete on first item
    await page.locator('[data-testid="collection-item"]').first().locator('[data-testid="delete-button"]').click();
    
    // Confirmation dialog should appear
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirm-dialog"]')).toContainText('Are you sure');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Success toast
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Collection item deleted');
    
    // Item should be removed from list
    const newCount = await page.locator('[data-testid="collection-item"]').count();
    expect(newCount).toBe(initialCount - 1);
  });
  
  test('Portfolio summary displays accurate stats', async ({ page }) => {
    await page.goto('/collection');
    await page.waitForSelector('[data-testid="portfolio-summary"]');
    
    // Summary cards should be visible
    await expect(page.locator('[data-testid="total-invested"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="profit-loss"]')).toBeVisible();
    
    // Values should be in currency format
    const totalInvested = await page.locator('[data-testid="total-invested"]').textContent();
    expect(totalInvested).toMatch(/¥\d+(\.\d{2})?/);
  });
});
```

#### 5. Watchlist Management Flow

```typescript
// __tests__/e2e/watchlist/watchlist-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Watchlist Management', () => {
  test.use({
    storageState: '__tests__/e2e/fixtures/auth-state.json',
  });
  
  test('User can add card to watchlist and set price alert', async ({ page }) => {
    // Navigate to card profile
    await page.goto('/search/cards/1');
    await page.waitForSelector('[data-testid="card-name"]');
    
    // Click "Add to Watchlist" button
    await page.click('[data-testid="add-to-watchlist-button"]');
    
    // Modal should open
    await expect(page.locator('[data-testid="watchlist-modal"]')).toBeVisible();
    
    // Set target price
    await page.fill('[data-testid="target-price-input"]', '100.00');
    
    // Enable price alert
    await page.check('[data-testid="enable-alert-checkbox"]');
    
    // Select notification method
    await page.selectOption('[data-testid="notification-method-select"]', 'email');
    
    // Submit
    await page.click('[data-testid="submit-button"]');
    
    // Success toast
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Added to watchlist');
    
    // Navigate to watchlist page
    await page.goto('/profile/watchlist');
    await page.waitForSelector('[data-testid="watchlist-item"]');
    
    // Card should be in watchlist
    const watchlistItems = page.locator('[data-testid="watchlist-item"]');
    await expect(watchlistItems).toHaveCountGreaterThan(0);
    await expect(watchlistItems.first()).toContainText('¥100.00');
  });
  
  test('User receives alert when price drops below target', async ({ page }) => {
    // Add card to watchlist with high target price
    await page.goto('/search/cards/1');
    await page.click('[data-testid="add-to-watchlist-button"]');
    await page.fill('[data-testid="target-price-input"]', '999.00');
    await page.check('[data-testid="enable-alert-checkbox"]');
    await page.click('[data-testid="submit-button"]');
    
    // Simulate price drop (via test API)
    await page.request.post('/api/test/simulate-price-drop', {
      data: { card_id: 1, new_price: 50.00 }
    });
    
    // Check notifications page
    await page.goto('/profile/notifications');
    
    // Should see price alert notification
    await expect(page.locator('[data-testid="notification-item"]').first())
      .toContainText('Price alert');
    await expect(page.locator('[data-testid="notification-item"]').first())
      .toContainText('dropped to ¥50.00');
  });
  
  test('User can remove card from watchlist', async ({ page }) => {
    await page.goto('/profile/watchlist');
    await page.waitForSelector('[data-testid="watchlist-item"]');
    
    // Get initial count
    const initialCount = await page.locator('[data-testid="watchlist-item"]').count();
    
    // Click remove button
    await page.locator('[data-testid="watchlist-item"]').first()
      .locator('[data-testid="remove-button"]').click();
    
    // Confirm removal
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    await page.click('[data-testid="confirm-remove-button"]');
    
    // Success toast
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Removed from watchlist');
    
    // Count should decrease
    const newCount = await page.locator('[data-testid="watchlist-item"]').count();
    expect(newCount).toBe(initialCount - 1);
  });
});
```

#### 6. Market Dashboard Flow

```typescript
// __tests__/e2e/market/market-dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Market Dashboard', () => {
  test('Market dashboard displays CTI index and chart', async ({ page }) => {
    await page.goto('/market');
    
    // CTI index card should be visible
    await expect(page.locator('[data-testid="cti-index-card"]')).toBeVisible();
    
    // Index value should be displayed
    const indexValue = await page.locator('[data-testid="cti-value"]').textContent();
    expect(indexValue).toMatch(/\d{3,4}\.\d{2}/); // e.g., "1234.56"
    
    // Change percentage should be displayed
    await expect(page.locator('[data-testid="cti-change"]')).toBeVisible();
    
    // K-line chart should be visible
    await expect(page.locator('[data-testid="kline-chart"]')).toBeVisible();
    
    // Sub-indices should be visible
    await expect(page.locator('[data-testid="sub-index-wotc"]')).toBeVisible();
    await expect(page.locator('[data-testid="sub-index-modern"]')).toBeVisible();
    await expect(page.locator('[data-testid="sub-index-japanese"]')).toBeVisible();
  });
  
  test('User can switch chart time periods', async ({ page }) => {
    await page.goto('/market');
    await page.waitForSelector('[data-testid="kline-chart"]');
    
    // Get initial data points
    const initialDataPoints = await page.locator('[data-testid="chart-data-point"]').count();
    
    // Click 1M button
    await page.click('[data-testid="period-1M"]');
    await page.waitForTimeout(500); // Wait for chart animation
    
    // Click 6M button
    await page.click('[data-testid="period-6M"]');
    await page.waitForTimeout(500);
    
    // Data points should change
    const newDataPoints = await page.locator('[data-testid="chart-data-point"]').count();
    expect(newDataPoints).toBeGreaterThan(initialDataPoints);
  });
  
  test('User can view sub-index details', async ({ page }) => {
    await page.goto('/market');
    
    // Click on WOTC sub-index
    await page.click('[data-testid="sub-index-wotc"]');
    
    // Should navigate to sub-index page
    await expect(page).toHaveURL(/\/market\/wotc/);
    
    // Should show constituent cards
    await expect(page.locator('[data-testid="constituent-cards"]')).toBeVisible();
    
    // Should show at least 10 cards
    const cards = page.locator('[data-testid="constituent-card"]');
    await expect(cards).toHaveCountGreaterThanOrEqual(10);
  });
  
  test('Chart is interactive with tooltip', async ({ page }) => {
    await page.goto('/market');
    await page.waitForSelector('[data-testid="kline-chart"]');
    
    // Hover over chart
    const chart = page.locator('[data-testid="kline-chart"]');
    const box = await chart.boundingBox();
    
    if (box) {
      // Hover at midpoint
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      
      // Tooltip should appear
      await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
      
      // Tooltip should show date and value
      const tooltipText = await page.locator('[data-testid="chart-tooltip"]').textContent();
      expect(tooltipText).toMatch(/\d{4}-\d{2}-\d{2}/); // Date
      expect(tooltipText).toMatch(/\d+\.\d{2}/); // Value
    }
  });
});
```

#### 7. Portfolio Analytics Flow

```typescript
// __tests__/e2e/portfolio/portfolio-analytics.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Portfolio Analytics', () => {
  test.use({
    storageState: '__tests__/e2e/fixtures/auth-state.json',
  });
  
  test('Portfolio summary displays accurate statistics', async ({ page }) => {
    await page.goto('/collection');
    await page.waitForSelector('[data-testid="portfolio-summary"]');
    
    // Total invested should be displayed
    const totalInvested = await page.locator('[data-testid="total-invested"]').textContent();
    expect(totalInvested).toMatch(/¥\d+(\.\d{2})?/);
    
    // Current value should be displayed
    const currentValue = await page.locator('[data-testid="current-value"]').textContent();
    expect(currentValue).toMatch(/¥\d+(\.\d{2})?/);
    
    // Profit/loss should be displayed
    await expect(page.locator('[data-testid="profit-loss"]')).toBeVisible();
    
    // ROI percentage should be displayed
    await expect(page.locator('[data-testid="roi-percent"]')).toBeVisible();
    
    // Distribution charts should be visible
    await expect(page.locator('[data-testid="distribution-by-rarity"]')).toBeVisible();
    await expect(page.locator('[data-testid="distribution-by-set"]')).toBeVisible();
  });
  
  test('User can export collection to CSV', async ({ page }) => {
    await page.goto('/collection');
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv-button"]');
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/cardtrail-collection-.*\.csv/);
    
    // Verify CSV content
    const path = await download.path();
    expect(path).toBeTruthy();
  });
  
  test('Portfolio value chart updates with time period selection', async ({ page }) => {
    await page.goto('/collection/analytics');
    await page.waitForSelector('[data-testid="portfolio-value-chart"]');
    
    // Click 3M period
    await page.click('[data-testid="period-3M"]');
    await page.waitForTimeout(500);
    
    // Chart should update
    await expect(page.locator('[data-testid="portfolio-value-chart"]')).toBeVisible();
    
    // Click 1Y period
    await page.click('[data-testid="period-1Y"]');
    await page.waitForTimeout(500);
    
    // Chart should still be visible
    await expect(page.locator('[data-testid="portfolio-value-chart"]')).toBeVisible();
  });
  
  test('Top movers section displays biggest gainers and losers', async ({ page }) => {
    await page.goto('/collection/analytics');
    
    // Top movers section should be visible
    await expect(page.locator('[data-testid="top-movers"]')).toBeVisible();
    
    // Should have gainers tab
    await page.click('[data-testid="tab-gainers"]');
    await expect(page.locator('[data-testid="gainer-card"]')).toHaveCountGreaterThan(0);
    
    // Should have losers tab
    await page.click('[data-testid="tab-losers"]');
    await expect(page.locator('[data-testid="loser-card"]')).toHaveCountGreaterThan(0);
    
    // Each mover should show change percentage
    const firstMover = page.locator('[data-testid="loser-card"]').first();
    await expect(firstMover.locator('[data-testid="change-percent"]')).toBeVisible();
  });
});
```

#### 8. Rankings and Leaderboards Flow

```typescript
// __tests__/e2e/rankings/rankings-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Rankings and Leaderboards', () => {
  test('Rankings page displays top risers', async ({ page }) => {
    await page.goto('/rankings');
    
    // Default tab should be "Top Risers"
    await expect(page.locator('[data-testid="tab-risers"]')).toHaveAttribute('aria-selected', 'true');
    
    // Should display at least 20 cards
    const rankedCards = page.locator('[data-testid="ranked-card"]');
    await expect(rankedCards).toHaveCountGreaterThanOrEqual(20);
    
    // Each card should show rank, name, price, and change %
    const firstCard = rankedCards.first();
    await expect(firstCard.locator('[data-testid="rank"]')).toContainText('1');
    await expect(firstCard.locator('[data-testid="card-name"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="price"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="change-percent"]')).toBeVisible();
  });
  
  test('User can switch between risers, fallers, and volume tabs', async ({ page }) => {
    await page.goto('/rankings');
    
    // Switch to Top Fallers
    await page.click('[data-testid="tab-fallers"]');
    await page.waitForSelector('[data-testid="ranked-card"]');
    
    // Should show negative change percentages
    const firstFaller = page.locator('[data-testid="ranked-card"]').first();
    const changeText = await firstFaller.locator('[data-testid="change-percent"]').textContent();
    expect(changeText).toMatch(/-\d+\.\d{2}%/);
    
    // Switch to Most Traded
    await page.click('[data-testid="tab-volume"]');
    await page.waitForSelector('[data-testid="ranked-card"]');
    
    // Should show volume numbers
    const firstVolumeCard = page.locator('[data-testid="ranked-card"]').first();
    await expect(firstVolumeCard.locator('[data-testid="volume"]')).toBeVisible();
  });
  
  test('User can filter rankings by time period', async ({ page }) => {
    await page.goto('/rankings');
    
    // Click 7D period
    await page.click('[data-testid="period-7D"]');
    await page.waitForSelector('[data-testid="ranked-card"]');
    
    // Click 30D period
    await page.click('[data-testid="period-30D"]');
    await page.waitForSelector('[data-testid="ranked-card"]');
    
    // Rankings should update
    await expect(page.locator('[data-testid="ranked-card"]')).toHaveCountGreaterThan(0);
  });
  
  test('Clicking ranked card navigates to card profile', async ({ page }) => {
    await page.goto('/rankings');
    await page.waitForSelector('[data-testid="ranked-card"]');
    
    // Click first ranked card
    await page.locator('[data-testid="ranked-card"]').first().click();
    
    // Should navigate to card profile page
    await expect(page).toHaveURL(/\/search\/cards\/\d+/);
    await expect(page.locator('[data-testid="card-name"]')).toBeVisible();
  });
});
```

#### 9. Complete User Signup to First Collection Flow

```typescript
// __tests__/e2e/complete-flow/signup-to-collection.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete User Journey: Signup to First Collection', () => {
  test('New user can sign up, search, view card, and add to collection', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';
    
    // Step 1: Sign up
    await page.goto('/signup');
    await page.fill('[data-testid="email-input"]', testEmail);
    await page.fill('[data-testid="password-input"]', testPassword);
    await page.fill('[data-testid="password-confirm-input"]', testPassword);
    await page.check('[data-testid="terms-checkbox"]');
    await page.click('[data-testid="signup-button"]');
    
    // Step 2: Email verification (skip in test)
    await page.goto('/verify-email?token=test-token-skip');
    await expect(page.locator('[data-testid="verification-success"]')).toBeVisible();
    
    // Step 3: Onboarding
    await page.click('[data-testid="start-button"]');
    await page.fill('[data-testid="display-name-input"]', 'TestCollector');
    await page.selectOption('[data-testid="currency-preference"]', 'CNY');
    await page.click('[data-testid="complete-onboarding-button"]');
    
    // Step 4: Search for card
    await expect(page).toHaveURL(/\/(search|home)/);
    await page.fill('[data-testid="search-input"]', 'Pikachu VMAX');
    await page.click('[data-testid="search-button"]');
    
    // Step 5: View search results
    await page.waitForSelector('[data-testid="card-result"]');
    await expect(page.locator('[data-testid="card-result"]')).toHaveCountGreaterThan(0);
    
    // Step 6: Click first result
    await page.locator('[data-testid="card-result"]').first().click();
    
    // Step 7: View card profile
    await expect(page).toHaveURL(/\/search\/cards\/\d+/);
    await expect(page.locator('[data-testid="card-name"]')).toContainText('Pikachu');
    await expect(page.locator('[data-testid="ct-price"]')).toBeVisible();
    
    // Step 8: Add to collection
    await page.click('[data-testid="add-to-collection-button"]');
    await expect(page.locator('[data-testid="add-collection-modal"]')).toBeVisible();
    
    await page.fill('[data-testid="quantity-input"]', '1');
    await page.fill('[data-testid="purchase-price-input"]', '45.00');
    await page.selectOption('[data-testid="currency-select"]', 'CNY');
    await page.fill('[data-testid="purchase-date-input"]', '2024-12-01');
    
    await page.click('[data-testid="submit-button"]');
    
    // Step 9: Verify success
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Card added to collection');
    
    // Step 10: Navigate to collection
    await page.goto('/collection');
    await page.waitForSelector('[data-testid="collection-item"]');
    
    // Should see the card in collection
    await expect(page.locator('[data-testid="collection-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="collection-item"]').first())
      .toContainText('Pikachu');
    
    // Portfolio summary should show data
    await expect(page.locator('[data-testid="total-invested"]')).toContainText('¥45.00');
  });
});
```

#### 10. Mobile Viewport Testing (Enhanced)

```typescript
// __tests__/e2e/mobile/responsive-design.spec.ts
import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsive Design', () => {
  test.describe('iPhone 13', () => {
    test.use({
      ...devices['iPhone 13'],
    });
    
    test('Bottom navigation is visible and functional', async ({ page }) => {
      await page.goto('/search');
      
      // Bottom nav should be visible
      await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible();
      
      // Should have 5 tabs
      const tabs = page.locator('[data-testid="nav-tab"]');
      await expect(tabs).toHaveCount(5);
      
      // Test each tab navigation
      await page.click('[data-testid="nav-tab-collection"]');
      await expect(page).toHaveURL(/\/collection/);
      
      await page.click('[data-testid="nav-tab-market"]');
      await expect(page).toHaveURL(/\/market/);
      
      await page.click('[data-testid="nav-tab-rankings"]');
      await expect(page).toHaveURL(/\/rankings/);
    });
    
    test('Card grid is single column on mobile', async ({ page }) => {
      await page.goto('/search?q=Pikachu');
      await page.waitForSelector('[data-testid="card-grid"]');
      
      // Grid should be single column
      const grid = page.locator('[data-testid="card-grid"]');
      const gridStyles = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns);
      
      // Should have 1 column (1fr)
      expect(gridStyles).toContain('1fr');
      expect(gridStyles.split(' ').length).toBeLessThanOrEqual(2);
    });
    
    test('Card profile is vertically stacked', async ({ page }) => {
      await page.goto('/search/cards/1');
      await page.waitForSelector('[data-testid="card-profile"]');
      
      // Image and details should be stacked vertically
      const layout = page.locator('[data-testid="card-profile-layout"]');
      const flexDirection = await layout.evaluate(el => window.getComputedStyle(el).flexDirection);
      
      expect(flexDirection).toBe('column');
    });
  });
  
  test.describe('Galaxy S23 (Android)', () => {
    test.use({
      viewport: { width: 360, height: 780 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36',
      hasTouch: true,
      isMobile: true,
    });
    
    test('Touch interactions work on Android', async ({ page }) => {
      await page.goto('/search?q=Charizard');
      await page.waitForSelector('[data-testid="card-result"]');
      
      // Tap first card
      await page.tap('[data-testid="card-result"]');
      
      // Should navigate to card profile
      await expect(page).toHaveURL(/\/search\/cards\/\d+/);
    });
    
    test('Swipe gestures work on chart', async ({ page }) => {
      await page.goto('/market');
      await page.waitForSelector('[data-testid="kline-chart"]');
      
      // Get chart element
      const chart = page.locator('[data-testid="kline-chart"]');
      const box = await chart.boundingBox();
      
      if (box) {
        // Swipe left (pan chart)
        await page.touchscreen.tap(box.x + 200, box.y + 100);
        await page.touchscreen.tap(box.x + 50, box.y + 100);
        
        // Chart should still be visible (not broken)
        await expect(chart).toBeVisible();
      }
    });
  });
  
  test.describe('Pixel 5', () => {
    test.use({
      ...devices['Pixel 5'],
    });
    
    test('Filters panel opens as bottom sheet on mobile', async ({ page }) => {
      await page.goto('/search?q=Pikachu');
      
      // Filter button should be visible
      await expect(page.locator('[data-testid="filter-button"]')).toBeVisible();
      
      // Tap filter button
      await page.tap('[data-testid="filter-button"]');
      
      // Filters panel should slide up from bottom
      await expect(page.locator('[data-testid="filters-panel"]')).toBeVisible();
      
      // Panel should be full-width
      const panel = page.locator('[data-testid="filters-panel"]');
      const panelWidth = await panel.evaluate(el => el.offsetWidth);
      const viewportWidth = page.viewportSize()?.width || 0;
      
      expect(panelWidth).toBe(viewportWidth);
    });
  });
});
```

#### 11. Cross-Browser Compatibility Testing

```typescript
// __tests__/e2e/cross-browser/compatibility.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Cross-Browser Compatibility', () => {
  test.describe.configure({ mode: 'parallel' });
  
  for (const browserName of ['chromium', 'firefox', 'webkit']) {
    test.describe(`${browserName}`, () => {
      test.use({ browserName: browserName as any });
      
      test('Card search works correctly', async ({ page }) => {
        await page.goto('/search');
        
        await page.fill('[data-testid="search-input"]', 'Pikachu');
        await page.click('[data-testid="search-button"]');
        
        await page.waitForSelector('[data-testid="card-result"]');
        const results = page.locator('[data-testid="card-result"]');
        await expect(results).toHaveCountGreaterThan(0);
      });
      
      test('Price chart renders correctly', async ({ page }) => {
        await page.goto('/search/cards/1');
        await page.waitForSelector('[data-testid="price-chart"]');
        
        // Chart should be visible
        await expect(page.locator('[data-testid="price-chart"]')).toBeVisible();
        
        // Chart should have canvas element
        await expect(page.locator('[data-testid="price-chart"] canvas')).toBeVisible();
      });
      
      test('Form submission works correctly', async ({ page, context }) => {
        // Mock authenticated state
        await context.addCookies([{
          name: 'sb-access-token',
          value: 'test-token',
          domain: 'localhost',
          path: '/',
        }]);
        
        await page.goto('/search/cards/1');
        await page.click('[data-testid="add-to-collection-button"]');
        
        await page.fill('[data-testid="quantity-input"]', '1');
        await page.fill('[data-testid="purchase-price-input"]', '50.00');
        await page.click('[data-testid="submit-button"]');
        
        // Should show success message
        await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
      });
    });
  }
});
```

### E2E Test Fixtures

```typescript
// __tests__/e2e/fixtures/auth.ts
import { test as base } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Create test user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: { user } } = await supabase.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });
    
    // Sign in
    const { data: { session } } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: 'TestPassword123!',
    });
    
    // Set session cookie
    await page.context().addCookies([
      {
        name: 'sb-access-token',
        value: session!.access_token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
      },
    ]);
    
    await use(page);
    
    // Cleanup: Delete test user
    await supabase.auth.admin.deleteUser(user!.id);
  },
});
```

### Running E2E Tests

```bash
# Install Playwright browsers
pnpm exec playwright install

# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm exec playwright test __tests__/e2e/cards/search-flow.spec.ts

# Run in UI mode (interactive)
pnpm exec playwright test --ui

# Run on specific browser
pnpm exec playwright test --project=chromium

# Run in headed mode (see browser)
pnpm exec playwright test --headed

# Debug mode
pnpm exec playwright test --debug

# Generate test report
pnpm exec playwright show-report
```

---

## 🏗️ Integration Testing

Integration tests verify that multiple system components work together correctly.

### Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['__tests__/setup.ts'],
    include: ['__tests__/integration/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@cardtrail/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@cardtrail/db': path.resolve(__dirname, '../../packages/db/src'),
    },
  },
});
```

### API Integration Tests

```typescript
// __tests__/integration/api/cards/search.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GET } from '@/app/api/v1/cards/route';
import { createClient } from '@supabase/supabase-js';

describe('GET /api/v1/cards', () => {
  let supabase: any;
  
  beforeAll(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });
  
  it('should return paginated cards', async () => {
    const request = new Request('http://localhost/api/v1/cards?page=1&per_page=20');
    const response = await GET(request);
    const json = await response.json();
    
    expect(response.status).toBe(200);
    expect(json.data).toBeInstanceOf(Array);
    expect(json.data).toHaveLength(20);
    expect(json.pagination).toEqual({
      page: 1,
      per_page: 20,
      total_items: expect.any(Number),
      total_pages: expect.any(Number),
    });
  });
  
  it('should filter cards by query', async () => {
    const request = new Request('http://localhost/api/v1/cards?q=Pikachu&per_page=10');
    const response = await GET(request);
    const json = await response.json();
    
    expect(response.status).toBe(200);
    expect(json.data.length).toBeGreaterThan(0);
    
    // All results should contain "Pikachu" in name
    json.data.forEach((card: any) => {
      expect(card.name.toLowerCase()).toContain('pikachu');
    });
  });
  
  it('should filter cards by rarity', async () => {
    const request = new Request('http://localhost/api/v1/cards?rarity=Rare+Holo&per_page=10');
    const response = await GET(request);
    const json = await response.json();
    
    expect(response.status).toBe(200);
    
    // All results should have "Rare Holo" rarity
    json.data.forEach((card: any) => {
      expect(card.rarity).toBe('Rare Holo');
    });
  });
  
  it('should validate query parameters', async () => {
    // Invalid per_page (too large)
    const request = new Request('http://localhost/api/v1/cards?per_page=1000');
    const response = await GET(request);
    const json = await response.json();
    
    expect(response.status).toBe(400);
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe('INVALID_PARAMS');
  });
  
  it('should handle empty results', async () => {
    const request = new Request('http://localhost/api/v1/cards?q=ThisCardDoesNotExist123');
    const response = await GET(request);
    const json = await response.json();
    
    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(0);
    expect(json.pagination.total_items).toBe(0);
  });
});
```

```typescript
// __tests__/integration/api/collections/create.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/v1/collections/route';
import { createClient } from '@supabase/supabase-js';

describe('POST /api/v1/collections', () => {
  let testUserId: string;
  let testCardId: number;
  
  beforeEach(async () => {
    // Create test user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: { user } } = await supabase.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });
    
    testUserId = user!.id;
    
    // Get test card
    const { data: cards } = await supabase.from('card_jp').select('id').limit(1);
    testCardId = cards![0].id;
  });
  
  it('should create collection entry with valid data', async () => {
    const request = new Request('http://localhost/api/v1/collections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testUserId}`, // Mock auth
      },
      body: JSON.stringify({
        card_id: testCardId,
        quantity: 2,
        purchase_price: 150.00,
        purchase_currency: 'CNY',
        purchase_date: '2024-12-01',
      }),
    });
    
    const response = await POST(request);
    const json = await response.json();
    
    expect(response.status).toBe(201);
    expect(json.data).toMatchObject({
      card_id: testCardId,
      quantity: 2,
      purchase_price: 150.00,
      purchase_currency: 'CNY',
    });
  });
  
  it('should validate required fields', async () => {
    const request = new Request('http://localhost/api/v1/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Missing card_id
        quantity: 2,
        purchase_price: 150.00,
      }),
    });
    
    const response = await POST(request);
    const json = await response.json();
    
    expect(response.status).toBe(400);
    expect(json.error.code).toBe('INVALID_PARAMS');
    expect(json.error.details).toBeDefined();
  });
  
  it('should enforce RLS (users can only add to their own collection)', async () => {
    // TODO: Test RLS by attempting to add to another user's collection
  });
});
```

### Service Integration Tests

```typescript
// __tests__/integration/services/price-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateCTPrice } from '@/lib/price-algorithm/calculate-ct-price';
import { ingestEbayTransactions } from '@/lib/transactions/ingest-ebay-data';

describe('Price Calculator Service', () => {
  it('should calculate CT Price from real transaction data', async () => {
    // Ingest mock eBay transactions
    const mockEbayItems = [
      {
        itemId: '123456',
        title: 'Pikachu VMAX PSA 10',
        sellingStatus: {
          currentPrice: { value: 150, currencyId: 'USD' },
          sellingState: 'EndedWithSales',
        },
        listingInfo: {
          endTime: '2024-12-01T10:00:00Z',
        },
      },
      {
        itemId: '123457',
        title: 'Pikachu VMAX PSA 10',
        sellingStatus: {
          currentPrice: { value: 155, currencyId: 'USD' },
          sellingState: 'EndedWithSales',
        },
        listingInfo: {
          endTime: '2024-12-02T10:00:00Z',
        },
      },
      {
        itemId: '123458',
        title: 'Pikachu VMAX PSA 10',
        sellingStatus: {
          currentPrice: { value: 145, currencyId: 'USD' },
          sellingState: 'EndedWithSales',
        },
        listingInfo: {
          endTime: '2024-12-03T10:00:00Z',
        },
      },
    ];
    
    // Ingest transactions
    const { inserted } = await ingestEbayTransactions({
      card_id: 1,
      ebay_items: mockEbayItems,
    });
    
    expect(inserted).toBe(3);
    
    // Calculate CT Price
    const result = await calculateCTPrice({
      card_id: 1,
      grade: 'psa10',
      lookback_days: 90,
    });
    
    expect(result.price).toBeGreaterThan(0);
    expect(result.sample_size).toBe(3);
    expect(result.confidence).toBeOneOf(['high', 'medium', 'low']);
    
    // Price should be close to average (with recency weights)
    // Most recent = 145, should have highest weight
    expect(result.price).toBeCloseTo(150, 5);
  });
});
```

---

## 🏗️ Unit Testing

Unit tests verify individual functions and components in isolation.

### Utility Function Tests

```typescript
// __tests__/unit/lib/price-algorithm/calculate-ct-price.test.ts
import { describe, it, expect } from 'vitest';
import { calculateCTPrice } from '@/lib/price-algorithm/calculate-ct-price';

describe('calculateCTPrice', () => {
  it('should calculate weighted average from transaction data', () => {
    const transactions = [
      { price: 100, sold_date: '2024-12-01', weight: 1.0 },
      { price: 110, sold_date: '2024-12-02', weight: 0.95 },
      { price: 120, sold_date: '2024-12-03', weight: 0.90 },
    ];
    
    const result = calculateCTPrice({ transactions, grade: 'psa10' });
    
    // Weighted average: (100*1.0 + 110*0.95 + 120*0.90) / (1.0 + 0.95 + 0.90)
    // = (100 + 104.5 + 108) / 2.85 = 312.5 / 2.85 ≈ 109.65
    expect(result.price).toBeCloseTo(109.65, 1);
  });
  
  it('should remove outliers using IQR method', () => {
    const transactions = [
      { price: 100, sold_date: '2024-12-01' },
      { price: 105, sold_date: '2024-12-02' },
      { price: 110, sold_date: '2024-12-03' },
      { price: 500, sold_date: '2024-12-04' }, // Outlier
    ];
    
    const result = calculateCTPrice({ transactions, grade: 'psa10' });
    
    // Outlier (500) should be excluded
    // Average of 100, 105, 110 = 105
    expect(result.price).toBeCloseTo(105, 5);
  });
  
  it('should throw error when no transactions provided', () => {
    expect(() => {
      calculateCTPrice({ transactions: [], grade: 'psa10' });
    }).toThrow('No transaction data available');
  });
  
  it('should apply grading adjustments', () => {
    const transactions = [
      { price: 100, sold_date: '2024-12-01', grade: 'psa10' },
    ];
    
    // PSA 9 is typically 60% of PSA 10 price
    const psa10Result = calculateCTPrice({ transactions, grade: 'psa10' });
    const psa9Result = calculateCTPrice({ transactions, grade: 'psa9' });
    
    expect(psa9Result.price).toBeCloseTo(psa10Result.price * 0.6, 5);
  });
});
```

```typescript
// __tests__/unit/lib/utils/currency.test.ts
import { describe, it, expect } from 'vitest';
import { convertCurrency, formatCurrency } from '@/lib/utils/currency';

describe('Currency Utils', () => {
  describe('convertCurrency', () => {
    it('should convert USD to CNY', () => {
      const result = convertCurrency(100, 'USD', 'CNY', { USD_CNY: 7.2 });
      expect(result).toBe(720);
    });
    
    it('should convert CNY to USD', () => {
      const result = convertCurrency(720, 'CNY', 'USD', { USD_CNY: 7.2 });
      expect(result).toBe(100);
    });
    
    it('should handle same currency conversion', () => {
      const result = convertCurrency(100, 'CNY', 'CNY', {});
      expect(result).toBe(100);
    });
  });
  
  describe('formatCurrency', () => {
    it('should format CNY correctly', () => {
      expect(formatCurrency(123.45, 'CNY')).toBe('¥123.45');
    });
    
    it('should format USD correctly', () => {
      expect(formatCurrency(123.45, 'USD')).toBe('$123.45');
    });
    
    it('should handle whole numbers', () => {
      expect(formatCurrency(100, 'CNY')).toBe('¥100.00');
    });
  });
});
```

### React Component Tests

```typescript
// __tests__/unit/components/cards/CardGrid.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardGrid } from '@/components/features/cards/CardGrid';

describe('CardGrid', () => {
  it('should render cards in grid layout', () => {
    const mockCards = [
      { id: 1, name: 'Pikachu', image_urls: { small: '/pikachu.jpg' }, current_price_psa10: 150 },
      { id: 2, name: 'Charizard', image_urls: { small: '/charizard.jpg' }, current_price_psa10: 500 },
    ];
    
    render(<CardGrid cards={mockCards} />);
    
    // Both cards should be rendered
    expect(screen.getByText('Pikachu')).toBeInTheDocument();
    expect(screen.getByText('Charizard')).toBeInTheDocument();
  });
  
  it('should show loading skeleton when loading', () => {
    render(<CardGrid cards={[]} loading={true} />);
    
    expect(screen.getByTestId('card-grid-skeleton')).toBeInTheDocument();
  });
  
  it('should show empty state when no cards', () => {
    render(<CardGrid cards={[]} />);
    
    expect(screen.getByText('No cards found')).toBeInTheDocument();
  });
  
  it('should handle click on card', async () => {
    const mockCards = [
      { id: 1, name: 'Pikachu', image_urls: { small: '/pikachu.jpg' }, current_price_psa10: 150 },
    ];
    
    const { user } = render(<CardGrid cards={mockCards} />);
    
    const cardItem = screen.getByTestId('card-item-1');
    await user.click(cardItem);
    
    // Should navigate to card profile (check in integration test)
  });
});
```

```typescript
// __tests__/unit/components/collections/AddCollectionForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddCollectionForm } from '@/components/features/collections/AddCollectionForm';

describe('AddCollectionForm', () => {
  it('should render all form fields', () => {
    render(<AddCollectionForm cardId={1} onSuccess={() => {}} />);
    
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
    expect(screen.getByLabelText('Purchase Price')).toBeInTheDocument();
    expect(screen.getByLabelText('Purchase Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Currency')).toBeInTheDocument();
  });
  
  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<AddCollectionForm cardId={1} onSuccess={() => {}} />);
    
    // Try to submit without filling fields
    const submitButton = screen.getByRole('button', { name: /add to collection/i });
    await user.click(submitButton);
    
    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Purchase price is required')).toBeInTheDocument();
      expect(screen.getByText('Purchase date is required')).toBeInTheDocument();
    });
  });
  
  it('should call onSuccess when form is submitted successfully', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    
    render(<AddCollectionForm cardId={1} onSuccess={onSuccess} />);
    
    // Fill form
    await user.type(screen.getByLabelText('Quantity'), '2');
    await user.type(screen.getByLabelText('Purchase Price'), '150.00');
    await user.type(screen.getByLabelText('Purchase Date'), '2024-12-01');
    
    // Submit
    await user.click(screen.getByRole('button', { name: /add to collection/i }));
    
    // Should call onSuccess
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
```

### Custom Hook Tests

```typescript
// __tests__/unit/hooks/useAuth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

describe('useAuth', () => {
  beforeEach(() => {
    // Clear auth state
    localStorage.clear();
  });
  
  it('should return null user when not authenticated', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });
  
  it('should sign in user with valid credentials', async () => {
    const { result } = renderHook(() => useAuth());
    
    await result.current.signIn('test@example.com', 'password123');
    
    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });
  
  it('should sign out user', async () => {
    const { result } = renderHook(() => useAuth());
    
    // Sign in first
    await result.current.signIn('test@example.com', 'password123');
    await waitFor(() => expect(result.current.user).not.toBeNull());
    
    // Sign out
    await result.current.signOut();
    
    await waitFor(() => {
      expect(result.current.user).toBeNull();
    });
  });
});
```

```typescript
// __tests__/unit/components/PriceChart.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriceChart } from '@/components/features/charts/PriceChart';

describe('PriceChart', () => {
  const mockData = [
    { date: '2024-12-01', price: 100 },
    { date: '2024-12-02', price: 105 },
    { date: '2024-12-03', price: 110 },
  ];
  
  it('should render chart with data', () => {
    render(<PriceChart data={mockData} />);
    
    // Chart container should be visible
    expect(screen.getByTestId('price-chart')).toBeInTheDocument();
    
    // Should have canvas element (Recharts renders to canvas)
    expect(screen.getByTestId('price-chart').querySelector('svg')).toBeInTheDocument();
  });
  
  it('should show loading state', () => {
    render(<PriceChart data={[]} loading={true} />);
    
    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
  });
  
  it('should show empty state when no data', () => {
    render(<PriceChart data={[]} />);
    
    expect(screen.getByText('No price data available')).toBeInTheDocument();
  });
  
  it('should display correct price range', () => {
    render(<PriceChart data={mockData} />);
    
    // Y-axis should show price range
    const yAxis = screen.getByTestId('price-chart').querySelector('.recharts-yAxis');
    expect(yAxis).toBeInTheDocument();
  });
});
```

```typescript
// __tests__/unit/components/PortfolioSummary.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortfolioSummary } from '@/components/features/collections/PortfolioSummary';

describe('PortfolioSummary', () => {
  const mockSummary = {
    total_invested: 1000.00,
    current_value: 1250.00,
    profit_loss: 250.00,
    profit_loss_percent: 25.00,
    total_cards: 15,
    total_quantity: 20,
  };
  
  it('should display all summary statistics', () => {
    render(<PortfolioSummary summary={mockSummary} />);
    
    expect(screen.getByTestId('total-invested')).toHaveTextContent('¥1,000.00');
    expect(screen.getByTestId('current-value')).toHaveTextContent('¥1,250.00');
    expect(screen.getByTestId('profit-loss')).toHaveTextContent('¥250.00');
    expect(screen.getByTestId('roi-percent')).toHaveTextContent('25.00%');
  });
  
  it('should show positive profit/loss in green', () => {
    render(<PortfolioSummary summary={mockSummary} />);
    
    const profitLoss = screen.getByTestId('profit-loss');
    expect(profitLoss).toHaveClass('text-green-600');
  });
  
  it('should show negative profit/loss in red', () => {
    const lossSummary = {
      ...mockSummary,
      profit_loss: -150.00,
      profit_loss_percent: -15.00,
    };
    
    render(<PortfolioSummary summary={lossSummary} />);
    
    const profitLoss = screen.getByTestId('profit-loss');
    expect(profitLoss).toHaveClass('text-red-600');
  });
});
```

```typescript
// __tests__/unit/components/SearchAutocomplete.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchAutocomplete } from '@/components/features/search/SearchAutocomplete';

describe('SearchAutocomplete', () => {
  it('should show suggestions when user types', async () => {
    const user = userEvent.setup();
    const mockSuggestions = [
      { id: 1, name: 'Pikachu VMAX', image_url: '/pikachu.jpg' },
      { id: 2, name: 'Pikachu ex', image_url: '/pikachu-ex.jpg' },
    ];
    
    const fetchSuggestions = vi.fn().mockResolvedValue(mockSuggestions);
    
    render(<SearchAutocomplete onSearch={fetchSuggestions} />);
    
    // Type in search box
    const input = screen.getByTestId('search-input');
    await user.type(input, 'Pika');
    
    // Wait for suggestions to appear
    await waitFor(() => {
      expect(fetchSuggestions).toHaveBeenCalledWith('Pika');
    });
    
    await waitFor(() => {
      expect(screen.getByText('Pikachu VMAX')).toBeInTheDocument();
      expect(screen.getByText('Pikachu ex')).toBeInTheDocument();
    });
  });
  
  it('should navigate on suggestion click', async () => {
    const user = userEvent.setup();
    const mockPush = vi.fn();
    
    render(<SearchAutocomplete onSelect={(id) => mockPush(`/cards/${id}`)} />);
    
    // Type to show suggestions
    await user.type(screen.getByTestId('search-input'), 'Pika');
    
    // Click first suggestion
    await waitFor(() => screen.getByText('Pikachu VMAX'));
    await user.click(screen.getByText('Pikachu VMAX'));
    
    expect(mockPush).toHaveBeenCalledWith('/cards/1');
  });
  
  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(<SearchAutocomplete />);
    
    const input = screen.getByTestId('search-input');
    await user.type(input, 'Pika');
    
    // Wait for suggestions
    await waitFor(() => screen.getByText('Pikachu VMAX'));
    
    // Press down arrow
    await user.keyboard('{ArrowDown}');
    
    // First item should be highlighted
    expect(screen.getByTestId('suggestion-0')).toHaveClass('highlighted');
    
    // Press enter
    await user.keyboard('{Enter}');
    
    // Should navigate to card
  });
});
```

---

## ✅ Implementation Checklist

### Phase 0 (Setup)
- [ ] Install testing dependencies (Playwright, Vitest, React Testing Library)
- [ ] Configure Playwright with multi-browser support
- [ ] Configure Vitest with React support
- [ ] Set up test database (Supabase local development)
- [ ] Create test fixtures and utilities
- [ ] Add testing scripts to package.json
- [ ] Configure CI/CD to run tests

### Phase 1 (Core Tests)
- [ ] Write E2E tests for authentication flow
- [ ] Write E2E tests for card search
- [ ] Write E2E tests for card profile page
- [ ] Write integration tests for card search API
- [ ] Write unit tests for CT Price algorithm
- [ ] Write unit tests for utility functions

### Phase 2 (Collection Tests)
- [ ] Write E2E tests for add to collection
- [ ] Write E2E tests for edit collection
- [ ] Write E2E tests for delete collection
- [ ] Write integration tests for collection APIs
- [ ] Write unit tests for collection forms

### Phase 3 (Mobile & Performance)
- [ ] Write mobile viewport E2E tests
- [ ] Set up Lighthouse CI for performance testing
- [ ] Add visual regression testing (optional)
- [ ] Write load tests for API endpoints

### Phase 4 (Maintenance)
- [ ] Document test patterns for team
- [ ] Set up test result dashboard
- [ ] Configure flaky test detection
- [ ] Schedule quarterly test review

---

## 🚨 Common Pitfalls

**Pitfall 1: Testing Implementation Details**
**Problem:** Tests break when refactoring internal logic
**Solution:** Test behavior, not implementation. Use data-testid attributes.

```typescript
// ❌ BAD: Testing internal state
expect(component.state.isLoading).toBe(true);

// ✅ GOOD: Testing visible behavior
expect(screen.getByTestId('loading-spinner')).toBeVisible();
```

**Pitfall 2: Not Cleaning Up Test Data**
**Problem:** Tests fail due to leftover data from previous runs
**Solution:** Always clean up in afterEach hooks

```typescript
afterEach(async () => {
  // Delete test user
  await supabase.auth.admin.deleteUser(testUserId);
  
  // Clear test data
  await supabase.from('collections').delete().eq('user_id', testUserId);
});
```

**Pitfall 3: Ignoring Flaky Tests**
**Problem:** Tests randomly fail, team loses trust in tests
**Solution:** Fix flaky tests immediately, use retry logic for network tests

```typescript
// Use waitFor for async assertions
await waitFor(() => {
  expect(screen.getByText('Card added')).toBeInTheDocument();
}, { timeout: 5000 });
```

**Pitfall 4: Over-Mocking**
**Problem:** Tests pass but real integration fails
**Solution:** Mock only external services (eBay API), test real DB queries

```typescript
// ✅ GOOD: Test real Supabase queries
const { data } = await supabase.from('card_jp').select('*').limit(10);
expect(data).toHaveLength(10);

// ❌ BAD: Mocking everything
vi.mock('@supabase/supabase-js');
```

**Pitfall 5: Skipping Mobile Testing**
**Problem:** App works on desktop but broken on mobile
**Solution:** Always test mobile viewports in E2E tests

---

## 📚 References

**External Resources:**
- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)
- [React Testing Library](https://testing-library.com/react)
- [Kent C. Dodds: Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

**Internal Documentation:**
- [Backend Architecture](backend-architecture.md) - API design patterns
- [Frontend Architecture](frontend-architecture.md) - React component patterns
- [Developer Workflow](developer-workflow.md) - Running tests locally
- [Agents.md](agents.md) - AI testing guidelines

**Tools:**
- [Playwright Test Generator](https://playwright.dev/docs/codegen)
- [Testing Library Playground](https://testing-playground.com)
- [Vitest UI](https://vitest.dev/guide/ui.html)

---

## 🔄 Review & Updates

**Review Schedule:** Quarterly (every 3 months)

**Update Triggers:**
- New feature added (write tests)
- Test coverage drops below 70%
- Flaky tests exceed 5% failure rate
- Major framework update (Next.js, React)
- Team feedback on test pain points

**Quarterly Review Checklist:**
- [ ] Review test coverage metrics
- [ ] Identify untested critical paths
- [ ] Remove obsolete tests
- [ ] Update test fixtures
- [ ] Review flaky test reports
- [ ] Team retrospective on testing experience

---

**Document Version:** 1.0  
**Created:** December 4, 2025  
**Contributors:** Development Team, QA Engineers  
**Next Review:** March 4, 2026

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) Testing Strategy
