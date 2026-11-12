'use client';

import React, { useMemo, useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  BarChart3,
  Bot,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  Pencil,
  PiggyBank,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddAccountDialog } from '@/features/finance/add-account-dialog';
import { AddBillDialog } from '@/features/finance/add-bill-dialog';
import { AddTransactionDialog } from '@/features/finance/add-transaction-dialog';
import {
  computeBudgetStatuses,
  computeCategorySpending,
  computeCreditUsage,
  computeEmiAgreementsSummary,
  computeFinanceSummary,
  computeMonthlySpendAnalytics,
  computePersonalLoansSummary,
  estimatedFdAccruedToday,
  formatDateIN,
  formatINR,
  monthLabel,
  shiftMonth,
  todayIST,
} from '@/features/finance/finance-calculations';
import {
  AccountSnapshotDialog,
  AddFixedDepositDialog,
  AddLoanOrEmiDialog,
  EditAccountDialog,
  EditTransactionDialog,
  PayBillDialog,
} from '@/features/finance/finance-dialogs';
import { FinanceAnalyticsTab } from '@/features/finance/finance-analytics-tab';
import { FinancePeopleSplitsTab } from '@/features/finance/finance-people-splits-tab';
import { FinanceToolsTab } from '@/features/finance/finance-tools-tab';
import {
  loadLocalExtendedRaw,
  parseLocalExtendedState,
  saveLocalExtendedState,
  subscribeLocalExtendedState,
  type ExtendedFinanceState,
} from '@/features/finance/moneynest-demo';
import {
  deleteAccountAction,
  deleteBillAction,
  deleteEmiAgreementAction,
  deleteFDAction,
  deleteLoanAction,
  deleteTransactionAction,
  payEmiAction,
  payEmiAgreementInstallmentAction,
  seedMoneyNestDemoDataAction,
  toggleAccountActiveAction,
  toggleBillStatusAction,
} from '@/features/finance/native-actions';
import { NestBotDrawer } from '@/features/finance/nestbot-drawer';
import { VirtualCardCarousel } from '@/features/finance/virtual-card-carousel';
import type {
  FinanceAccountRow,
  FinanceAccountSnapshotItem,
  FinanceBillRow,
  FinanceTransactionRow,
  NativeFinanceWorkspace,
} from '@/features/finance/finance-types';

interface NativeFinanceViewProps {
  initialWorkspace: NativeFinanceWorkspace;
}

function mergeExtendedWorkspace(
  server: NativeFinanceWorkspace,
  local: ExtendedFinanceState
): ExtendedFinanceState {
  return {
    snapshots:
      server.snapshots && server.snapshots.length > 0 ? server.snapshots : local.snapshots,
    budgets:
      server.budgets && Object.keys(server.budgets).length > 0
        ? server.budgets
        : local.budgets,
    personalLoans:
      server.personalLoans && server.personalLoans.length > 0
        ? server.personalLoans
        : local.personalLoans,
    expenseGroups:
      server.expenseGroups && server.expenseGroups.length > 0
        ? server.expenseGroups
        : local.expenseGroups,
    emiAgreements:
      server.emiAgreements && server.emiAgreements.length > 0
        ? server.emiAgreements
        : local.emiAgreements,
    orders: server.orders && server.orders.length > 0 ? server.orders : local.orders,
  };
}

