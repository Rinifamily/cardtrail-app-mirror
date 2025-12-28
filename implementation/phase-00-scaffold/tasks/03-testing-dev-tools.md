# Task 03: Testing & Dev Tools Setup

**Goal:** Complete testing infrastructure and development tools

**Time Estimate:** 6 hours

**Phase:** Phase 0

**Dependencies:** Task 01 and Task 02

---

## 📖 Context

**What this task delivers:**
- Playwright for E2E testing
- Vitest for unit and integration testing
- GitHub Actions CI/CD pipeline
- Husky + lint-staged for pre-commit hooks
- ESLint and Prettier configured
- Testing utilities and fixtures
- Basic tests passing
- CI/CD running on every commit
- Ready for test-driven development

**Why this matters:**
Testing infrastructure enables confident refactoring and rapid iteration. Automated tests catch bugs before they reach production. CI/CD ensures every commit is tested and deployable. Pre-commit hooks maintain code quality.

**Planning docs:**
- `planning/testing-strategy.md` - Complete testing strategy (CRITICAL - read sections: Testing Stack, E2E Testing, Unit Testing)
- `planning/developer-workflow.md` - Git workflow and pre-commit hooks (Section: Git Workflow, Pre-commit Hooks)
- `planning/deployment-operations.md` - CI/CD pipeline configuration (Section: CI/CD Pipeline)
- `planning/agents.md` - Core development guidelines (MANDATORY reading)

---

## ✅ Requirements

**Functional Requirements:**
- [ ] Playwright installed and configured
- [ ] Vitest installed and configured
- [ ] GitHub Actions workflow created
- [ ] Husky + lint-staged configured
- [ ] Basic E2E test created and passing
- [ ] Basic unit test created and passing
- [ ] CI/CD pipeline runs on every push
- [ ] Pre-commit hooks run on every commit

**Technical Requirements:**
- [ ] Playwright v1.40.0+
- [ ] Vitest v1.0.0+
- [ ] @testing-library/react v14.1.0+
- [ ] GitHub Actions workflow file
- [ ] Husky v8.0.0+
- [ ] lint-staged configured
- [ ] Test coverage reporting

**Acceptance Criteria:**
- [ ] `task test` runs all tests
- [ ] `task test:e2e` runs Playwright tests
- [ ] All tests pass locally
- [ ] CI/CD pipeline passes on GitHub
- [ ] Pre-commit hooks prevent bad code
- [ ] Test reports generated
- [ ] Coverage report available

---

## 📝 Implementation Approach

### 1. Install Playwright

**Install Playwright:**
```bash
cd apps/web
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps
```

**playwright.config.ts:**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['iPhone 13'] },
    },
  ],
  
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Basic E2E test:**
```typescript
// __tests__/e2e/homepage.spec.ts
import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  
  // Should show CardTrail title
  await expect(page.locator('h1')).toContainText('CardTrail');
  
  // Should show cards from database
  await expect(page.locator('[data-testid="card-item"]')).toHaveCount(10);
});
```

### 2. Install Vitest

**Install Vitest:**
```bash
pnpm add -D vitest @vitest/ui happy-dom
pnpm add -D @testing-library/react @testing-library/jest-dom
pnpm add -D @testing-library/user-event
```

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['__tests__/setup.ts'],
    include: ['__tests__/unit/**/*.test.ts', '__tests__/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Test setup file:**
```typescript
// __tests__/setup.ts
import '@testing-library/jest-dom';
```

**Basic unit test:**
```typescript
// __tests__/unit/lib/utils.test.ts
import { describe, it, expect } from 'vitest';

describe('utils', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
```

### 3. Configure GitHub Actions

**.github/workflows/ci.yml:**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Lint
        run: pnpm task lint
      
      - name: Type check
        run: pnpm task type-check
      
      - name: Unit tests
        run: pnpm task test
      
      - name: Build
        run: pnpm task build
      
      - name: E2E tests
        run: pnpm exec playwright install --with-deps && pnpm task test:e2e
```

### 4. Configure Husky

**Install Husky:**
```bash
pnpm add -D husky lint-staged
pnpm exec husky install
```

**.husky/pre-commit:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm lint-staged
```

**package.json (root):**
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{md,json,yaml}": [
      "prettier --write"
    ]
  }
}
```

### 5. Testing

**Run all tests:**
```bash
# Unit tests
pnpm task test

