# CardTrail Developer Workflow

**Document Version:** 1.0  
**Last Updated:** December 4, 2025  
**Status:** Golden Source - Ready for Implementation  
**Author:** Development Experience Team

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Taskfile: Why and How](#taskfile-why-and-how)
3. [Installation & Setup](#installation--setup)
4. [Common Tasks](#common-tasks)
5. [Git Workflow](#git-workflow)
6. [Environment Setup](#environment-setup)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

This document defines the development workflow for CardTrail using **Taskfile** as our task runner. Taskfile provides consistent, documented commands that work across all development environments.

### Why Taskfile?

**Benefits:**
1. **Cross-Platform**: Works on macOS, Linux, Windows
2. **Self-Documenting**: `task --list` shows all available commands
3. **Dependency Management**: Tasks can depend on other tasks
4. **Simple YAML**: Easy to read and maintain
5. **Shell Agnostic**: No need for bash/zsh scripts

**Alternatives We Considered:**
- Make (old, cryptic syntax, platform issues)
- npm scripts (limited features, no dependencies)
- bash scripts (not cross-platform)

---

## Taskfile: Why and How

### Installation

```bash
# macOS/Linux (Homebrew)
brew install go-task/tap/go-task

# macOS/Linux (Alternative: direct download)
sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b ~/.local/bin

# Windows (Scoop)
scoop install task

# Verify installation
task --version
```

### Basic Usage

```bash
# List all available tasks
task --list

# Run a specific task
task dev

# Run task with arguments
task db:migrate -- --name=add_cards_table

# Show task description
task --summary dev
```

---

## Installation & Setup

### Prerequisites

```bash
# Required
node >= 20.0.0
pnpm >= 8.0.0
task >= 3.0.0

# Optional
docker >= 24.0.0  # For local Supabase
```

### First-Time Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/cardtrail-app.git
cd cardtrail-app

# 2. Run setup task (installs dependencies, copies env files)
task setup

# 3. Configure environment variables
# Edit .env.local with your credentials:
# - Supabase URL and keys
# - eBay API credentials
# - Other API keys

# 4. Generate database types
task db:types

# 5. Start development server
task dev
```

---

## Common Tasks

### Complete Taskfile.yml

```yaml
# Taskfile.yml
version: '3'

vars:
  GREETING: Hello, CardTrail Developer!

env:
  NODE_ENV: development

tasks:
  # ============================================================================
  # Setup & Installation
  # ============================================================================
  
  setup:
    desc: First-time setup (install dependencies, copy env files)
    cmds:
      - echo "{{.GREETING}}"
      - echo "Setting up CardTrail development environment..."
      - task: install
      - task: env:copy
      - echo "Setup complete! Run 'task dev' to start."
  
  install:
    desc: Install all dependencies with pnpm
    cmds:
      - pnpm install
  
  env:copy:
    desc: Copy example env files
    cmds:
      - cp .env.example .env.local || true
      - cp apps/web/.env.example apps/web/.env.local || true
    status:
      - test -f .env.local
  
  # ============================================================================
  # Development
  # ============================================================================
  
  dev:
    desc: Start development server (web app)
    cmds:
      - turbo run dev --filter=@cardtrail/web
  
  dev:all:
    desc: Start all development servers
    cmds:
      - turbo run dev
  
  # ============================================================================
  # Building
  # ============================================================================
  
  build:
    desc: Build all packages and apps
    cmds:
      - turbo run build
  
  build:web:
    desc: Build web app only
    cmds:
      - turbo run build --filter=@cardtrail/web
  
  # ============================================================================
  # Code Quality
  # ============================================================================
  
  lint:
    desc: Run ESLint on all packages
    cmds:
      - turbo run lint
  
  lint:fix:
    desc: Fix ESLint errors automatically
    cmds:
      - turbo run lint:fix
  
  type-check:
    desc: Run TypeScript type checking
    cmds:
      - turbo run type-check
  
  format:
    desc: Format code with Prettier
    cmds:
      - prettier --write "**/*.{ts,tsx,md,json}"
  
  format:check:
    desc: Check code formatting
    cmds:
      - prettier --check "**/*.{ts,tsx,md,json}"
  
  # ============================================================================
  # Testing
  # ============================================================================
  
  test:
    desc: Run all tests
    cmds:
      - turbo run test
  
  test:watch:
    desc: Run tests in watch mode
    cmds:
      - turbo run test:watch
  
  test:coverage:
    desc: Run tests with coverage report
    cmds:
      - turbo run test:coverage
  
  test:e2e:
    desc: Run end-to-end tests
    cmds:
      - turbo run test:e2e
  
  # ============================================================================
  # Database
  # ============================================================================
  
  db:types:
    desc: Generate TypeScript types from Supabase schema
    cmds:
      - |
        pnpm supabase gen types typescript \
          --project-id {{.SUPABASE_PROJECT_ID}} \
          > packages/shared-types/src/database.ts
      - echo "Database types generated successfully!"
    vars:
      SUPABASE_PROJECT_ID:
        sh: echo ${SUPABASE_PROJECT_ID:-dmsvsfsbytemtbbqxqyi}
  
  db:migrate:
    desc: Run database migrations
    cmds:
      - pnpm supabase db push
  
  db:migrate:new:
    desc: Create new migration file
    cmds:
      - pnpm supabase migration new {{.CLI_ARGS}}
  
  db:reset:
    desc: Reset local database (WARNING: destroys all data)
    cmds:
      - pnpm supabase db reset
    prompt: This will destroy all local database data. Continue?
  
  db:seed:
    desc: Seed database with test data
    cmds:
      - pnpm tsx scripts/seed-database.ts
  
  db:studio:
    desc: Open Supabase Studio (database GUI)
    cmds:
      - pnpm supabase studio
  
  # ============================================================================
  # Supabase (Local Development)
  # ============================================================================
  
  supabase:start:
    desc: Start local Supabase instance (Docker required)
    cmds:
      - pnpm supabase start
  
  supabase:stop:
    desc: Stop local Supabase instance
    cmds:
      - pnpm supabase stop
  
  supabase:status:
    desc: Check Supabase status
    cmds:
      - pnpm supabase status
  
  # ============================================================================
  # Cleaning
  # ============================================================================
  
  clean:
    desc: Remove all build artifacts and node_modules
    cmds:
      - turbo run clean
      - rm -rf node_modules
      - echo "Clean complete!"
  
  clean:cache:
    desc: Clear Turborepo cache
    cmds:
      - turbo run build --force
  
  # ============================================================================
  # Git Helpers
  # ============================================================================
  
  git:setup:
    desc: Setup git hooks with Husky
    cmds:
      - pnpm husky install
      - echo "Git hooks installed!"
  
  # ============================================================================
  # Pre-commit Checks (run before committing)
  # ============================================================================
  
  pre-commit:
    desc: Run all pre-commit checks
    cmds:
      - task: lint
      - task: type-check
      - task: test
      - echo "✅ All pre-commit checks passed!"
  
  # ============================================================================
  # Deployment
  # ============================================================================
  
  deploy:preview:
    desc: Deploy to preview environment (Vercel)
    cmds:
      - vercel deploy
  
  deploy:production:
    desc: Deploy to production (Vercel)
    cmds:
      - vercel deploy --prod
  
  # ============================================================================
  # Documentation
  # ============================================================================
  
  docs:serve:
    desc: Serve documentation locally
    cmds:
      - echo "Serving documentation..."
      - open http://localhost:3001
      - cd docs && pnpm dev
  
  # ============================================================================
  # Utilities
  # ============================================================================
  
  check:
    desc: Check system prerequisites
    cmds:
      - echo "Checking prerequisites..."
      - node --version
      - pnpm --version
      - task --version
      - echo "✅ All prerequisites installed!"
```

### Task Descriptions

#### Setup & Installation

```bash
task setup              # First-time setup
task install            # Install dependencies
task env:copy           # Copy environment files
```

#### Development

```bash
task dev                # Start web app dev server (most common)
task dev:all            # Start all dev servers
```

#### Building

```bash
task build              # Build all packages
task build:web          # Build web app only
```

#### Code Quality

```bash
task lint               # Run ESLint
task lint:fix           # Auto-fix ESLint errors
task type-check         # TypeScript type checking
task format             # Format with Prettier
task format:check       # Check formatting
```

#### Testing

```bash
task test               # Run all tests
task test:watch         # Watch mode
task test:coverage      # With coverage
task test:e2e           # End-to-end tests
```

#### Database

```bash
task db:types           # Generate TS types from Supabase
task db:migrate         # Run migrations
task db:migrate:new     # Create new migration
task db:reset           # Reset local database
task db:seed            # Seed test data
task db:studio          # Open Supabase Studio
```

#### Supabase (Local)

```bash
task supabase:start     # Start local Supabase
task supabase:stop      # Stop local Supabase
task supabase:status    # Check status
```

#### Cleaning

```bash
task clean              # Remove build artifacts
task clean:cache        # Clear Turborepo cache
```

#### Pre-commit

```bash
task pre-commit         # Run all checks before commit
```

---

## Git Workflow

### Branch Naming Convention

```bash
# Feature branches
feat/card-search-autocomplete
feat/collection-management
feat/market-dashboard

# Bug fixes
fix/price-calculation-rounding
fix/image-loading-error
fix/mobile-layout-overflow

# Documentation
docs/update-api-documentation
docs/add-deployment-guide

# Refactoring
refactor/extract-shared-validations
refactor/simplify-db-queries

# Chores (maintenance)
chore/update-dependencies
chore/setup-ci-pipeline
```

### Commit Message Format

**Format:** `<type>(<scope>): <description>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, missing semicolons)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
git commit -m "feat(search): add autocomplete to card search"
git commit -m "fix(price): correct PSA 9 price calculation"
git commit -m "docs(api): update collection endpoint documentation"
git commit -m "refactor(db): extract shared query functions"
git commit -m "test(price): add unit tests for CT Price algorithm"
git commit -m "chore(deps): update Next.js to 14.0.4"
```

### Development Flow

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feat/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add my feature"

# 3. Run pre-commit checks
task pre-commit

# 4. Push to remote
git push origin feat/my-feature

# 5. Create pull request on GitHub
# Vercel will automatically create preview deployment

# 6. After approval, merge to main
# main branch auto-deploys to production
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run lint-staged
pnpm lint-staged
```

```json
// package.json
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

---

## Environment Setup

### Required Environment Variables

```bash
# .env.local (root)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dmsvsfsbytemtbbqxqyi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# eBay API
EBAY_APP_ID=your_app_id
EBAY_DEV_ID=your_dev_id
EBAY_CERT_ID=your_cert_id
EBAY_ENVIRONMENT=SANDBOX  # or PRODUCTION

# Internal API
INTERNAL_API_KEY=random_secret_key_change_in_production

# Upstash Redis (for caching)
UPSTASH_REDIS_URL=https://xxx.upstash.io
UPSTASH_REDIS_TOKEN=xxx

# Sentry (error tracking)
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx

# Vercel (deployment)
VERCEL_PROJECT_ID=xxx
VERCEL_ORG_ID=xxx
```

### Getting Credentials

**Supabase:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → API → Copy URL and anon key

**eBay API:**
1. Go to https://developer.ebay.com/
2. Create app
3. Copy App ID, Dev ID, Cert ID

**Upstash Redis:**
1. Go to https://console.upstash.com/
2. Create Redis database
3. Copy REST URL and token

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run linter
        run: pnpm task lint
      
      - name: Run type check
        run: pnpm task type-check
      
      - name: Run tests
        run: pnpm task test
      
      - name: Build
        run: pnpm task build
```

### Vercel Deployment

**Automatic Deployments:**
- Push to `main` → Deploy to production
- Open PR → Deploy preview
- Push to PR → Update preview

**Manual Deployment:**
```bash
# Preview deployment
task deploy:preview

# Production deployment
task deploy:production
```

---

## Troubleshooting

### Common Issues

#### Issue: "Command not found: task"

**Solution:**
```bash
# Install Taskfile
brew install go-task/tap/go-task

# Verify
task --version
```

#### Issue: "pnpm not found"

**Solution:**
```bash
# Install pnpm
npm install -g pnpm

# Verify
pnpm --version
```

#### Issue: "Type errors after pulling latest"

**Solution:**
```bash
# Regenerate database types
task db:types

# Rebuild all packages
task build --force
```

#### Issue: "Module not found after adding dependency"

**Solution:**
```bash
# Install dependencies
pnpm install

# Restart dev server
task dev
```

#### Issue: "Database connection error"

**Solution:**
```bash
# Check Supabase status
task supabase:status

# If not running, start it
task supabase:start

# Verify environment variables
cat .env.local | grep SUPABASE
```

#### Issue: "Turborepo cache issues"

**Solution:**
```bash
# Clear cache and rebuild
task clean:cache

# Or force rebuild
turbo run build --force
```

---

## Development Tips

### Daily Workflow

```bash
# Morning: Pull latest changes
git checkout main
git pull origin main

# Create feature branch
git checkout -b feat/my-feature

# Start dev server
task dev

# Make changes...
# Save files (hot reload works)

# Before committing
task pre-commit

# Commit and push
git add .
git commit -m "feat: add my feature"
git push origin feat/my-feature
```

### Keyboard Shortcuts (VS Code)

```json
// .vscode/settings.json
{
  "task.autoDetect": "on",
  "task.quickOpen": {
    "enabled": true,
    "history": 10
  }
}
```

Press `Cmd+Shift+P` → "Tasks: Run Task" → Select task

### Debugging

```bash
# Run Next.js in debug mode
NODE_OPTIONS='--inspect' task dev

# Then attach VS Code debugger (F5)
```

---

## Summary

### Essential Commands

```bash
# First time
task setup

# Daily development
task dev

# Before committing
task pre-commit

# Generate types after schema changes
task db:types

# Troubleshooting
task clean
task build --force
```

### Quick Reference Card

| Task | Command | When to Use |
|------|---------|-------------|
| Setup | `task setup` | First time only |
| Dev Server | `task dev` | Daily development |
| Build | `task build` | Before deploying |
| Lint | `task lint` | Check code quality |
| Type Check | `task type-check` | Verify types |
| Test | `task test` | Run all tests |
| Pre-commit | `task pre-commit` | Before every commit |
| DB Types | `task db:types` | After schema changes |
| Clean | `task clean` | Troubleshooting |

---

## Next Steps

1. Review `agents.md` for AI development guidelines
2. Review `monorepo-architecture.md` for package structure
3. Run `task setup` to get started
4. Read planning docs in `planning/` directory
5. Start coding with `task dev`

---

**Document Status:** ✅ Ready for Implementation  
**Last Review:** December 4, 2025  
**Next Review:** After developer onboarding feedback

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) Developer Workflow
