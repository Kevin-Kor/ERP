'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Youtube, Coffee } from 'lucide-react';

const navItems = [
  {
    href: '/',
    label: 'YouTube 데이터',
    icon: Youtube,
  },
  {
    href: '/cafe',
    label: '카페 자동화',
    icon: Coffee,
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center gap-6">
          <span className="font-semibold text-lg">도구 모음</span>
          <div className="flex gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
