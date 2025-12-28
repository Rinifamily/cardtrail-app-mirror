# Phase 0: Project Scaffold & Setup

**Goal:** Development environment ready with complete monorepo structure

**Duration:** 2-3 days

**Prerequisites:** None

**Status:** ✅ Ready to Start (Prerequisites Complete)

---

## Prerequisites Checklist

- ✅ Supabase project configured
- ✅ Environment variables ready (.env.local created)
- ✅ Database with 28,154 cards available (card_jp table)
- ✅ GitHub CLI authenticated
- ✅ Node.js 20+ and pnpm 8+ installed

**See `PROJECT_CONFIG.md` in project root for complete configuration details.**

---

## Overview

Phase 0 establishes the complete foundation for CardTrail development. This phase creates the monorepo structure with pnpm + Turborepo, sets up Next.js 14 with shadcn/ui + DaisyUI, configures Supabase integration, and implements basic authentication. By the end of this phase, developers can start building features with a production-ready development environment.

This phase is critical because it sets up all the infrastructure, tooling, and patterns that will be used throughout the project. A solid foundation here prevents technical debt and enables rapid feature development in subsequent phases.

**Key Deliverables:**
- Monorepo structure with pnpm workspaces and Turborepo
- Next.js 14 application with App Router
- Supabase connection and authentication
- Base UI components (shadcn/ui + DaisyUI)
- CI/CD pipeline with GitHub Actions
- Taskfile for consistent development commands

## Tasks

| Task | Name | Estimate | Status |
|------|------|----------|--------|
| 01 | Complete Monorepo Setup | 8h | ⏳ Pending |
| 02 | Next.js + Supabase Foundation | 8h | ⏳ Pending |
| 03 | Testing & Dev Tools Setup | 6h | ⏳ Pending |
| 04 | Bottom Navigation & Layout | 4h | ⏳ Pending |

**Total Estimate:** 26 hours (~3 days)

## Deliverables

- [ ] Monorepo structure created with pnpm + Turborepo
- [ ] Next.js 14 app running with App Router
- [ ] Supabase connected and querying card_jp table
- [ ] shadcn/ui + DaisyUI installed and working
- [ ] Authentication flow implemented (signup, login, logout)
- [ ] Base UI components created (Button, Input, Card, Modal)
- [ ] Taskfile configured with common commands
- [ ] CI/CD pipeline running on GitHub Actions
- [ ] ESLint, Prettier, TypeScript strict mode configured
- [ ] Bottom navigation component (5 tabs)
- [ ] Main layout with responsive navigation
- [ ] Basic tests passing
- [ ] Mobile responsive
- [ ] Deployed to Vercel preview

## Success Criteria

**This phase is complete when:**
- [ ] `task dev` starts development server successfully
- [ ] Can query card_jp table from Supabase
- [ ] User can sign up, log in, and log out
- [ ] Base UI components render correctly
- [ ] TypeScript compiles with no errors
- [ ] ESLint passes with no warnings
- [ ] CI/CD pipeline passes all checks
- [ ] Preview deployment accessible on Vercel
- [ ] Mobile responsive (tested on 375px viewport)
- [ ] All 3 tasks marked as complete

## Key Technical Decisions

**Monorepo Architecture:**
- pnpm workspaces for package management (faster, more efficient than npm)
- Turborepo for build orchestration and caching
- Shared packages: shared-types, db, ui, validations, config

**UI Framework:**
- shadcn/ui for base components (Radix UI primitives + Tailwind)
- DaisyUI for pre-styled components (30+ themes, zero-runtime)
- Tailwind CSS for utility-first styling
- Mobile-first responsive design

**Authentication:**
- Supabase Auth with JWT tokens
- httpOnly cookies for security
- Email/password authentication (OAuth later)
- Row-Level Security (RLS) enforced at database level

**Development Tools:**
- Taskfile for consistent commands across team
- Husky + lint-staged for pre-commit hooks
- GitHub Actions for CI/CD
- Playwright for E2E tests, Vitest for unit tests

## Planning References

- `planning/monorepo-architecture.md` - Complete monorepo structure and package organization
- `planning/architecture-overview.md` - Overall system design and tech stack decisions
- `planning/frontend-architecture.md` - shadcn/ui + DaisyUI patterns and component organization
- `planning/backend-architecture.md` - Next.js API Routes patterns
- `planning/database-architecture.md` - Supabase setup and RLS policies
- `planning/developer-workflow.md` - Taskfile configuration and Git workflow
- `planning/agents.md` - Core development guidelines (MANDATORY reading)

## Notes

**Critical Warnings:**
- ⚠️ **NEVER modify the card_jp table** - It contains 28,154 production cards and is READ-ONLY
- ⚠️ All database extensions must reference card_jp.id via foreign keys
- ⚠️ Always use TypeScript strict mode (no `any`, no `@ts-ignore`)
- ⚠️ Always validate inputs with Zod schemas

**Tips for Success:**
- Read `planning/agents.md` before starting any task
- Follow existing patterns from planning docs
- Use Taskfile commands (not direct npm/pnpm)
- Test on mobile viewport (375px) throughout development
- Commit frequently with conventional commit messages

**Common Pitfalls:**
- Don't skip TypeScript strict mode
- Don't create custom CSS (use Tailwind utilities)
- Don't bypass Supabase RLS (use anon key, not service role)
- Don't forget mobile-first responsive design

---

**Previous Phase:** None (First Phase)  
**Next Phase:** [Phase 1: Database & Authentication](../phase-01-database-auth/README.md)
