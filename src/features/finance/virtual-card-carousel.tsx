'use client';

import React, { useRef } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  Pencil,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  computeCreditUsage,
  formatDateIN,
  formatINR,
} from './finance-calculations';
import type {
  FinanceAccountRow,
  FinanceAccountSnapshotItem,
} from './finance-types';

const KIND_LABELS: Record<FinanceAccountRow['kind'], string> = {
  bank: 'Bank Account',
  wallet: 'Digital Wallet',
  credit_card: 'Credit Card',
  pay_later: 'Pay Later (BNPL)',
};

function AccountKindIcon({ kind }: { kind: FinanceAccountRow['kind'] }) {
  if (kind === 'credit_card' || kind === 'pay_later') {
    return <CreditCard className="h-4 w-4" />;
  }
  if (kind === 'wallet') {
    return <Wallet className="h-4 w-4" />;
  }
  return <Landmark className="h-4 w-4" />;
}

export function VirtualCardCarousel({
  accounts,
  snapshots = [],
  selectedAccountId,
  onSelectAccount,
  onSnapshotAccount,
  onEditAccount,
}: {
  accounts: FinanceAccountRow[];
  snapshots?: FinanceAccountSnapshotItem[];
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string) => void;
  onSnapshotAccount: (account: FinanceAccountRow) => void;
  onEditAccount: (account: FinanceAccountRow) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 310, behavior: 'smooth' });
  };

  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        No active accounts yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          Accounts &amp; Cards
        </h3>
        <div className="hidden sm:flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => scrollByCard(-1)}
            aria-label="Scroll cards left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => scrollByCard(1)}
            aria-label="Scroll cards right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
      >
        {accounts.map((acc) => {
          const isDebt = acc.kind === 'credit_card' || acc.kind === 'pay_later';
          const isSelected = selectedAccountId === acc.id;
          const usage = isDebt ? computeCreditUsage(acc, snapshots) : null;
          const latestSnap = snapshots
            .filter((s) => s.account_id === acc.id)
            .sort((a, b) => b.as_of.localeCompare(a.as_of))[0];

          const initials =
            acc.institution
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase() || 'MN';

          return (
            <div
              key={acc.id}
              onClick={() => onSelectAccount(acc.id)}
              className={`snap-start shrink-0 w-[285px] sm:w-[310px] rounded-2xl border p-4 cursor-pointer transition-all select-none ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-card shadow-md'
                  : 'border-border bg-card/80 hover:border-primary/40 hover:shadow-xs'
              } ${!acc.active ? 'opacity-60' : ''}`}
              style={{
                backgroundImage: `linear-gradient(135deg, ${acc.accent || '#059669'}18 0%, transparent 65%)`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: acc.accent || '#059669' }}
                  >
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate text-foreground">
                      {acc.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {acc.institution} · •••• {acc.masked_suffix}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSnapshotAccount(acc);
                    }}
                    title="Record balance checkpoint / statement snapshot"
                    className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditAccount(acc);
                    }}
                    title="Edit account"
                    className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 uppercase tracking-wider font-medium">
                    <AccountKindIcon kind={acc.kind} />
                    {KIND_LABELS[acc.kind]}
                  </span>
                  {!acc.active && (
                    <Badge variant="outline" className="text-[9px] py-0 h-4">
                      Archived
                    </Badge>
                  )}
                </div>

                {isDebt && usage ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">
                          Current Due / Used
                        </span>
                        <span className="text-xl font-bold tabular-nums text-foreground">
                          {formatINR(usage.outstanding)}
                        </span>
                      </div>
                      {usage.availableCredit !== null && (
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">
                            Available
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatINR(usage.availableCredit)}
                          </span>
                        </div>
                      )}
                    </div>

                    {usage.creditLimit !== null && usage.utilizationPercent !== null && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">
                            Utilization ({usage.utilizationPercent}%)
                          </span>
                          <span
                            className={`font-semibold ${
                              usage.band === 'high'
                                ? 'text-rose-600 dark:text-rose-400'
                                : usage.band === 'medium'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {usage.band === 'high'
                              ? 'High use'
                              : usage.band === 'medium'
                                ? 'Medium use'
                                : 'Smart use'}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              usage.band === 'high'
                                ? 'bg-rose-500'
                                : usage.band === 'medium'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, usage.utilizationPercent)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-1">
                    <span className="text-[10px] text-muted-foreground block">
                      Available Balance
                    </span>
                    <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatINR(
                        latestSnap?.balance !== null && latestSnap?.balance !== undefined
                          ? latestSnap.balance
                          : acc.balance
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  {acc.due_day
                    ? `Due ${acc.due_day}th${acc.billing_day ? ` · Bill ${acc.billing_day}th` : ''}`
                    : acc.notes?.slice(0, 28) || 'Active account'}
                </span>
                {latestSnap && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="h-3 w-3" />
                    {formatDateIN(latestSnap.as_of)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
