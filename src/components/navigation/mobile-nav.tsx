'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mobilePrimaryNav, navSections } from '@/components/navigation/nav-items';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationCenter } from '@/features/notifications/notification-center';
import { signOutAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Menu } from 'lucide-react';

interface MobileNavProps {
  userEmail?: string | null;
  userName?: string | null;
  avatarUrl?: string | null;
}

export function MobileNav({ userEmail, userName, avatarUrl }: MobileNavProps) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : userEmail?.slice(0, 2).toUpperCase() || 'OS';

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 h-14 border-b border-border bg-card/80 backdrop-blur-sm px-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            OS
          </span>
          <span className="text-sm font-semibold tracking-tight">Personal OS</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <NotificationCenter />
          <ThemeToggle />
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors cursor-pointer outline-none">
              <Avatar className="h-6 w-6 text-[10px]">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || ''} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 flex flex-col">
              <SheetHeader className="p-4 border-b border-border text-left">
                <SheetTitle className="text-sm font-semibold">Personal OS Menu</SheetTitle>
                <div className="flex items-center gap-2.5 pt-2">
                  <Avatar className="h-8 w-8 text-xs">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || ''} />}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium truncate">{userName || 'Personal OS User'}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{userEmail}</span>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {navSections.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <h5 className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </h5>
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const isActive =
                          pathname === item.href || pathname.startsWith(`${item.href}/`);
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSheetOpen(false)}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium ${
                              isActive
                                ? 'bg-primary text-primary-foreground font-semibold'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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

              <div className="p-4 border-t border-border">
                <form action={signOutAction} className="w-full">
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs text-red-600 dark:text-red-400"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-2" />
                    Sign Out
                  </Button>
                </form>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 border-t border-border bg-card/90 backdrop-blur-md px-2 flex items-center justify-around">
        {mobilePrimaryNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 mb-0.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span>{item.title}</span>
            </Link>
          );
        })}

        <button
          onClick={() => setSheetOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5 mb-0.5 stroke-2" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
