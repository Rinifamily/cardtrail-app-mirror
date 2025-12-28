'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, Home, Search, TrendingUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { name: '大盘', href: '/market', icon: Home },
  { name: '持仓', href: '/collection', icon: Briefcase },
  { name: '搜卡', href: '/search', icon: Search },
  { name: '榜单', href: '/rankings', icon: TrendingUp },
  { name: '我的', href: '/profile', icon: User },
] as const;

type Tab = (typeof tabs)[number];

function renderNavLink(tab: Tab, isActive: boolean, layout: 'horizontal' | 'vertical') {
  const { name, href, icon: Icon } = tab;

  return (
    <Link
      key={href}
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 transition-colors',
        layout === 'vertical' ? 'flex-col gap-1 text-xs' : 'text-sm font-medium',
        isActive ? 'text-primary' : 'text-base-content/70 hover:text-primary'
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{name}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      data-testid="bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-base-300 bg-base-100/95 backdrop-blur md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return renderNavLink(tab, isActive, 'vertical');
        })}
      </div>
    </nav>
  );
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 hidden border-b border-base-300 bg-base-100/90 backdrop-blur md:block">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <span className="text-lg font-semibold">CardTrail 卡迹</span>
        <div className="flex items-center gap-4">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return renderNavLink(tab, isActive, 'horizontal');
          })}
        </div>
      </div>
    </nav>
  );
}
