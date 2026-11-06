'use client';

import React, { useState, useTransition } from 'react';
import { format } from 'date-fns';
import {
  CreditCard,
  RefreshCw,
  Unlink,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Server,
  Link as LinkIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  connectFinanceAction,
  syncFinanceAction,
  disconnectFinanceAction,
  testRevocationAction,
  type IntegrationConnectionRow,
} from '@/features/finance/actions';

interface FinanceViewProps {
  connection: IntegrationConnectionRow | null;
}

export function FinanceView({ connection }: FinanceViewProps) {
  const [open, setOpen] = useState(false);
  const [endpoint, setEndpoint] = useState(
    connection?.api_endpoint || 'http://127.0.0.1:3000'
  );
  const [apiKey, setApiKey] = useState('demo-read-token');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isConnected = connection?.status === 'connected';
  const isError = connection?.status === 'error';

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!endpoint.trim() || !apiKey.trim()) {
      setErrorMsg('Endpoint and API token are required.');
      return;
    }

    setErrorMsg(null);

    startTransition(async () => {
      const res = await connectFinanceAction({
        apiEndpoint: endpoint,
        apiKey,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setOpen(false);
      }
    });
  };

  const handleSync = () => {
    startTransition(async () => {
      await syncFinanceAction();
    });
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      await disconnectFinanceAction();
    });
  };

  const handleTestRevocation = () => {
    startTransition(async () => {
      await testRevocationAction();
    });
  };

  const monthlySpend = Number(connection?.cached_monthly_spend || 0);
  const currency = connection?.cached_currency || 'INR';
  const categories = (connection?.cached_category_breakdown || {}) as Record<string, number>;
  const transactions = connection?.cached_recent_transactions || [];

  return (
    <div className="space-y-6">
      {/* Header & Connection Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-500" />
            Finance Overview Integration
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Read-only external integration with your existing Expense Manager.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isPending}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          )}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer shadow-xs">
              <LinkIcon className="h-3.5 w-3.5" />
              {isConnected ? 'Reconfigure' : 'Connect Expense Manager'}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">
                  Connect Expense Manager API
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Read-only server-side connection. Personal OS never alters or duplicates financial records.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleConnect} className="space-y-4 pt-2">
                {errorMsg && (
                  <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="fm-endpoint" className="text-xs">
                    Expense Manager Origin URL *
                  </Label>
                  <Input
                    id="fm-endpoint"
                    required
                    placeholder="e.g. http://127.0.0.1:3000 or https://expense.yourdomain.com"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fm-token" className="text-xs">
                    Read-Only API Access Token *
                  </Label>
                  <Input
                    id="fm-token"
                    type="password"
                    required
                    placeholder="Enter revocable API secret key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Credentials remain server-side and are strictly revocable.
                  </span>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending || !endpoint.trim() || !apiKey.trim()}
                    className="h-8 text-xs"
                  >
                    {isPending ? 'Verifying...' : 'Establish Connection'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isPending}
              className="h-8 text-xs text-destructive hover:bg-destructive/10"
              title="Disconnect Integration"
            >
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status Banner */}
      <Card
        className={`border ${
          isConnected
            ? 'border-emerald-500/20 bg-emerald-500/5'
            : isError
            ? 'border-destructive/30 bg-destructive/5'
            : 'border-border bg-card'
        }`}
      >
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : isError
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  Expense Manager Connection:
                </span>
                <Badge
                  variant={
                    isConnected
                      ? 'secondary'
                      : isError
                      ? 'destructive'
                      : 'outline'
                  }
                  className="text-[10px] capitalize font-mono"
                >
                  {connection?.status || 'Disconnected'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {connection?.api_endpoint
                  ? `Target: ${connection.api_endpoint}`
                  : 'No active integration endpoint linked.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {connection?.last_sync_at && (
              <span>
                Synced{' '}
                {format(new Date(connection.last_sync_at), 'MMM d, yyyy @ hh:mm a')}
              </span>
            )}

            {isConnected && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleTestRevocation}
                disabled={isPending}
                className="text-[10px] text-muted-foreground hover:text-destructive h-6"
                title="Test simulated token revocation to verify graceful degradation"
              >
                Test Revocation
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Alert if present */}
      {connection?.last_error && (
        <div className="p-3.5 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Integration Diagnostic: {connection.last_error}</span>
        </div>
      )}

      {/* Main Metrics & Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1: Monthly Spend */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Current Month Expenditure
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground font-mono">
              {currency === 'INR' ? '₹' : '$'}
              {monthlySpend.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {isConnected
                ? 'Read-only sync from Expense Manager'
                : 'Connect integration to populate monthly spend'}
            </p>
          </CardContent>
        </Card>

        {/* Category Breakdown (2 cols) */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Category Spending Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              Expenditure distributions reported by the Expense Manager.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {Object.keys(categories).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No category data available yet.
              </p>
            ) : (
              <div className="space-y-2">
                {Object.entries(categories).map(([cat, amount]) => {
                  const pct =
                    monthlySpend > 0 ? Math.round((amount / monthlySpend) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-foreground">{cat}</span>
                        <span className="text-muted-foreground font-mono">
                          {currency === 'INR' ? '₹' : '$'}
                          {amount.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Recent Synchronized Transactions
          </CardTitle>
          <CardDescription className="text-xs">
            Latest transactions retrieved through the authenticated server-side API.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <Receipt className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p>No recent transactions synced.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground font-medium">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/20">
                      <td className="py-2.5 font-medium">{tx.date}</td>
                      <td className="py-2.5 font-medium text-foreground">
                        {tx.description}
                      </td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="text-[10px]">
                          {tx.category}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-foreground">
                        {currency === 'INR' ? '₹' : '$'}
                        {tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security & Isolation Callout */}
      <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Integration Boundary Rules</span>
        </div>
        <p className="text-[11px]">
          Personal OS does not duplicate Expense Manager&apos;s database or query private
          tables directly. All communication is read-only, authenticated server-side,
          and instantly revocable.
        </p>
      </div>
    </div>
  );
}