export function NativeFinanceView({ initialWorkspace }: NativeFinanceViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('overview');
  const [activeMonth, setActiveMonth] = useState(() => todayIST().slice(0, 7));
  const [spendingMode, setSpendingMode] = useState<'gross' | 'net'>('gross');

  const localRaw = useSyncExternalStore(
    subscribeLocalExtendedState,
    () => loadLocalExtendedRaw(initialWorkspace.userId),
    () => ''
  );

  const extended = useMemo(
    () => mergeExtendedWorkspace(initialWorkspace, parseLocalExtendedState(localRaw || null)),
    [initialWorkspace, localRaw]
  );

  const updateExtended = (updater: (prev: ExtendedFinanceState) => ExtendedFinanceState) => {
    const next = updater(extended);
    saveLocalExtendedState(initialWorkspace.userId, next);
  };

  const fullWorkspace: NativeFinanceWorkspace = useMemo(
    () => ({
      ...initialWorkspace,
      ...extended,
    }),
    [initialWorkspace, extended]
  );

  // Selected & interactive dialog states
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    () => initialWorkspace.accounts[0]?.id ?? null
  );
  const [accountFilter, setAccountFilter] = useState<'all' | 'bank_wallet' | 'credit' | 'archived'>(
    'all'
  );
  const [editAccountTarget, setEditAccountTarget] = useState<FinanceAccountRow | null>(null);
  const [snapshotTarget, setSnapshotTarget] = useState<FinanceAccountRow | null>(null);
  const [editTxTarget, setEditTxTarget] = useState<FinanceTransactionRow | null>(null);
  const [payBillTarget, setPayBillTarget] = useState<FinanceBillRow | null>(null);
  const [nestBotOpen, setNestBotOpen] = useState(false);

  // Transaction ledger filters
  const [txSearch, setTxSearch] = useState('');
  const [txKindFilter, setTxKindFilter] = useState('all');
  const [txAccountFilter, setTxAccountFilter] = useState('all');
  const [txPeriodFilter, setTxPeriodFilter] = useState<'month' | 'all'>('all');

  const refreshWorkspace = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const metrics = useMemo(
    () =>
      computeFinanceSummary(
        fullWorkspace.accounts,
        fullWorkspace.transactions,
        fullWorkspace.fixedDeposits,
        fullWorkspace.loans
      ),
    [fullWorkspace]
  );

  const monthStats = useMemo(
    () => computeMonthlySpendAnalytics(fullWorkspace.transactions, activeMonth),
    [fullWorkspace.transactions, activeMonth]
  );

  const categoryChartData = useMemo(
    () => computeCategorySpending(fullWorkspace.transactions, activeMonth, spendingMode),
    [fullWorkspace.transactions, activeMonth, spendingMode]
  );

  const budgetAlerts = useMemo(
    () =>
      computeBudgetStatuses(
        extended.budgets,
        fullWorkspace.transactions,
        activeMonth,
        spendingMode
      ).filter((b) => b.status === 'over' || b.status === 'warning'),
    [extended.budgets, fullWorkspace.transactions, activeMonth, spendingMode]
  );

  const creditAccounts = useMemo(
    () =>
      fullWorkspace.accounts.filter(
        (a) => a.active && (a.kind === 'credit_card' || a.kind === 'pay_later')
      ),
    [fullWorkspace.accounts]
  );

  const creditTotals = useMemo(() => {
    let totalLimit = 0;
    let totalAvail = 0;
    let totalUsed = 0;
    for (const acc of creditAccounts) {
      const usage = computeCreditUsage(acc, extended.snapshots);
      totalUsed += usage.outstanding;
      if (usage.creditLimit !== null) totalLimit += usage.creditLimit;
      if (usage.availableCredit !== null) totalAvail += usage.availableCredit;
    }
    return {
      totalLimit,
      totalAvail,
      totalUsed,
      utilPct: totalLimit > 0 ? Number(((totalUsed / totalLimit) * 100).toFixed(1)) : null,
    };
  }, [creditAccounts, extended.snapshots]);

  const personalLoansSummary = useMemo(
    () => computePersonalLoansSummary(extended.personalLoans),
    [extended.personalLoans]
  );

  const emiSummary = useMemo(
    () => computeEmiAgreementsSummary(extended.emiAgreements),
    [extended.emiAgreements]
  );

  const filteredAccounts = useMemo(() => {
    return fullWorkspace.accounts.filter((a) => {
      if (accountFilter === 'archived') return !a.active;
      if (!a.active) return false;
      if (accountFilter === 'bank_wallet') return a.kind === 'bank' || a.kind === 'wallet';
      if (accountFilter === 'credit') return a.kind === 'credit_card' || a.kind === 'pay_later';
      return true;
    });
  }, [fullWorkspace.accounts, accountFilter]);

  const selectedAccount = useMemo(
    () =>
      fullWorkspace.accounts.find((a) => a.id === selectedAccountId) ??
      fullWorkspace.accounts[0] ??
      null,
    [fullWorkspace.accounts, selectedAccountId]
  );

  const selectedAccountTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    return fullWorkspace.transactions.filter(
      (tx) => tx.account_id === selectedAccount.id || tx.to_account_id === selectedAccount.id
    );
  }, [fullWorkspace.transactions, selectedAccount]);

  const filteredTransactions = useMemo(() => {
    const q = txSearch.toLowerCase().trim();
    return fullWorkspace.transactions.filter((tx) => {
      if (txPeriodFilter === 'month' && !tx.occurred_on.startsWith(`${activeMonth}-`)) {
        return false;
      }
      if (txKindFilter !== 'all' && tx.kind !== txKindFilter) return false;
      if (
        txAccountFilter !== 'all' &&
        tx.account_id !== txAccountFilter &&
        tx.to_account_id !== txAccountFilter
      ) {
        return false;
      }
      if (q) {
        const hay = [
          tx.description,
          tx.category,
          tx.merchant || '',
          tx.notes || '',
          String(tx.amount),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [fullWorkspace.transactions, txPeriodFilter, activeMonth, txKindFilter, txAccountFilter, txSearch]);

  const handleSeedDemo = () => {
    startTransition(async () => {
      const res = await seedMoneyNestDemoDataAction();
      if (res.demoExtended) {
        saveLocalExtendedState(initialWorkspace.userId, res.demoExtended);
      }
      router.refresh();
    });
  };

  const handleDeleteTx = async (txId: string) => {
    await deleteTransactionAction(txId);
    refreshWorkspace();
  };

  const handleDeleteAccount = async (accountId: string) => {
    await deleteAccountAction(accountId);
    refreshWorkspace();
  };

  const handleToggleAccountActive = async (acc: FinanceAccountRow) => {
    await toggleAccountActiveAction(acc.id, !acc.active);
    refreshWorkspace();
  };

  const handlePayInstitutionalEmi = async (loanId: string) => {
    await payEmiAction(loanId);
    refreshWorkspace();
  };

  const handlePayEmiAgreement = async (agreementId: string) => {
    await payEmiAgreementInstallmentAction(agreementId);
    updateExtended((prev) => ({
      ...prev,
      emiAgreements: prev.emiAgreements.map((ag) => {
        if (ag.id !== agreementId) return ag;
        let marked = false;
        const schedule = ag.schedule.map((inst) => {
          if (!marked && inst.status === 'pending') {
            marked = true;
            return { ...inst, status: 'paid' as const, paidOn: todayIST() };
          }
          return inst;
        });
        const paidInstallments = schedule.filter((s) => s.status === 'paid').length;
        return {
          ...ag,
          schedule,
          paid_installments: paidInstallments,
          status: paidInstallments >= schedule.length ? 'completed' : 'active',
        };
      }),
    }));
  };

  const handleSnapshotSaved = (snapshot: FinanceAccountSnapshotItem) => {
    updateExtended((prev) => ({
      ...prev,
      snapshots: [snapshot, ...prev.snapshots],
    }));
    refreshWorkspace();
  };

  const activeSpendDisplay =
    spendingMode === 'net' ? monthStats.netSpend : monthStats.grossSpend;
  const accountLookup = useMemo(
    () => new Map(fullWorkspace.accounts.map((a) => [a.id, a])),
    [fullWorkspace.accounts]
  );

  return (
    <div className="space-y-5">
      {/* Top Bar: Month Navigation + Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Finance
          </h2>
          <Badge
            variant="outline"
            className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
          >
            INR (₹)
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Switcher */}
          <div className="inline-flex items-center rounded-lg border border-border bg-card h-9 px-1">
            <button
              type="button"
              onClick={() => setActiveMonth((m) => shiftMonth(m, -1))}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 text-xs font-medium min-w-[112px] text-center">
              {monthLabel(activeMonth)}
            </span>
            <button
              type="button"
              onClick={() => setActiveMonth((m) => shiftMonth(m, 1))}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {fullWorkspace.accounts.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDemo}
              disabled={isPending}
              className="h-9 gap-1.5 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Load Demo
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setNestBotOpen(true)}
            className="h-9 gap-1.5 text-xs border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15"
          >
            <Bot className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Assistant
          </Button>

          <AddAccountDialog onAccountCreated={refreshWorkspace} />
          <AddTransactionDialog
            accounts={fullWorkspace.accounts}
            onTransactionCreated={refreshWorkspace}
          />
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Net Worth
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Landmark className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold tracking-tight tabular-nums">
            {formatINR(metrics.netWorth)}
          </div>
        </Card>

        <Card className="p-4 border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Liquid Cash
            </span>
            <div className="h-7 w-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatINR(metrics.totalLiquidCash)}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {fullWorkspace.accounts.filter((a) => a.active && (a.kind === 'bank' || a.kind === 'wallet')).length}{' '}
            active bank &amp; wallet(s)
          </p>
        </Card>

        <Card className="p-4 border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {spendingMode === 'net' ? 'Net Spend' : 'Gross Spend'}
            </span>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
            {formatINR(activeSpendDisplay)}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
            Refunds: {formatINR(monthStats.refunds)} · {monthStats.expenseCount} expense(s)
          </p>
        </Card>

        <Card className="p-4 border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Credit &amp; Pay Later
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold tracking-tight tabular-nums">
            {formatINR(creditTotals.totalUsed)}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
            {creditTotals.totalLimit > 0
              ? `Avail: ${formatINR(creditTotals.totalAvail)} (${creditTotals.utilPct}% used)`
              : `Savings Rate: ${monthStats.savingsRate}%`}
          </p>
        </Card>
      </div>

      {/* Main Mobile-First Scrollable Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <TabsList className="inline-flex w-max min-w-full sm:w-auto h-auto p-1 gap-1">
            <TabsTrigger value="overview" className="text-xs px-3 py-1.5 h-8">
              Overview
            </TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs px-3 py-1.5 h-8">
              Accounts ({fullWorkspace.accounts.length})
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs px-3 py-1.5 h-8">
              Ledger ({fullWorkspace.transactions.length})
            </TabsTrigger>
            <TabsTrigger value="bills" className="text-xs px-3 py-1.5 h-8">
              Bills &amp; EMIs ({fullWorkspace.bills.filter((b) => b.status !== 'paid').length})
            </TabsTrigger>
            <TabsTrigger value="investments" className="text-xs px-3 py-1.5 h-8">
              FDs ({fullWorkspace.fixedDeposits.length})
            </TabsTrigger>
            <TabsTrigger value="people_splits" className="text-xs px-3 py-1.5 h-8 gap-1">
              <Users className="h-3 w-3" />
              People &amp; Splits
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs px-3 py-1.5 h-8 gap-1">
              <BarChart3 className="h-3 w-3" />
              Analytics &amp; Budgets
            </TabsTrigger>
            <TabsTrigger value="tools" className="text-xs px-3 py-1.5 h-8 gap-1">
              <Wrench className="h-3 w-3" />
              Imports &amp; Orders
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-5">
          <VirtualCardCarousel
            accounts={fullWorkspace.accounts.filter((a) => a.active)}
            snapshots={extended.snapshots}
            selectedAccountId={selectedAccount?.id ?? null}
            onSelectAccount={(id) => {
              setSelectedAccountId(id);
            }}
            onSnapshotAccount={(acc) => setSnapshotTarget(acc)}
            onEditAccount={(acc) => setEditAccountTarget(acc)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Monthly Cashflow + Gross/Net Toggle + Pie */}
            <Card className="lg:col-span-2 border-border">
              <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold">
                  {monthLabel(activeMonth)} Cash Flow
                </CardTitle>
                <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 self-start">
                  <button
                    type="button"
                    onClick={() => setSpendingMode('gross')}
                    className={`px-2 py-0.5 text-[11px] rounded font-medium cursor-pointer ${
                      spendingMode === 'gross'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Gross
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpendingMode('net')}
                    className={`px-2 py-0.5 text-[11px] rounded font-medium cursor-pointer ${
                      spendingMode === 'net'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Net
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-muted/40 text-center">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Income
                    </span>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatINR(monthStats.income)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {spendingMode === 'net' ? 'Net Spend' : 'Gross Spend'}
                    </span>
                    <div className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {formatINR(activeSpendDisplay)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Net Saved
                    </span>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                      {formatINR(monthStats.savings)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Transfers
                    </span>
                    <div className="text-sm font-semibold text-muted-foreground tabular-nums">
                      {formatINR(monthStats.transfers)}
                    </div>
                  </div>
                </div>

                {categoryChartData.length > 0 ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                    <div className="h-44 w-44 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryChartData}
                            dataKey={spendingMode === 'net' ? 'net' : 'gross'}
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={66}
                            paddingAngle={2}
                          >
                            {categoryChartData.map((c) => (
                              <Cell key={c.category} fill={c.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: unknown) => [formatINR(Number(value)), 'Spend']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      {categoryChartData.slice(0, 6).map((cat) => (
                        <div key={cat.category} className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span>{cat.category}</span>
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatINR(spendingMode === 'net' ? cat.net : cat.gross)} ({cat.percentage}%)
                            </span>
                          </div>
                          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full"
                              style={{
                                width: `${cat.percentage}%`,
                                backgroundColor: cat.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No expenses logged for {monthLabel(activeMonth)}.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Column: Actionable Alerts, Pending Bills & People Pulse */}
            <div className="space-y-4">
              <Card className="border-border">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Bills &amp; Payables</CardTitle>
                  <AddBillDialog
                    accounts={fullWorkspace.accounts}
                    onBillCreated={refreshWorkspace}
                  />
                </CardHeader>
                <CardContent className="space-y-2">
                  {fullWorkspace.bills.filter((b) => b.status !== 'paid').length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">
                      All bills cleared!
                    </p>
                  ) : (
                    fullWorkspace.bills
                      .filter((b) => b.status !== 'paid')
                      .slice(0, 4)
                      .map((bill) => (
                        <div
                          key={bill.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">{bill.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              Due {formatDateIN(bill.due_date)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold tabular-nums">
                              {formatINR(bill.amount)}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[10px]"
                              onClick={() => setPayBillTarget(bill)}
                            >
                              Pay
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Personal Loans Net</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('people_splits')}
                      className={`font-semibold tabular-nums cursor-pointer underline-offset-2 hover:underline ${
                        personalLoansSummary.netPosition >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {formatINR(personalLoansSummary.netPosition)}
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Active EMI Commitments</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('bills')}
                      className="font-semibold tabular-nums cursor-pointer underline-offset-2 hover:underline"
                    >
                      {formatINR(
                        emiSummary.monthlyCommitment +
                          fullWorkspace.loans.reduce(
                            (s, l) => s + (l.remaining_emis > 0 ? Number(l.monthly_emi) : 0),
                            0
                          )
                      )}
                      /mo
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Budget Alerts (80%+)</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('analytics')}
                      className="font-semibold cursor-pointer underline-offset-2 hover:underline"
                    >
                      {budgetAlerts.length > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          {budgetAlerts.length} category alert(s)
                        </span>
                      ) : (
                        <span className="text-emerald-600">On track</span>
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Transactions Preview */}
          <Card className="border-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setActiveTab('transactions')}
              >
                View All →
              </Button>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {fullWorkspace.transactions.slice(0, 6).map((tx) => {
                const acc = tx.account_id ? accountLookup.get(tx.account_id) : null;
                return (
                  <div
                    key={tx.id}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{tx.description}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {formatDateIN(tx.occurred_on)} · {tx.category}
                        {acc ? ` · ${acc.name}` : ''}
                      </div>
                    </div>
                    <span
                      className={`font-bold tabular-nums shrink-0 ${
                        tx.kind === 'income' || tx.kind === 'refund'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : tx.kind === 'transfer' || tx.kind === 'bill_payment'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.kind === 'income' || tx.kind === 'refund'
                        ? '+'
                        : tx.kind === 'transfer'
                          ? '⇄ '
                          : '-'}
                      {formatINR(tx.amount)}
                    </span>
                  </div>
                );
              })}
              {fullWorkspace.transactions.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No transactions yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ACCOUNTS & CARDS TAB */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Active' },
                  { id: 'bank_wallet', label: 'Banks & Wallets' },
                  { id: 'credit', label: 'Credit Cards & Pay Later' },
                  { id: 'archived', label: 'Archived' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAccountFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                    accountFilter === f.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <AddAccountDialog onAccountCreated={refreshWorkspace} />
          </div>

          <VirtualCardCarousel
            accounts={filteredAccounts}
            snapshots={extended.snapshots}
            selectedAccountId={selectedAccount?.id ?? null}
            onSelectAccount={setSelectedAccountId}
            onSnapshotAccount={(acc) => setSnapshotTarget(acc)}
            onEditAccount={(acc) => setEditAccountTarget(acc)}
          />

          {selectedAccount && (
            <Card className="border-border">
              <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    {selectedAccount.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {selectedAccount.institution} (•••• {selectedAccount.masked_suffix})
                    {selectedAccount.notes ? ` · ${selectedAccount.notes}` : ''}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={() => setSnapshotTarget(selectedAccount)}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Checkpoint
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={() => setEditAccountTarget(selectedAccount)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => handleToggleAccountActive(selectedAccount)}
                  >
                    {selectedAccount.active ? 'Archive' : 'Restore'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-rose-600 hover:text-rose-700"
                    onClick={() => handleDeleteAccount(selectedAccount.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(selectedAccount.kind === 'credit_card' ||
                  selectedAccount.kind === 'pay_later') && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-muted/40 p-3 text-xs">
                    {(() => {
                      const u = computeCreditUsage(selectedAccount, extended.snapshots);
                      return (
                        <>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">
                              Outstanding
                            </span>
                            <span className="font-bold tabular-nums">
                              {formatINR(u.outstanding)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">
                              Available Credit
                            </span>
                            <span className="font-bold text-emerald-600 tabular-nums">
                              {u.availableCredit !== null ? formatINR(u.availableCredit) : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">
                              Billed / Unbilled
                            </span>
                            <span className="font-medium tabular-nums">
                              {u.latestSnapshot?.billed_amount !== null &&
                              u.latestSnapshot?.billed_amount !== undefined
                                ? `${formatINR(u.latestSnapshot.billed_amount)} / ${formatINR(
                                    u.latestSnapshot.unbilled_amount ?? 0
                                  )}`
                                : 'No snapshot yet'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">
                              Billing / Due Day
                            </span>
                            <span className="font-medium">
                              {selectedAccount.billing_day
                                ? `${selectedAccount.billing_day}th / ${selectedAccount.due_day ?? '—'}th`
                                : selectedAccount.due_day
                                  ? `Due ${selectedAccount.due_day}th`
                                  : 'Not set'}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold mb-2">
                    Account Activity ({selectedAccountTransactions.length})
                  </h4>
                  {selectedAccountTransactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No transactions for this account.
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {selectedAccountTransactions.slice(0, 15).map((tx) => (
                        <div
                          key={tx.id}
                          className="py-2 flex items-center justify-between text-xs gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">{tx.description}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {formatDateIN(tx.occurred_on)} · {tx.category} · {tx.kind}
                            </div>
                          </div>
                          <span
                            className={`font-bold tabular-nums ${
                              tx.kind === 'income' || tx.kind === 'refund'
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {tx.kind === 'income' || tx.kind === 'refund' ? '+' : '-'}
                            {formatINR(tx.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 3. UNIFIED TRANSACTIONS LEDGER TAB */}
        <TabsContent value="transactions" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold">
                  Transactions
                </CardTitle>
                <AddTransactionDialog
                  accounts={fullWorkspace.accounts}
                  onTransactionCreated={refreshWorkspace}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="relative sm:col-span-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                  <Input
                    placeholder="Search transactions..."
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <select
                  value={txKindFilter}
                  onChange={(e) => setTxKindFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="all">All Types</option>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="transfer">Transfer</option>
                  <option value="bill_payment">Bill Payment</option>
                  <option value="refund">Refund</option>
                </select>
                <div className="flex gap-1.5">
                  <select
                    value={txAccountFilter}
                    onChange={(e) => setTxAccountFilter(e.target.value)}
                    className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="all">All Accounts</option>
                    {fullWorkspace.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setTxPeriodFilter((p) => (p === 'all' ? 'month' : 'all'))
                    }
                    className="px-2.5 h-8 rounded-md border border-border text-[11px] font-medium hover:bg-muted cursor-pointer shrink-0"
                  >
                    {txPeriodFilter === 'month' ? activeMonth : 'All Time'}
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="divide-y divide-border">
              {filteredTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No matching transactions found.
                </div>
              ) : (
                filteredTransactions.map((tx) => {
                  const srcAcc = tx.account_id ? accountLookup.get(tx.account_id) : null;
                  const dstAcc = tx.to_account_id ? accountLookup.get(tx.to_account_id) : null;
                  return (
                    <div
                      key={tx.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-semibold flex items-center gap-2 flex-wrap">
                          <span className="truncate">{tx.description}</span>
                          <Badge variant="outline" className="text-[9px] capitalize">
                            {tx.kind.replace('_', ' ')}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px]">
                            {tx.category}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
                          <span>{formatDateIN(tx.occurred_on)}</span>
                          {tx.merchant && <span>· {tx.merchant}</span>}
                          {srcAcc && <span>· {srcAcc.name}</span>}
                          {dstAcc && (
                            <span className="inline-flex items-center gap-0.5">
                              <ArrowLeftRight className="h-3 w-3" /> {dstAcc.name}
                            </span>
                          )}
                          {tx.notes && <span className="italic">· {tx.notes}</span>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            tx.kind === 'income' || tx.kind === 'refund'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : tx.kind === 'transfer' || tx.kind === 'bill_payment'
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {tx.kind === 'income' || tx.kind === 'refund' ? '+' : '-'}
                          {formatINR(tx.amount)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditTxTarget(tx)}
                          aria-label="Edit transaction"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteTx(tx.id)}
                          aria-label="Delete transaction"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. BILLS, PAY LATER & EMIS TAB */}
        <TabsContent value="bills" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Manage recurring bills, card statements, Pay Later dues, and installment schedules
            </div>
            <div className="flex flex-wrap gap-2">
              <AddBillDialog
                accounts={fullWorkspace.accounts}
                onBillCreated={refreshWorkspace}
              />
              <AddLoanOrEmiDialog
                accounts={fullWorkspace.accounts}
                onLoanCreated={refreshWorkspace}
                onEmiAgreementCreated={(item) =>
                  updateExtended((prev) => ({
                    ...prev,
                    emiAgreements: [item, ...prev.emiAgreements],
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recurring Bills & Pay Later Bills */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-emerald-500" />
                  Bills &amp; Statement Dues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {fullWorkspace.bills.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No recurring bills added yet.
                  </p>
                ) : (
                  fullWorkspace.bills.map((bill) => (
                    <div
                      key={bill.id}
                      className="rounded-xl border border-border p-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold flex items-center gap-1.5">
                          <span
                            className={
                              bill.status === 'paid' ? 'line-through text-muted-foreground' : ''
                            }
                          >
                            {bill.name}
                          </span>
                          <Badge
                            variant={bill.status === 'paid' ? 'secondary' : 'outline'}
                            className="text-[9px] capitalize"
                          >
                            {bill.status}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Due {formatDateIN(bill.due_date)} · {bill.frequency} · {bill.category}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold tabular-nums mr-1">
                          {formatINR(bill.amount)}
                        </span>
                        {bill.status !== 'paid' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setPayBillTarget(bill)}
                          >
                            Pay Bill
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px]"
                            onClick={async () => {
                              await toggleBillStatusAction(bill.id, 'pending');
                              refreshWorkspace();
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Reopen
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            await deleteBillAction(bill.id);
                            refreshWorkspace();
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Pay Later / Card EMI Agreements & Institutional Loans */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4 text-blue-500" />
                  Loans &amp; EMIs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {extended.emiAgreements.map((ag) => {
                  const paidPct = Math.min(
                    100,
                    Math.round((ag.paid_installments / ag.duration_months) * 100)
                  );
                  return (
                    <div
                      key={ag.id}
                      className="rounded-xl border border-border p-3 space-y-2 text-xs bg-blue-500/5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold flex items-center gap-1.5">
                            <span>{ag.title}</span>
                            <Badge variant="outline" className="text-[9px]">
                              {ag.annual_interest_rate === 0
                                ? 'No-Cost EMI'
                                : `${ag.annual_interest_rate}% APR`}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {ag.merchant || 'EMI Plan'} · Principal{' '}
                            {formatINR(ag.financed_principal)}
                            {ag.order_ref ? ` · #${ag.order_ref}` : ''}
                          </div>
                        </div>
                        <span className="font-bold tabular-nums">
                          {formatINR(ag.monthly_emi)}/mo
                        </span>
                      </div>

                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${paidPct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          {ag.paid_installments} of {ag.duration_months} installments paid
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            disabled={ag.paid_installments >= ag.duration_months}
                            onClick={() => handlePayEmiAgreement(ag.id)}
                          >
                            {ag.paid_installments >= ag.duration_months ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />
                                Completed
                              </>
                            ) : (
                              'Pay Next EMI'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={async () => {
                              await deleteEmiAgreementAction(ag.id);
                              updateExtended((prev) => ({
                                ...prev,
                                emiAgreements: prev.emiAgreements.filter((x) => x.id !== ag.id),
                              }));
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {fullWorkspace.loans.map((loan) => {
                  const progressPct = Math.min(
                    100,
                    Math.round(
                      ((loan.total_emis - loan.remaining_emis) / Math.max(1, loan.total_emis)) * 100
                    )
                  );
                  return (
                    <div
                      key={loan.id}
                      className="rounded-xl border border-border p-3 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold">{loan.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {loan.lender} · Outstanding {formatINR(loan.outstanding)}
                          </div>
                        </div>
                        <span className="font-bold tabular-nums">
                          {formatINR(loan.monthly_emi)}/mo
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          {loan.remaining_emis} of {loan.total_emis} EMIs left (Due {loan.due_day}
                          th)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            disabled={loan.remaining_emis === 0}
                            onClick={() => handlePayInstitutionalEmi(loan.id)}
                          >
                            Log Payment
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={async () => {
                              await deleteLoanAction(loan.id);
                              refreshWorkspace();
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {extended.emiAgreements.length === 0 && fullWorkspace.loans.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No active loans or EMIs.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 5. FIXED DEPOSITS TAB */}
        <TabsContent value="investments" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <PiggyBank className="h-4 w-4 text-emerald-500" />
                Fixed Deposits
              </CardTitle>
              <AddFixedDepositDialog onCreated={refreshWorkspace} />
            </CardHeader>
            <CardContent>
              {fullWorkspace.fixedDeposits.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No fixed deposits yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-2 pr-3">Deposit</th>
                        <th className="py-2 pr-3">Principal</th>
                        <th className="py-2 pr-3">Rate</th>
                        <th className="py-2 pr-3">Est. Value Today</th>
                        <th className="py-2 pr-3">Maturity</th>
                        <th className="py-2 pr-3">Instruction</th>
                        <th className="py-2 text-right">Maturity Value</th>
                        <th className="py-2 pl-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {fullWorkspace.fixedDeposits.map((fd) => {
                        const accruedToday = estimatedFdAccruedToday(fd);
                        return (
                          <tr key={fd.id}>
                            <td className="py-3 pr-3">
                              <div className="font-semibold">{fd.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {fd.institution} · Opened {formatDateIN(fd.opening_date)}
                              </div>
                            </td>
                            <td className="py-3 pr-3 tabular-nums">{formatINR(fd.principal)}</td>
                            <td className="py-3 pr-3 font-semibold text-emerald-600 dark:text-emerald-400">
                              {fd.interest_rate}%
                            </td>
                            <td className="py-3 pr-3 tabular-nums font-medium">
                              {formatINR(accruedToday)}
                            </td>
                            <td className="py-3 pr-3 text-muted-foreground">
                              {formatDateIN(fd.maturity_date)}
                            </td>
                            <td className="py-3 pr-3">
                              <Badge variant="outline" className="text-[9px] capitalize">
                                {fd.payout_method.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="py-3 text-right font-bold tabular-nums">
                              {formatINR(fd.maturity_amount)}
                            </td>
                            <td className="py-3 pl-2 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={async () => {
                                  await deleteFDAction(fd.id);
                                  refreshWorkspace();
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. PEOPLE, PERSONAL LOANS & SPLIT BILLS */}
        <TabsContent value="people_splits">
          <FinancePeopleSplitsTab
            accounts={fullWorkspace.accounts}
            personalLoans={extended.personalLoans}
            expenseGroups={extended.expenseGroups}
            onPersonalLoansChange={(personalLoans) =>
              updateExtended((prev) => ({ ...prev, personalLoans }))
            }
            onExpenseGroupsChange={(expenseGroups) =>
              updateExtended((prev) => ({ ...prev, expenseGroups }))
            }
          />
        </TabsContent>

        {/* 7. ANALYTICS & CATEGORY BUDGETS */}
        <TabsContent value="analytics">
          <FinanceAnalyticsTab
            transactions={fullWorkspace.transactions}
            budgets={extended.budgets}
            activeMonth={activeMonth}
            spendingMode={spendingMode}
            onChangeSpendingMode={setSpendingMode}
            onBudgetsUpdated={(budgets) => updateExtended((prev) => ({ ...prev, budgets }))}
          />
        </TabsContent>

        {/* 8. IMPORTS, SMS EXTRACTOR, ORDERS & BACKUP */}
        <TabsContent value="tools">
          <FinanceToolsTab
            workspace={fullWorkspace}
            orders={extended.orders}
            onOrdersChange={(orders) => updateExtended((prev) => ({ ...prev, orders }))}
            onLedgerUpdated={refreshWorkspace}
          />
        </TabsContent>
      </Tabs>

      {/* Modals & Drawers */}
      <EditTransactionDialog
        key={`edit-tx-${editTxTarget?.id || 'none'}`}
        transaction={editTxTarget}
        accounts={fullWorkspace.accounts}
        open={Boolean(editTxTarget)}
        onOpenChange={(open) => !open && setEditTxTarget(null)}
        onSaved={refreshWorkspace}
      />
      <EditAccountDialog
        key={`edit-acc-${editAccountTarget?.id || 'none'}`}
        account={editAccountTarget}
        open={Boolean(editAccountTarget)}
        onOpenChange={(open) => !open && setEditAccountTarget(null)}
        onSaved={refreshWorkspace}
      />
      <AccountSnapshotDialog
        key={`snap-acc-${snapshotTarget?.id || 'none'}`}
        account={snapshotTarget}
        open={Boolean(snapshotTarget)}
        onOpenChange={(open) => !open && setSnapshotTarget(null)}
        onSnapshotSaved={handleSnapshotSaved}
      />
      <PayBillDialog
        key={`pay-bill-${payBillTarget?.id || 'none'}`}
        bill={payBillTarget}
        accounts={fullWorkspace.accounts}
        open={Boolean(payBillTarget)}
        onOpenChange={(open) => !open && setPayBillTarget(null)}
        onPaid={refreshWorkspace}
      />
      <NestBotDrawer
        open={nestBotOpen}
        onOpenChange={setNestBotOpen}
        workspace={fullWorkspace}
        activeMonth={activeMonth}
      />
    </div>
  );
}
