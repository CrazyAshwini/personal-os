'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navSections } from '@/components/navigation/nav-items';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationCenter } from '@/features/notifications/notification-center';
import { signOutAction } from '@/lib/auth/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface DesktopSidebarProps {
  userEmail?: string | null;
  userName?: string | null;
  avatarUrl?: string | null;
}

export function DesktopSidebar({
  userEmail,
  userName,
  avatarUrl,
}: DesktopSidebarProps) {
  const pathname = usePathname();

  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : userEmail?.slice(0, 2).toUpperCase() || 'OS';

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-sidebar-border bg-sidebar h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-14 border-b border-sidebar-border flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-xs">
            OS
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight leading-tight text-sidebar-foreground">
              Personal OS
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              Private Life OS
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationCenter />
          <ThemeToggle />
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            <h4 className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/85">
              {section.title}
            </h4>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Footer Profile & Sign Out */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer group"
          title="Open Profile & Settings"
        >
          <Avatar className="h-7 w-7 text-xs border border-sidebar-border">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || ''} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left truncate flex-1 min-w-0">
            <span className="text-xs font-medium truncate w-full text-sidebar-foreground group-hover:text-primary transition-colors">
              {userName || userEmail?.split('@')[0]}
            </span>
            <span className="text-[10px] text-muted-foreground truncate w-full">
              {userEmail}
            </span>
          </div>
        </Link>

        <form action={signOutAction} className="w-full">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full justify-center text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/40 cursor-pointer gap-1.5 font-medium rounded-lg"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </form>
      </div>
    </aside>
  );
}
