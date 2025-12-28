# Task 01: Complete Monorepo Setup with pnpm + Turborepo

**Goal:** Production-ready monorepo structure with all shared packages

**Time Estimate:** 8 hours

**Phase:** Phase 0

**Dependencies:** None

---

## 📖 Context

**What this task delivers:**
- Complete monorepo structure with pnpm workspaces
- Turborepo for build orchestration and caching
- Shared packages (shared-types, db, ui, validations, config)
- Taskfile for consistent development commands
- ESLint, Prettier, TypeScript configurations
- Basic testing included
- Mobile responsive
- Ready for feature development

**Why this matters:**
This task establishes the foundation for all future development. A well-structured monorepo enables code sharing, type safety across packages, and faster builds with Turborepo caching. The shared packages prevent code duplication and ensure consistency.

**Planning docs:**
- `planning/monorepo-architecture.md` - Complete monorepo structure (CRITICAL - read sections: Monorepo Structure, Package Dependencies, Code Sharing Patterns)
- `planning/developer-workflow.md` - Taskfile configuration (Section: Taskfile: Why and How, Common Tasks)
- `planning/architecture-overview.md` - Tech stack decisions (Section: Tech Stack, Development Tools)
- `planning/agents.md` - Core development guidelines (MANDATORY reading)

---

## ✅ Requirements

**Functional Requirements:**
- [ ] Monorepo structure matches planning/monorepo-architecture.md
- [ ] pnpm workspaces configured correctly
- [ ] Turborepo caching and build pipeline working
- [ ] All shared packages created (shared-types, db, ui, validations, config)
- [ ] Taskfile commands working (task dev, task build, task test)
- [ ] Package dependencies correct (no circular dependencies)

**Technical Requirements:**
- [ ] TypeScript strict mode enabled
- [ ] ESLint configured with shared config
- [ ] Prettier configured for consistent formatting
- [ ] pnpm version ≥8.0.0
- [ ] Node version ≥20.0.0
- [ ] Turborepo version ≥1.11.0
- [ ] All packages have correct package.json
- [ ] Workspace protocol used for internal dependencies

**Acceptance Criteria:**
- [ ] `pnpm install` completes successfully
- [ ] `task dev` starts development server
- [ ] `task build` builds all packages
- [ ] `task lint` passes with no errors
- [ ] `task type-check` passes with no errors
- [ ] Turborepo cache working (second build is instant)
- [ ] All shared packages importable from apps/web
- [ ] No circular dependency errors

---

## 📝 Implementation Approach

### 1. Create Root Structure

**Directory Structure:**
```
cardtrail-app/
├── apps/
│   └── web/                    # Next.js web application
├── packages/
│   ├── shared-types/           # Shared TypeScript types
│   ├── db/                     # Supabase client wrapper
│   ├── ui/                     # Shared UI components
│   ├── validations/            # Zod validation schemas
│   └── config/                 # Shared configs
├── supabase/                   # Supabase migrations
├── scripts/                    # Build and deployment scripts
├── .github/workflows/          # GitHub Actions
├── package.json                # Root package.json
├── pnpm-workspace.yaml         # pnpm workspace config
├── turbo.json                  # Turborepo config
├── Taskfile.yml                # Task runner config
└── README.md
```

**Root package.json:**
```json
{
  "name": "cardtrail-monorepo",
  "private": true,
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\""
  },
  "devDependencies": {
    "@turbo/gen": "^1.11.0",
    "prettier": "^3.1.0",
    "turbo": "^1.11.0",
    "typescript": "^5.3.0",
    "eslint": "^8.55.0"
  }
}
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 2. Configure Turborepo

**turbo.json:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    "**/.env.*local",
    "tsconfig.json",
    ".eslintrc.js"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 3. Create Shared Packages

**packages/shared-types/package.json:**
```json
{
  "name": "@cardtrail/shared-types",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

**packages/db/package.json:**
```json
{
  "name": "@cardtrail/db",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "@cardtrail/shared-types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

**packages/ui/package.json:**
```json
{
  "name": "@cardtrail/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "@cardtrail/shared-types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0"
  }
}
```

### 4. Configure Taskfile

**Taskfile.yml:**
```yaml
version: '3'

tasks:
  setup:
    desc: First-time setup
    cmds:
      - pnpm install
      - cp .env.example .env.local || true
      - echo "Setup complete! Run 'task dev' to start."
  
  dev:
    desc: Start development server
    cmds:
      - turbo run dev --filter=@cardtrail/web
  
  build:
    desc: Build all packages
    cmds:
      - turbo run build
  
  lint:
    desc: Run ESLint
    cmds:
      - turbo run lint
  
  type-check:
    desc: Run TypeScript type checking
    cmds:
      - turbo run type-check
  
  test:
    desc: Run all tests
    cmds:
      - turbo run test
  
  clean:
    desc: Remove build artifacts
    cmds:
      - turbo run clean
      - rm -rf node_modules
