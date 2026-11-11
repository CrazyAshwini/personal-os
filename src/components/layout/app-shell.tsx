import React from 'react';
import { DesktopSidebar } from '@/components/navigation/desktop-sidebar';
import { MobileNav } from '@/components/navigation/mobile-nav';
import { OfflineBanner } from '@/components/layout/offline-banner';

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

        {/* Dynamic network connectivity banner */}
        <OfflineBanner />

        {/* Content area with safe bottom padding on mobile for the fixed bottom nav */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
