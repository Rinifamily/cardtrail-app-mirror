# 📋 CardTrail Planning Documentation

**Last Updated:** December 4, 2025  
**Status:** Ready for Implementation  
**Version:** 2.0 (Updated with Modern Architecture)

---

## Overview

This directory contains comprehensive architecture and planning documents for CardTrail (卡迹), a Pokemon TCG price tracking application for the Chinese market. All documents are considered **Golden Sources** and must be followed during implementation.

---

## 📖 Reading Order

### For New Developers

Start here to understand the project:

1. **[Architecture Overview](architecture-overview.md)** - Start here! High-level system design
2. **[Monorepo Architecture](monorepo-architecture.md)** - NEW! Project structure with pnpm + Turborepo
3. **[Developer Workflow](developer-workflow.md)** - NEW! Taskfile commands and Git workflow
4. **[Agents.md](agents.md)** - NEW! **CRITICAL**: AI development guidelines (MUST READ)
5. **[Feature Breakdown](feature-breakdown.md)** - Implementation phases and timeline

### For AI Agents

**MANDATORY READING:**

1. **[agents.md](agents.md)** - All AI agents MUST follow these strict guidelines
2. **[Architecture Overview](architecture-overview.md)** - Understand the system
3. **[Monorepo Architecture](monorepo-architecture.md)** - Package structure and dependencies
4. All other planning docs for context

### For Frontend Developers

1. [Frontend Architecture](frontend-architecture.md) - React/Next.js patterns, shadcn/ui + DaisyUI
2. [UI Component Hierarchy](ui-component-hierarchy.md) - Component organization
3. [Data Models](data-models.md) - TypeScript types and interfaces

### For Backend Developers

1. [Backend Architecture](backend-architecture.md) - Next.js API Routes for MVP
2. [Database Architecture](database-architecture.md) - Supabase, RLS, migrations
3. [API Design](api-design.md) - REST endpoints, request/response patterns

### For DevOps/Infrastructure

1. [Monorepo Architecture](monorepo-architecture.md) - Deployment strategy
2. [Developer Workflow](developer-workflow.md) - CI/CD integration
3. [Architecture Overview](architecture-overview.md) - Hosting and scaling

---

## 📚 Complete Document Index

### 🏗️ Architecture & Structure

| Document | Description | Status | Last Updated |
|----------|-------------|--------|--------------|
| **[Architecture Overview](architecture-overview.md)** | High-level system design, tech stack decisions | ✅ Ready | Dec 4, 2025 |
| **[Monorepo Architecture](monorepo-architecture.md)** | Project structure with pnpm + Turborepo | ✨ NEW | Dec 4, 2025 |
| **[Frontend Architecture](frontend-architecture.md)** | React/Next.js, shadcn/ui + DaisyUI, component patterns | ✅ Updated | Dec 4, 2025 |
| **[Backend Architecture](backend-architecture.md)** | Next.js API Routes for MVP, future scaling | ✅ Updated | Dec 4, 2025 |
| **[Database Architecture](database-architecture.md)** | Supabase schema, RLS policies, migrations | ✅ Ready | Dec 4, 2025 |

### 📋 Development Guidelines

| Document | Description | Status | Last Updated |
|----------|-------------|--------|--------------|
| **[Agents.md](agents.md)** | **CRITICAL**: AI development guidelines (mandatory for all AI agents) | ✨ NEW | Dec 4, 2025 |
| **[Developer Workflow](developer-workflow.md)** | Taskfile commands, Git workflow, environment setup | ✨ NEW | Dec 4, 2025 |
| **[Technical Decisions](technical-decisions.md)** | Decision records and trade-offs | ✅ Ready | Dec 4, 2025 |

### 🎯 Implementation Planning

| Document | Description | Status | Last Updated |
|----------|-------------|--------|--------------|
| **[Feature Breakdown](feature-breakdown.md)** | Phase-by-phase implementation plan (6 phases) | ✅ Ready | Dec 4, 2025 |
| **[API Design](api-design.md)** | REST endpoints, request/response schemas | ✅ Ready | Dec 4, 2025 |
| **[Data Models](data-models.md)** | Database schema, TypeScript types | ✅ Ready | Dec 4, 2025 |

### 📱 UI/UX Planning

| Document | Description | Status | Last Updated |
|----------|-------------|--------|--------------|
| **[UI Component Hierarchy](ui-component-hierarchy.md)** | Component organization, page structure | ✅ Ready | Dec 4, 2025 |

### 🔬 Algorithms & Business Logic

| Document | Description | Status | Last Updated |
|----------|-------------|--------|--------------|
| **[Price Algorithm](price-algorithm.md)** | CT Price calculation specification | ✅ Ready | Dec 4, 2025 |

