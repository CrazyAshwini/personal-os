'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  computeBudgetStatuses,
  computeCategorySpending,
  computeDailySpending,
  computeMonthlySpendAnalytics,
  computeMonthlyTrend,
  computeTopMerchants,
  formatDateIN,
  formatINR,
  monthLabel,
} from './finance-calculations';
import {
  MONEY_NEST_CATEGORIES,
  type FinanceCategoryBudgetMap,
  type FinanceTransactionRow,
} from './finance-types';
import { saveCategoryBudgetsAction } from './native-actions';

const BUDGETABLE_CATEGORIES = MONEY_NEST_CATEGORIES.filter(
  (c) =>
    ![
      'Salary',
      'Credit Card Payment',
      'Pay Later Payment',
      'Own Account Transfer',
      'Purchase Refund',
      'Split Bill Reimbursement',
    ].includes(c)
);

export function FinanceAnalyticsTab({
  transactions,
  budgets,
  activeMonth,
  spendingMode,
  onChangeSpendingMode,
  onBudgetsUpdated,
}: {
  transactions: FinanceTransactionRow[];
  budgets: FinanceCategoryBudgetMap;
  activeMonth: string;
  spendingMode: 'gross' | 'net';
  onChangeSpendingMode: (mode: 'gross' | 'net') => void;
  onBudgetsUpdated: (next: FinanceCategoryBudgetMap) => void;
}) {
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [draftBudgets, setDraftBudgets] = useState<Record<string, string>>({});
  const [savingBudgets, setSavingBudgets] = useState(false);
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);

  const summary = useMemo(
    () => computeMonthlySpendAnalytics(transactions, activeMonth),
    [transactions, activeMonth]
  );
  const categoryRows = useMemo(
    () => computeCategorySpending(transactions, activeMonth, spendingMode),
    [transactions, activeMonth, spendingMode]
  );
  const dailyPoints = useMemo(
    () => computeDailySpending(transactions, activeMonth, spendingMode),
    [transactions, activeMonth, spendingMode]
  );
  const trendPoints = useMemo(
    () => computeMonthlyTrend(transactions, activeMonth, 6),
    [transactions, activeMonth]
  );
  const topMerchants = useMemo(
    () => computeTopMerchants(transactions, activeMonth, 6),
    [transactions, activeMonth]
  );
  const budgetStatuses = useMemo(
    () => computeBudgetStatuses(budgets, transactions, activeMonth, spendingMode),
    [budgets, transactions, activeMonth, spendingMode]
  );

  const dayDrilldown = useMemo(() => {
    if (!selectedDayIso) return null;
    const dayTx = transactions.filter((t) => t.occurred_on === selectedDayIso);
    const point = dailyPoints.find((d) => d.date === selectedDayIso);
    return { date: selectedDayIso, point, transactions: dayTx };
  }, [selectedDayIso, transactions, dailyPoints]);

  const openBudgetConfig = () => {
    const initial: Record<string, string> = {};
    for (const cat of BUDGETABLE_CATEGORIES) {
      if (budgets[cat]) initial[cat] = String(budgets[cat]);
    }
    setDraftBudgets(initial);
    setBudgetModalOpen(true);
  };

  const applySuggestedPresets = () => {
    setDraftBudgets({
      Food: '6000',
      Groceries: '8000',
      Transport: '3000',
      'Bills & Utilities': '3500',
      Shopping: '5000',
      Subscriptions: '2000',
      Entertainment: '2500',
      Health: '2500',
    });
  };

  const handleSaveBudgets = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBudgets(true);
    const numericMap: FinanceCategoryBudgetMap = {};
    for (const [k, v] of Object.entries(draftBudgets)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) numericMap[k] = Number(n.toFixed(2));
    }
    const res = await saveCategoryBudgetsAction(numericMap);
    setSavingBudgets(false);
    if (!res.error) {
      onBudgetsUpdated(numericMap);
      setBudgetModalOpen(false);
    }
  };

  const activeDays = dailyPoints.filter((d) => d.amount > 0);
  const peakDay = activeDays.reduce<(typeof activeDays)[number] | null>(
    (max, cur) => (!max || cur.amount > max.amount ? cur : max),
    null
  );

  return (
    <div className="space-y-4">
      {/* Header Controls: Gross vs Net + Category Budgets CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
        <div>
          <h3 className="text-sm font-semibold">
            {monthLabel(activeMonth)} · Analytics &amp; Budgets
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Gross Spend {formatINR(summary.grossSpend)} − Refunds {formatINR(summary.refunds)} ={' '}
            <strong className="text-foreground">Net Spend {formatINR(summary.netSpend)}</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
            <button
              type="button"
              onClick={() => onChangeSpendingMode('gross')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                spendingMode === 'gross'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Gross
            </button>
            <button
              type="button"
              onClick={() => onChangeSpendingMode('net')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                spendingMode === 'net'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Net (after refunds)
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={openBudgetConfig}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Configure Budgets
          </Button>
        </div>
      </div>

      {/* Category Budgets Progress Card */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Monthly Category Budgets</CardTitle>
              <CardDescription className="text-xs">
                80% warning threshold ({spendingMode})
              </CardDescription>
            </div>
            {budgetStatuses.some((b) => b.status === 'over') && (
              <Badge variant="destructive" className="text-[10px] gap-1">
                <AlertTriangle className="h-3 w-3" />
                Over Budget Alert
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {budgetStatuses.length === 0 ? (
            <div className="py-5 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                No category budget limits set yet.
              </p>
              <Button size="sm" variant="outline" className="text-xs" onClick={openBudgetConfig}>
                Set Monthly Caps
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {budgetStatuses.map((b) => (
                <div
                  key={b.category}
                  className={`rounded-xl border p-3 space-y-2 ${
                    b.status === 'over'
                      ? 'border-rose-500/40 bg-rose-500/5'
                      : b.status === 'warning'
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: b.color }}
                      />
                      {b.category}
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${
                        b.status === 'over'
                          ? 'text-rose-600 dark:text-rose-400'
                          : b.status === 'warning'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {b.percentage}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        b.status === 'over'
                          ? 'bg-rose-500'
                          : b.status === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
                    <span>Spent {formatINR(b.spent)}</span>
                    <span>
                      {b.remaining >= 0
                        ? `${formatINR(b.remaining)} left`
                        : `Over by ${formatINR(Math.abs(b.remaining))}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Spend Bar Chart + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Daily Spending ({spendingMode === 'net' ? 'Net' : 'Gross'})
                </CardTitle>
                <CardDescription className="text-xs">
                  Tap a bar or day to inspect transactions
                </CardDescription>
              </div>
              {peakDay && (
                <Badge variant="outline" className="text-[10px] tabular-nums">
                  Peak: {formatDateIN(peakDay.date)} ({formatINR(peakDay.amount)})
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPoints}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={52} />
                  <Tooltip
                    formatter={(val: unknown) => [formatINR(Number(val)), 'Spend']}
                    labelFormatter={(day) => `Day ${day} (${activeMonth})`}
                  />
                  <Bar
                    dataKey="amount"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer"
                    onClick={(data) => {
                      const payload = (data as unknown as { payload?: { date?: string } })?.payload;
                      if (payload?.date) setSelectedDayIso(payload.date);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {activeDays.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeDays.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setSelectedDayIso(d.date)}
                    className="text-[10px] px-2 py-1 rounded-md border border-border bg-muted/40 hover:bg-muted transition-colors tabular-nums cursor-pointer"
                  >
                    {d.date.slice(8)}: {formatINR(d.amount, true)}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Donut */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Category Share</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryRows.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No expenses recorded for this month.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryRows}
                        dataKey={spendingMode === 'net' ? 'net' : 'gross'}
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={66}
                        paddingAngle={2}
                      >
                        {categoryRows.map((entry) => (
                          <Cell key={entry.category} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: unknown) => [formatINR(Number(val)), 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {categoryRows.map((row) => (
                    <div
                      key={row.category}
                      className="flex items-center justify-between text-xs gap-2"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: row.color }}
                        />
                        <span className="truncate">{row.category}</span>
                      </span>
                      <span className="font-medium tabular-nums shrink-0">
                        {formatINR(spendingMode === 'net' ? row.net : row.gross)} ({row.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6-Month Cashflow Trend & Top Merchants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              6-Month Income vs Spend Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendPoints}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} width={54} />
                  <Tooltip formatter={(val: unknown) => formatINR(Number(val))} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="income" name="Income" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey={spendingMode === 'net' ? 'netSpend' : 'grossSpend'}
                    name={spendingMode === 'net' ? 'Net Spend' : 'Gross Spend'}
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            {topMerchants.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No merchant spend recorded this month.
              </div>
            ) : (
              <div className="space-y-2.5">
                {topMerchants.map((m) => (
                  <div
                    key={m.merchant}
                    className="flex items-center justify-between text-xs border-b border-border/50 pb-2 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{m.merchant}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {m.count} transaction{m.count === 1 ? '' : 's'}
                      </div>
                    </div>
                    <span className="font-bold tabular-nums">{formatINR(m.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Budgets Modal */}
      <Dialog open={budgetModalOpen} onOpenChange={setBudgetModalOpen}>
        <DialogContent className="sm:max-w-[460px] max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Monthly Category Budgets</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBudgets} className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5"
                onClick={applySuggestedPresets}
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                Apply INR Defaults
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-8"
                onClick={() => setDraftBudgets({})}
              >
                Clear All
              </Button>
            </div>
            <div className="space-y-2 max-h-[50dvh] overflow-y-auto pr-1">
              {BUDGETABLE_CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium flex-1 truncate">{cat}</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="No limit"
                    className="w-32 h-8 text-xs tabular-nums"
                    value={draftBudgets[cat] || ''}
                    onChange={(e) =>
                      setDraftBudgets((prev) => ({ ...prev, [cat]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBudgetModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={savingBudgets}>
                {savingBudgets ? 'Saving...' : 'Save Budgets'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Daily Spending Drilldown Dialog */}
      <Dialog open={Boolean(dayDrilldown)} onOpenChange={(o) => !o && setSelectedDayIso(null)}>
        <DialogContent className="sm:max-w-[460px] max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Daily Spending · {dayDrilldown ? formatDateIN(dayDrilldown.date) : ''}
            </DialogTitle>
          </DialogHeader>
          {dayDrilldown && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2.5 text-center text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Gross</span>
                  <span className="font-bold tabular-nums">
                    {formatINR(dayDrilldown.point?.gross ?? 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Refunds</span>
                  <span className="font-bold text-emerald-600 tabular-nums">
                    -{formatINR(dayDrilldown.point?.refunds ?? 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Net</span>
                  <span className="font-bold tabular-nums">
                    {formatINR(dayDrilldown.point?.net ?? 0)}
                  </span>
                </div>
              </div>
              {dayDrilldown.transactions.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-4">
                  No transactions on this date.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {dayDrilldown.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="py-2 flex items-center justify-between text-xs gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{tx.description}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {tx.category} · {tx.kind}
                        </div>
                      </div>
                      <span
                        className={`font-bold tabular-nums ${
                          tx.kind === 'refund' || tx.kind === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {tx.kind === 'refund' || tx.kind === 'income' ? '+' : '-'}
                        {formatINR(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
