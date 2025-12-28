# Task 04: Bottom Navigation and Main Layout

**Goal:** Complete bottom navigation and responsive layout system

**Time Estimate:** 4 hours

**Phase:** Phase 0

**Dependencies:** Task 02 (Next.js + Supabase Foundation)

---

## 📖 Context

**What this task delivers:**
- Bottom navigation component (5 tabs)
- Main layout component with bottom nav
- Responsive layout (mobile: bottom nav, desktop: top nav)
- Active tab highlighting
- Navigation icons from Lucide React
- Mobile-first responsive design
- Basic testing included
- Ready for all feature modules

**Why this matters:**
Bottom navigation is the primary navigation method for mobile users (80% of CardTrail users). Thumb-friendly navigation improves UX and accessibility.

**Planning docs:**
- `planning/ui-component-hierarchy.md` - Navigation structure (Section: Navigation Structure)
- `planning/feature-breakdown.md` - Bottom nav requirements (Section: Phase 6, Task 6.5)
- `planning/frontend-architecture.md` - Layout patterns
- `planning/agents.md` - Development guidelines (MANDATORY)

---

## ✅ Requirements

**Functional Requirements:**
- [ ] Bottom navigation with 5 tabs (Market, Collection, Search, Rankings, Profile)
- [ ] Active tab highlighted
- [ ] Tapping tab navigates to route
- [ ] Fixed at bottom on mobile (< 768px)
- [ ] Hidden on desktop (show top nav instead)
- [ ] Icons from Lucide React
- [ ] Labels in Chinese and English

**Technical Requirements:**
- [ ] TypeScript strict mode
- [ ] Client component (uses usePathname)
- [ ] Responsive with Tailwind breakpoints
- [ ] Accessible (ARIA labels)

**UI/UX Requirements:**
- [ ] Follows DaisyUI theme
- [ ] Mobile-first design
- [ ] Thumb-friendly (44px tap targets)
- [ ] Active state clear

**Acceptance Criteria:**
- [ ] Bottom nav visible on mobile
- [ ] Bottom nav hidden on desktop
- [ ] Active tab highlighted correctly
- [ ] All tabs navigate correctly
- [ ] Icons display correctly
- [ ] Mobile responsive (375px)
- [ ] E2E test passes
- [ ] Deployed

---

## 📝 Implementation Approach

### 1. Create Bottom Navigation

**components/layouts/BottomNav.tsx:**
```typescript
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, Briefcase, Search, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();
  
  const tabs = [
    { href: '/market', icon: TrendingUp, label: '大盘', labelEn: 'Market' },
    { href: '/collection', icon: Briefcase, label: '持仓', labelEn: 'Collection' },
    { href: '/search', icon: Search, label: '搜卡', labelEn: 'Search' },
    { href: '/rankings', icon: Trophy, label: '榜单', labelEn: 'Rankings' },
    { href: '/profile', icon: User, label: '我的', labelEn: 'Profile' },
  ];
  
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 md:hidden z-40"
      data-testid="bottom-nav"
    >
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1',
                'transition-colors',
                isActive ? 'text-primary' : 'text-base-content/60'
              )}
              data-testid={`nav-tab-${tab.labelEn.toLowerCase()}`}
            >
              <Icon size={24} />
              <span className="text-xs">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### 2. Create Main Layout

**components/layouts/MainLayout.tsx:**
```typescript
import { BottomNav } from './BottomNav';
import { Header } from './Header';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-base-100">
      {/* Desktop: Top header */}
      <Header className="hidden md:block" />
      
      {/* Main content */}
      <main className="pb-20 md:pb-0">
        {children}
      </main>
      
      {/* Mobile: Bottom navigation */}
      <BottomNav />
    </div>
  );
}
```

**components/layouts/Header.tsx:**
```typescript
'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { SearchBar } from '@/components/features/search/SearchBar';

export function Header({ className }: { className?: string }) {
  const { user } = useAuth();
  
  return (
    <header className={cn('border-b border-base-300', className)}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold">
            CardTrail
          </Link>
          
          {/* Search bar */}
          <div className="flex-1 max-w-md">
            <SearchBar />
          </div>
          
          {/* Navigation */}
          <nav className="flex gap-4">
            <Link href="/market" className="btn btn-ghost">Market</Link>
            <Link href="/collection" className="btn btn-ghost">Collection</Link>
            <Link href="/search" className="btn btn-ghost">Search</Link>
            <Link href="/rankings" className="btn btn-ghost">Rankings</Link>
          </nav>
          
          {/* User menu */}
          {user ? (
            <div className="dropdown dropdown-end">
              <button className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full">
                  <img src={user.avatar_url || '/default-avatar.png'} alt="Avatar" />
                </div>
              </button>
              <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                <li><Link href="/profile">Profile</Link></li>
                <li><Link href="/profile/settings">Settings</Link></li>
                <li><button onClick={() => signOut()}>Logout</button></li>
              </ul>
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}
```

### 3. Update App Layout

**app/(main)/layout.tsx:**
```typescript
import { MainLayout } from '@/components/layouts/MainLayout';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
```

### 4. Testing

**E2E Test:**
```typescript
// __tests__/e2e/navigation/bottom-nav.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Bottom Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE
  
  test('bottom nav is visible on mobile', async ({ page }) => {
    await page.goto('/search');
    
    await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible();
    
    // Should have 5 tabs
    const tabs = page.locator('[data-testid^="nav-tab-"]');
    await expect(tabs).toHaveCount(5);
  });
  
  test('active tab is highlighted', async ({ page }) => {
    await page.goto('/search');
    
    const searchTab = page.locator('[data-testid="nav-tab-search"]');
    await expect(searchTab).toHaveClass(/text-primary/);
  });
  
  test('tapping tab navigates correctly', async ({ page }) => {
    await page.goto('/search');
    
    await page.click('[data-testid="nav-tab-collection"]');
    await expect(page).toHaveURL(/\/collection/);
    
    await page.click('[data-testid="nav-tab-market"]');
    await expect(page).toHaveURL(/\/market/);
  });
});

test.describe('Desktop Navigation', () => {
  test.use({ viewport: { width: 1280, height: 720 } }); // Desktop
  
  test('bottom nav is hidden on desktop', async ({ page }) => {
    await page.goto('/search');
    
    await expect(page.locator('[data-testid="bottom-nav"]')).not.toBeVisible();
  });
  
  test('top header is visible on desktop', async ({ page }) => {
    await page.goto('/search');
    
    await expect(page.locator('header')).toBeVisible();
  });
});
```

---

## ✅ Done When

- [ ] Bottom nav works on mobile
- [ ] Top nav works on desktop
- [ ] Active tab highlighted
- [ ] Navigation smooth
- [ ] E2E tests pass
- [ ] Mobile responsive
- [ ] Deployed

---

## 🔗 Related Tasks

**Depends on:**
- Task 02: Next.js + Supabase Foundation

**Blocks:**
- All feature modules (need navigation)

---

**Built with:** Agent Cube - Efficiency Mode  
**For:** CardTrail (卡迹) PTCG Price Tracker  
**Agent Guidelines:** `planning/agents.md`
