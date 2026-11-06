import React from 'react';
import { DesktopSidebar } from '@/components/navigation/desktop-sidebar';
import { MobileNav } from '@/components/navigation/mobile-nav';

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string | null;
  userName?: string | null;
  avatarUrl?: string | null;
}

export function AppShell({
  children,
  userEmail,
  userName,
  avatarUrl,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar (visible on md+) */}
      <DesktopSidebar
        userEmail={userEmail}
        userName={userName}
        avatarUrl={avatarUrl}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Nav (Top bar + Bottom bar on < md) */}
        <MobileNav
          userEmail={userEmail}
          userName={userName}
          avatarUrl={avatarUrl}
        />

        {/* Content area with bottom padding on mobile for the fixed bottom nav */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