```

### 5. Testing

**Create basic test:**
```typescript
// packages/shared-types/__tests__/index.test.ts
import { describe, it, expect } from 'vitest';

describe('shared-types package', () => {
  it('should export types correctly', () => {
    // Basic smoke test
    expect(true).toBe(true);
  });
});
```

### 6. Deployment

- [ ] Initialize git repository
- [ ] Create .gitignore (node_modules, .next, .env.local)
- [ ] Commit initial structure
- [ ] Push to GitHub
- [ ] Verify structure in GitHub

---

## 🏗️ Key Principles

### KISS (Keep It Simple)
- ✅ Use standard pnpm workspaces (no custom tooling)
- ✅ Follow Turborepo defaults (minimal configuration)
- ✅ Use conventional package structure
- ❌ No custom build scripts
- ❌ No complex package dependencies

### DRY (Don't Repeat Yourself)
- ✅ Shared TypeScript configs in packages/config
- ✅ Shared ESLint config
- ✅ Shared Tailwind config
- ✅ Reusable types in shared-types
- ❌ No duplicate configurations

### Must Follow
- `planning/monorepo-architecture.md` - Package structure and dependencies
- `planning/developer-workflow.md` - Taskfile commands
- `planning/agents.md` - Core development rules
- TypeScript strict mode (no `any`, no `@ts-ignore`)
- Conventional commit messages

---

## 🚀 Step-by-Step Execution

### Step 1: Initialize Monorepo (1 hour)
- [ ] Create root directory structure
- [ ] Create root package.json
- [ ] Create pnpm-workspace.yaml
- [ ] Create turbo.json
- [ ] Install pnpm and Turborepo
- [ ] Run `pnpm install`

### Step 2: Create Shared Packages (2 hours)
- [ ] Create packages/shared-types
- [ ] Create packages/db
- [ ] Create packages/ui
- [ ] Create packages/validations
- [ ] Create packages/config
- [ ] Add package.json to each
- [ ] Add tsconfig.json to each
- [ ] Test imports work

### Step 3: Configure Taskfile (1 hour)
- [ ] Create Taskfile.yml
- [ ] Add common tasks (dev, build, lint, test)
- [ ] Test all tasks work
- [ ] Document tasks in README

### Step 4: Configure Tooling (2 hours)
- [ ] Set up ESLint with shared config
- [ ] Set up Prettier
- [ ] Configure TypeScript strict mode
- [ ] Add .gitignore
- [ ] Add .editorconfig
- [ ] Test linting and formatting

### Step 5: Testing (1 hour)
- [ ] Add basic test to each package
- [ ] Configure Vitest
- [ ] Run `task test` and verify passes
- [ ] Add test scripts to package.json

### Step 6: Documentation (1 hour)
- [ ] Update root README.md
- [ ] Document package structure
- [ ] Document Taskfile commands
- [ ] Add setup instructions
- [ ] Commit and push

---

## ✅ Done When

**This task is complete when:**
- [ ] Monorepo structure created
- [ ] All shared packages exist
- [ ] `pnpm install` works
- [ ] `task dev` works (even if app is minimal)
- [ ] `task build` builds all packages
- [ ] `task lint` passes
- [ ] `task type-check` passes
- [ ] Turborepo caching works
- [ ] Code committed and pushed to GitHub

**No need for:**
- ❌ Perfect package implementations (just structure)
- ❌ Complete UI components (next task)
- ❌ Database integration (next task)
- ❌ Comprehensive tests (basic tests sufficient)

---

## 🔗 Related Tasks

**Depends on:**
- None (first task)

**Blocks:**
- Task 02: Next.js + Supabase Foundation
- Task 03: Testing & Dev Tools Setup
- All subsequent tasks

**Related:**
- Phase 1, Task 03: Database Access Layer (uses @cardtrail/db package)

---

## 📚 Resources

**Planning Documents:**
- `planning/monorepo-architecture.md` - Complete monorepo guide
- `planning/developer-workflow.md` - Taskfile configuration
- `planning/agents.md` - Development guidelines

**External Resources:**
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Taskfile Documentation](https://taskfile.dev)

---

**Built with:** Agent Cube - Efficiency Mode  
**For:** CardTrail (卡迹) PTCG Price Tracker  
**Agent Guidelines:** `planning/agents.md`
