import React from 'react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-4 py-12 dark:bg-neutral-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-sm font-bold text-white dark:bg-neutral-100 dark:text-neutral-900">
              OS
            </span>
            <span>Personal OS</span>
          </Link>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Your private personal productivity & academic command center
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