---

## 🚀 Quick Start

### First-Time Setup

```bash
# 1. Read the essential docs
cat planning/architecture-overview.md
cat planning/agents.md              # CRITICAL for AI agents
cat planning/developer-workflow.md

# 2. Set up development environment
task setup

# 3. Start development
task dev
```

### Daily Development

```bash
# Start dev server
task dev

# Before committing
task pre-commit

# Generate types after schema changes
task db:types
```

---

## 🎯 Quick Reference

### For Developers

**Essential Commands:**
```bash
task dev              # Start development server
task build            # Build all packages
task test             # Run all tests
task pre-commit       # Run checks before commit
task db:types         # Generate TypeScript types from Supabase
```

**Key Files:**
- [agents.md](agents.md) - Development guidelines
- [developer-workflow.md](developer-workflow.md) - All commands
- Taskfile.yml - Task definitions

### For AI Agents

**Prohibited Actions (from agents.md):**
- ❌ Never use `@ts-ignore` or `eslint-disable`
- ❌ Never use `any` type
- ❌ Never modify `card_jp` table directly
- ❌ Never bypass Row-Level Security
- ❌ Never commit secrets

**Mandatory Patterns:**
- ✅ Always validate with Zod
- ✅ Always use TypeScript strict mode
- ✅ Always handle errors gracefully
- ✅ Always use RLS for database queries
- ✅ Always follow existing code patterns

### For Project Managers

**Implementation Timeline:**
- **Phase 0** (2 weeks): Project scaffold
- **Phase 1** (4 weeks): Core infrastructure (eBay integration)
- **Phase 2** (3 weeks): MVP - Card search + profiles
- **Phase 3** (3 weeks): Collection management
- **Phase 4** (3 weeks): Market dashboard
- **Phase 5** (2 weeks): Rankings
- **Phase 6** (2 weeks): User profiles

**MVP Launch:** After Phase 2 (Week 10)

---

## 📖 Document Summaries

### [Architecture Overview](architecture-overview.md)
**What:** Complete system design, tech stack, deployment strategy  
**When to Read:** First document to read, reference for all decisions  
**Key Topics:** Next.js, Supabase, mobile-first design, performance targets

### [Monorepo Architecture](monorepo-architecture.md) ✨ NEW
**What:** Project structure with pnpm workspaces and Turborepo  
**When to Read:** Before setting up project, when adding new packages  
**Key Topics:** Package organization, build orchestration, dependency management

### [Frontend Architecture](frontend-architecture.md) ✅ UPDATED
**What:** React/Next.js patterns, shadcn/ui + DaisyUI recommendation  
**When to Read:** Before building any UI component  
**Key Topics:** Server vs Client components, forms, state management, i18n

### [Backend Architecture](backend-architecture.md) ✅ UPDATED
**What:** Next.js API Routes for MVP, future scaling strategy  
**When to Read:** Before creating any API endpoint  
**Key Topics:** API patterns, auth, error handling, rate limiting, caching

### [Database Architecture](database-architecture.md)
**What:** Supabase schema, RLS policies, indexing strategy  
**When to Read:** Before database queries, when creating migrations  
**Key Topics:** Tables, relationships, security, type generation

### [Agents.md](agents.md) ✨ NEW - **CRITICAL**
**What:** Strict guidelines for AI-assisted development  
**When to Read:** **BEFORE ANY CODE GENERATION**  
**Key Topics:** Prohibited actions, mandatory patterns, code quality rules

### [Developer Workflow](developer-workflow.md) ✨ NEW
**What:** Taskfile commands, Git workflow, environment setup  
**When to Read:** During first-time setup, when unsure of commands  
**Key Topics:** Task commands, branch naming, commit format, troubleshooting

### [Feature Breakdown](feature-breakdown.md)
**What:** Phase-by-phase implementation plan with time estimates  
**When to Read:** For sprint planning, to understand priorities  
**Key Topics:** 6 implementation phases, MVP definition, testing strategy

### [API Design](api-design.md)
**What:** Complete REST API specification with examples  
**When to Read:** Before implementing any API endpoint  
**Key Topics:** Endpoints, request/response formats, authentication

### [Data Models](data-models.md)
**What:** Database schema and TypeScript interfaces  
**When to Read:** When working with database or types  
**Key Topics:** Table definitions, relationships, validation rules

### [UI Component Hierarchy](ui-component-hierarchy.md)
**What:** Component organization and page structure  
**When to Read:** Before building any page or component  
**Key Topics:** Page hierarchy, component tree, responsive design

### [Price Algorithm](price-algorithm.md)
**What:** CT Price calculation algorithm specification  
**When to Read:** When implementing price features  
**Key Topics:** Weighted average, outlier removal, grading adjustments

