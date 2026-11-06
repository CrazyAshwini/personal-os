'use client';

import React, { useState, useTransition } from 'react';
import {
  type NativeFinanceWorkspace,
  deleteAccountAction,
  deleteTransactionAction,
  toggleBillStatusAction,
  payEmiAction,
  seedMoneyNestDemoDataAction,
} from '@/features/finance/native-actions';
import {
  formatINR,
  computeFinanceSummary,
} from '@/features/finance/finance-calculations';
import { AddAccountDialog } from '@/features/finance/add-account-dialog';
import { AddTransactionDialog } from '@/features/finance/add-transaction-dialog';
import { AddBillDialog } from '@/features/finance/add-bill-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Trash2,
  Landmark,
  Sparkles,
  Search,
  Check,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const COLORS = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#ea580c',
  '#4f46e5',
  '#16a34a',
  '#ca8a04',
];

interface NativeFinanceViewProps {
  initialWorkspace: NativeFinanceWorkspace;
}

export function NativeFinanceView({ initialWorkspace }: NativeFinanceViewProps) {
  const [workspace, setWorkspace] = useState<NativeFinanceWorkspace>(initialWorkspace);
  const [activeTab, setActiveTab] = useState('overview');
  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState<string>('all');
  const [isPending, startTransition] = useTransition();

  const metrics = computeFinanceSummary(
    workspace.accounts,
    workspace.transactions,
    workspace.fixedDeposits,
    workspace.loans
  );

  // Category breakdown for chart
  const categoryMap: Record<string, number> = {};
  for (const tx of workspace.transactions) {
    if (tx.kind === 'expense') {
      const cat = tx.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(tx.amount);
    }
  }

  const categoryChartData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
  }));

  const filteredTransactions = workspace.transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(txSearch.toLowerCase()) ||
      (tx.merchant && tx.merchant.toLowerCase().includes(txSearch.toLowerCase())) ||
      tx.category.toLowerCase().includes(txSearch.toLowerCase());

    const matchesFilter =
      txFilter === 'all' ? true : tx.kind === txFilter;

    return matchesSearch && matchesFilter;
  });

  const handleDeleteAccount = (accId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    startTransition(async () => {
      await deleteAccountAction(accId);
      setWorkspace((prev) => ({
        ...prev,
        accounts: prev.accounts.filter((a) => a.id !== accId),
      }));
    });
  };

  const handleDeleteTx = (txId: string) => {
    startTransition(async () => {
      await deleteTransactionAction(txId);
      setWorkspace((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== txId),
      }));
    });
  };

  const handleToggleBill = (billId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    startTransition(async () => {
      await toggleBillStatusAction(billId, newStatus);
      setWorkspace((prev) => ({
        ...prev,
        bills: prev.bills.map((b) => (b.id === billId ? { ...b, status: newStatus } : b)),
      }));
    });
  };

  const handlePayEmi = (loanId: string) => {
    startTransition(async () => {
      await payEmiAction(loanId);
      setWorkspace((prev) => ({
        ...prev,
        loans: prev.loans.map((l) =>
          l.id === loanId
            ? {
                ...l,
                remaining_emis: Math.max(0, l.remaining_emis - 1),
                outstanding: Math.max(0, Number(l.outstanding) - Number(l.monthly_emi)),
              }
            : l
        ),
      }));
    });
  };

  const handleSeedDemo = () => {
    startTransition(async () => {
      await seedMoneyNestDemoDataAction();
      window.location.reload();
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Finance & Money Nest</h2>
          <p className="text-xs text-muted-foreground">
            Native multi-account personal finance, credit cards, cash flow, and debt manager
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {workspace.accounts.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDemo}
              disabled={isPending}
              className="gap-1.5 text-xs border-blue-200 text-blue-600 dark:border-blue-900 dark:text-blue-400"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Populate Demo Data
            </Button>
          )}
          <AddAccountDialog onAccountCreated={() => window.location.reload()} />
          <AddTransactionDialog
            accounts={workspace.accounts}
            onTransactionCreated={() => window.location.reload()}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Net Worth
            </span>
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Landmark className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight">
            {formatINR(metrics.netWorth)}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Liquid cash + FDs - debt
          </p>
        </Card>

        <Card className="p-4 border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Liquid Cash
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {formatINR(metrics.totalLiquidCash)}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Across {workspace.accounts.filter((a) => a.kind === 'bank' || a.kind === 'wallet').length} bank accounts
          </p>
        </Card>

        <Card className="p-4 border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Monthly Spending
            </span>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {formatINR(metrics.monthlyExpenses)}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Current calendar month
          </p>
        </Card>

        <Card className="p-4 border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Savings Rate
            </span>
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
            {metrics.savingsRate}%
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {formatINR(metrics.monthlySavings)} saved
          </p>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="accounts" className="text-xs">
            Accounts ({workspace.accounts.length})
          </TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs">
            Transactions ({workspace.transactions.length})
          </TabsTrigger>
          <TabsTrigger value="bills" className="text-xs">
            Bills & EMIs ({workspace.bills.length + workspace.loans.length})
          </TabsTrigger>
          <TabsTrigger value="investments" className="text-xs">
            Investments ({workspace.fixedDeposits.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Cashflow Summary Card */}
            <Card className="lg:col-span-2 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Current Month Cash Flow</CardTitle>
                <CardDescription className="text-xs">
                  Real-time income vs expense allocation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40 text-center">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Income</span>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(metrics.monthlyIncome)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Expenses</span>
                    <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {formatINR(metrics.monthlyExpenses)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Net Saved</span>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {formatINR(metrics.monthlySavings)}
                    </div>
                  </div>
                </div>

                {categoryChartData.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <div className="h-44 w-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={65}
                            paddingAngle={3}
                          >
                            {categoryChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: unknown) => [formatINR(Number(value)), 'Spend']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex-1 space-y-1.5 w-full">
                      {categoryChartData.slice(0, 5).map((cat, idx) => (
                        <div key={cat.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span>{cat.name}</span>
                          </div>
                          <span className="font-medium">{formatINR(cat.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Bills Sidebar Card */}
            <Card className="border-border">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Upcoming Bills</CardTitle>
                  <CardDescription className="text-xs">Next 30 days</CardDescription>
                </div>
                <AddBillDialog
                  accounts={workspace.accounts}
                  onBillCreated={() => window.location.reload()}
                />
              </CardHeader>
              <CardContent className="space-y-2">
                {workspace.bills.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No recurring bills scheduled.
                  </div>
                ) : (
                  workspace.bills.slice(0, 4).map((bill) => (
                    <div
                      key={bill.id}
                      className="p-2.5 rounded-lg border border-border flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-medium">{bill.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due {bill.due_date}
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-xs font-semibold">{formatINR(bill.amount)}</span>
                        <Button
                          variant={bill.status === 'paid' ? 'outline' : 'default'}
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleToggleBill(bill.id, bill.status)}
                          title={bill.status === 'paid' ? 'Mark Pending' : 'Mark Paid'}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity List */}
          <Card className="border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                <CardDescription className="text-xs">Latest transactions logged</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setActiveTab('transactions')}
              >
                View all
              </Button>
            </CardHeader>
            <CardContent>
              {workspace.transactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No transactions yet. Click &quot;Log Transaction&quot; or &quot;Populate Demo Data&quot; to begin.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {workspace.transactions.slice(0, 6).map((tx) => (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                            tx.kind === 'income'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : tx.kind === 'transfer'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {tx.kind === 'income' ? (
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                          ) : tx.kind === 'transfer' ? (
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{tx.description}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {tx.category} • {tx.occurred_on}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-semibold ${
                            tx.kind === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-foreground'
                          }`}
                        >
                          {tx.kind === 'income' ? '+' : '-'}
                          {formatINR(tx.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ACCOUNTS & CARDS TAB */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Your Financial Accounts & Cards</h3>
              <p className="text-xs text-muted-foreground">
                Manage bank accounts, credit limits, and wallets
              </p>
            </div>
            <AddAccountDialog onAccountCreated={() => window.location.reload()} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspace.accounts.map((acc) => {
              const isCredit = acc.kind === 'credit_card' || acc.kind === 'pay_later';
              const limit = acc.credit_limit || 0;
              const used = isCredit ? Number(acc.balance) : 0;
              const available = Math.max(0, limit - used);

              return (
                <Card
                  key={acc.id}
                  className="overflow-hidden border-border transition-shadow hover:shadow-md"
                >
                  <div
                    className="h-2 w-full"
                    style={{ backgroundColor: acc.accent || '#2563eb' }}
                  />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {acc.kind.replace('_', ' ')}
                      </Badge>
                      <button
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                        title="Delete Account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <CardTitle className="text-sm font-bold flex items-center justify-between pt-1">
                      <span>{acc.name}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {acc.institution} •••• {acc.masked_suffix}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <div className="pt-2 border-t border-border flex items-baseline justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {isCredit ? 'Outstanding Balance' : 'Available Balance'}
                      </span>
                      <span className="text-base font-bold text-foreground">
                        {formatINR(acc.balance)}
                      </span>
                    </div>

                    {isCredit && limit > 0 && (
                      <div className="space-y-1 pt-1 text-[11px] text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Limit: {formatINR(limit, true)}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Avail: {formatINR(available, true)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* 3. TRANSACTIONS TAB */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search transactions by merchant, description, category..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={txFilter}
                onChange={(e) => setTxFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              >
                <option value="all">All Types</option>
                <option value="expense">Expenses only</option>
                <option value="income">Income only</option>
                <option value="transfer">Transfers only</option>
              </select>

              <AddTransactionDialog
                accounts={workspace.accounts}
                onTransactionCreated={() => window.location.reload()}
              />
            </div>
          </div>

          <Card className="border-border">
            <CardContent className="p-0">
              {filteredTransactions.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  No matching transactions found.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3.5 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                            tx.kind === 'income'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : tx.kind === 'transfer'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {tx.kind === 'income' ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : tx.kind === 'transfer' ? (
                            <ArrowLeftRight className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{tx.description}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>{tx.category}</span>
                            <span>•</span>
                            <span>{tx.occurred_on}</span>
                            {tx.merchant && (
                              <>
                                <span>•</span>
                                <span className="italic">{tx.merchant}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`font-semibold text-sm ${
                            tx.kind === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-foreground'
                          }`}
                        >
                          {tx.kind === 'income' ? '+' : '-'}
                          {formatINR(tx.amount)}
                        </span>
                        <button
                          onClick={() => handleDeleteTx(tx.id)}
                          className="text-muted-foreground/60 hover:text-red-500 transition-colors p-1"
                          title="Delete transaction"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. BILLS & EMIs TAB */}
        <TabsContent value="bills" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bills Section */}
            <Card className="border-border">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Recurring Bills</CardTitle>
                  <CardDescription className="text-xs">Utilities, broadband, rent</CardDescription>
                </div>
                <AddBillDialog
                  accounts={workspace.accounts}
                  onBillCreated={() => window.location.reload()}
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {workspace.bills.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No active bills tracked.
                  </div>
                ) : (
                  workspace.bills.map((bill) => (
                    <div
                      key={bill.id}
                      className="p-3 rounded-lg border border-border flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-medium">{bill.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Due {bill.due_date} • {bill.frequency}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{formatINR(bill.amount)}</span>
                        <Button
                          variant={bill.status === 'paid' ? 'outline' : 'default'}
                          size="sm"
                          className="h-7 text-[10px] gap-1"
                          onClick={() => handleToggleBill(bill.id, bill.status)}
                        >
                          {bill.status === 'paid' ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              Paid
                            </>
                          ) : (
                            'Pay'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Loans & EMIs Section */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Loans & Active EMIs</CardTitle>
                <CardDescription className="text-xs">Consumer loans and monthly installments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {workspace.loans.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No active loans or EMIs.
                  </div>
                ) : (
                  workspace.loans.map((loan) => (
                    <div
                      key={loan.id}
                      className="p-3 rounded-lg border border-border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold">{loan.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {loan.lender} • Due day {loan.due_day} of month
                          </div>
                        </div>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                          {formatINR(loan.monthly_emi)}/mo
                        </span>
                      </div>

                      <div className="text-[10px] text-muted-foreground flex justify-between">
                        <span>Outstanding: {formatINR(loan.outstanding)}</span>
                        <span>
                          {loan.remaining_emis} of {loan.total_emis} EMIs left
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden mr-3">
                          <div
                            className="h-full bg-blue-600"
                            style={{
                              width: `${Math.min(
                                100,
                                ((loan.total_emis - loan.remaining_emis) / loan.total_emis) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px]"
                          disabled={loan.remaining_emis === 0}
                          onClick={() => handlePayEmi(loan.id)}
                        >
                          Log Payment
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 5. INVESTMENTS & FDs TAB */}
        <TabsContent value="investments" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Fixed Deposits & Safe Returns</CardTitle>
              <CardDescription className="text-xs">
                Guaranteed return investments and maturity tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workspace.fixedDeposits.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No Fixed Deposits tracked.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-2">Deposit Name</th>
                        <th className="py-2">Institution</th>
                        <th className="py-2">Principal</th>
                        <th className="py-2">Rate</th>
                        <th className="py-2">Maturity Date</th>
                        <th className="py-2 text-right">Maturity Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {workspace.fixedDeposits.map((fd) => (
                        <tr key={fd.id} className="py-2">
                          <td className="py-2.5 font-medium">{fd.name}</td>
                          <td className="py-2.5 text-muted-foreground">{fd.institution}</td>
                          <td className="py-2.5">{formatINR(fd.principal)}</td>
                          <td className="py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                            {fd.interest_rate}%
                          </td>
                          <td className="py-2.5 text-muted-foreground">{fd.maturity_date}</td>
                          <td className="py-2.5 text-right font-bold text-foreground">
                            {formatINR(fd.maturity_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