# E2E tests
pnpm task test:e2e

# Verify CI/CD
git add .
git commit -m "test: add testing infrastructure"
git push
# Check GitHub Actions
```

### 6. Deployment

- [ ] Verify CI/CD runs on GitHub
- [ ] All checks pass
- [ ] Preview deployment created
- [ ] Tests pass in CI

---

## 🏗️ Key Principles

### KISS (Keep It Simple)
- ✅ Use standard testing tools (Playwright, Vitest)
- ✅ Minimal test configuration
- ✅ Simple CI/CD pipeline
- ❌ No complex test frameworks
- ❌ No over-testing

### DRY (Don't Repeat Yourself)
- ✅ Shared test utilities
- ✅ Reusable test fixtures
- ✅ Common setup files
- ❌ No duplicate test code

### Must Follow
- `planning/testing-strategy.md` - Testing patterns
- `planning/agents.md` - Testing guidelines
- Test what matters (user flows, business logic)
- Skip trivial tests (getters, setters)

---

## 🚀 Step-by-Step Execution

### Step 1: Install Playwright (1 hour)
- [ ] Install Playwright
- [ ] Configure playwright.config.ts
- [ ] Create basic E2E test
- [ ] Run test locally
- [ ] Verify test passes

### Step 2: Install Vitest (1 hour)
- [ ] Install Vitest and React Testing Library
- [ ] Configure vitest.config.ts
- [ ] Create test setup file
- [ ] Create basic unit test
- [ ] Run test and verify passes

### Step 3: Configure CI/CD (2 hours)
- [ ] Create GitHub Actions workflow
- [ ] Add lint, type-check, test, build jobs
- [ ] Configure E2E tests in CI
- [ ] Push and verify workflow runs
- [ ] Fix any CI issues

### Step 4: Configure Pre-commit Hooks (1 hour)
- [ ] Install Husky
- [ ] Create pre-commit hook
- [ ] Configure lint-staged
- [ ] Test hook runs on commit
- [ ] Verify bad code is blocked

### Step 5: Documentation (1 hour)
- [ ] Document testing commands
- [ ] Document CI/CD workflow
- [ ] Add testing guide to README
- [ ] Commit and push

---

## ✅ Done When

**This task is complete when:**
- [ ] Playwright installed and working
- [ ] Vitest installed and working
- [ ] Basic E2E test passes
- [ ] Basic unit test passes
- [ ] CI/CD pipeline runs on GitHub
- [ ] Pre-commit hooks working
- [ ] All tests pass locally and in CI
- [ ] Code committed and pushed

**No need for:**
- ❌ Comprehensive test coverage (basic tests sufficient)
- ❌ Visual regression testing (future)
- ❌ Load testing (future)
- ❌ Complex test fixtures

---

## 🔗 Related Tasks

**Depends on:**
- Task 01: Monorepo Setup
- Task 02: Next.js + Supabase Foundation

**Blocks:**
- All future tasks (need testing infrastructure)

**Related:**
- All tasks include basic tests

---

## 📚 Resources

**Planning Documents:**
- `planning/testing-strategy.md` - Complete testing guide
- `planning/developer-workflow.md` - Git workflow

**External Resources:**
- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Built with:** Agent Cube - Efficiency Mode  
**For:** CardTrail (卡迹) PTCG Price Tracker  
**Agent Guidelines:** `planning/agents.md`