### [Technical Decisions](technical-decisions.md)
**What:** Decision records for tech stack choices  
**When to Read:** To understand WHY we chose each technology  
**Key Topics:** Framework, database, state management, hosting

---

## 🔍 Finding Information

### "How do I...?"

| Question | Document | Section |
|----------|----------|---------|
| Set up my development environment? | [Developer Workflow](developer-workflow.md) | Installation & Setup |
| Create a new API endpoint? | [Backend Architecture](backend-architecture.md) | API Structure |
| Add a new UI component? | [Frontend Architecture](frontend-architecture.md) | Component Organization |
| Query the database? | [Database Architecture](database-architecture.md) | Data Access Patterns |
| Calculate CT Price? | [Price Algorithm](price-algorithm.md) | Algorithm Specification |
| Follow AI guidelines? | [Agents.md](agents.md) | All sections (READ ALL) |
| Use Taskfile commands? | [Developer Workflow](developer-workflow.md) | Common Tasks |
| Understand the tech stack? | [Architecture Overview](architecture-overview.md) | Tech Stack |
| Deploy to production? | [Monorepo Architecture](monorepo-architecture.md) | Deployment Strategy |

---

## ✅ Document Status

All planning documents are **production-ready** and approved for implementation.

**Legend:**
- ✅ Ready: Complete and approved
- ✨ NEW: New document (v2.0)
- ⚠️ In Progress: Incomplete, do not implement yet
- 🔄 Review: Needs update

**Current Status:** All documents ✅ Ready

---

## 🔄 Document Maintenance

### When to Update

1. **After Major Milestones**: Update after Phase 1, 2, 3 completion
2. **Tech Stack Changes**: Update immediately if we change frameworks
3. **Architecture Changes**: Update before implementing changes
4. **Feedback**: Update based on developer feedback

### How to Update

1. Read existing document
2. Make changes in separate branch
3. Get review from 2+ team members
4. Merge and update "Last Updated" date
5. Notify team in Slack/Discord

---

## 💬 Need Help?

### For Developers

1. **Check this README** for document index
2. **Read [agents.md](agents.md)** for development rules
3. **Read [developer-workflow.md](developer-workflow.md)** for commands
4. **Search planning docs** for specific topics
5. **Ask in #dev channel** if stuck

### For AI Agents

1. **READ [agents.md](agents.md) FIRST** - Mandatory
2. **Follow all planning docs** - Source of truth
3. **When in doubt** - Ask for human review
4. **Never violate prohibited actions** - Will be rejected

---

## 🎓 Learning Path

### Week 1: Orientation
- [ ] Read [Architecture Overview](architecture-overview.md)
- [ ] Read [Monorepo Architecture](monorepo-architecture.md)
- [ ] Read [Agents.md](agents.md) (if using AI tools)
- [ ] Complete [Developer Workflow](developer-workflow.md) setup
- [ ] Run `task dev` successfully

### Week 2: Deep Dive
- [ ] Read [Frontend Architecture](frontend-architecture.md)
- [ ] Read [Backend Architecture](backend-architecture.md)
- [ ] Read [Database Architecture](database-architecture.md)
- [ ] Explore codebase structure
- [ ] Build first component

### Week 3: Implementation
- [ ] Read [Feature Breakdown](feature-breakdown.md)
- [ ] Read [API Design](api-design.md)
- [ ] Read [UI Component Hierarchy](ui-component-hierarchy.md)
- [ ] Implement first task
- [ ] Submit first PR

---

## 📝 Notes

### What's New in v2.0 (Dec 4, 2025)

**New Documents:**
- ✨ [Monorepo Architecture](monorepo-architecture.md) - pnpm + Turborepo structure
- ✨ [Agents.md](agents.md) - AI development guidelines (CRITICAL)
- ✨ [Developer Workflow](developer-workflow.md) - Taskfile commands

**Updated Documents:**
- ✅ [Frontend Architecture](frontend-architecture.md) - Added shadcn/ui + DaisyUI
- ✅ [Backend Architecture](backend-architecture.md) - Simplified to Next.js API Routes for MVP
- ✅ [README.md](README.md) - Comprehensive index with all new docs

**Key Changes:**
- Adopted monorepo architecture with pnpm + Turborepo
- Chose shadcn/ui + DaisyUI for UI (over 21st.dev)
- Simplified backend to Next.js API Routes (no separate service for MVP)
- Added strict AI development guidelines
- Introduced Taskfile for consistent commands

---

**Document Status:** ✅ Complete and Ready  
**Version:** 2.0  
**Last Review:** December 4, 2025  
**Next Review:** After Phase 2 MVP launch

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) Planning Documentation
