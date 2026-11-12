'use client';

import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  PackageCheck,
  PlusCircle,
  ScanText,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  exportTransactionsToCsv,
  exportWorkspaceJson,
  parseStatementCsv,
  type ParsedStatementCandidate,
} from './statement-import';
import {
  parsePaymentSmsText,
  type ParsedSmsTransactionDraft,
} from './nestbot-engine';
import {
  batchImportTransactionsAction,
  createOrderAction,
  createTransactionAction,
  deleteOrderAction,
  updateOrderRefundAction,
} from './native-actions';
import { formatDateIN, formatINR, todayIST } from './finance-calculations';
import {
  MONEY_NEST_CATEGORIES,
  type FinanceAccountRow,
  type FinanceOrderItem,
  type FinanceTransactionRow,
  type NativeFinanceWorkspace,
} from './finance-types';

export function FinanceToolsTab({
  workspace,
  orders,
  onOrdersChange,
  onLedgerUpdated,
}: {
  workspace: NativeFinanceWorkspace;
  orders: FinanceOrderItem[];
  onOrdersChange: (next: FinanceOrderItem[]) => void;
  onLedgerUpdated: () => void;
}) {
  const accounts: FinanceAccountRow[] = workspace.accounts;
  const transactions: FinanceTransactionRow[] = workspace.transactions;

  // Statement Importer
  const fileRef = useRef<HTMLInputElement>(null);
  const [defaultAccId, setDefaultAccId] = useState(accounts[0]?.id || '');
  const [csvText, setCsvText] = useState('');
  const [candidates, setCandidates] = useState<ParsedStatementCandidate[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importBanner, setImportBanner] = useState<string | null>(null);

  // SMS / Receipt Text Quick Extractor
  const [smsText, setSmsText] = useState('');
  const [smsDraft, setSmsDraft] = useState<ParsedSmsTransactionDraft | null>(null);
  const [smsAccId, setSmsAccId] = useState(accounts[0]?.id || '');
  const [savingSms, setSavingSms] = useState(false);
  const [smsSavedMsg, setSmsSavedMsg] = useState<string | null>(null);

  // Orders & Refund form
  const [orderPlatform, setOrderPlatform] = useState('Amazon');
  const [orderDesc, setOrderDesc] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [orderAmt, setOrderAmt] = useState('');
  const [orderDate, setOrderDate] = useState(todayIST());
  const [refundExpAmt, setRefundExpAmt] = useState('');
  const [addingOrder, setAddingOrder] = useState(false);

  const handleParseCsv = (text: string, fileName: string) => {
    const res = parseStatementCsv(text, accounts, transactions, {
      fileName,
      defaultAccountId: defaultAccId || accounts[0]?.id || null,
    });
    setImportErrors(res.errors);
    setCandidates(res.candidates);
    setImportBanner(null);
  };

  const handleFileChange = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    handleParseCsv(text, file.name);
  };

  const loadSampleCsv = () => {
    const sample = [
      'date,description,amount,type,category,merchant',
      `${todayIST()},Swiggy Instamart Groceries,648.00,expense,Groceries,Swiggy`,
      `${todayIST()},Uber Premier Ride,312.50,expense,Transport,Uber India`,
      `${todayIST()},Amazon Keyboard Refund,380.00,refund,Purchase Refund,Amazon`,
    ].join('\n');
    setCsvText(sample);
    handleParseCsv(sample, 'sample-statement.csv');
  };

  const handleCommitImport = async () => {
    const selected = candidates.filter((c) => c.selected && c.errors.length === 0);
    if (selected.length === 0) return;
    setImporting(true);
    const res = await batchImportTransactionsAction(
      selected.map((c) => ({
        accountId: c.accountId,
        toAccountId: c.toAccountId,
        amount: c.amount,
        kind: c.kind,
        category: c.category,
        description: c.description,
        merchant: c.merchant,
        occurredOn: c.occurredOn,
        notes: c.externalReference ? `Ref: ${c.externalReference}` : 'CSV Import',
      }))
    );
    setImporting(false);
    if (res.error) {
      setImportErrors([res.error]);
    } else {
      setImportBanner(`Successfully imported ${res.data?.insertedCount ?? 0} transaction(s).`);
      setCandidates([]);
      setCsvText('');
      onLedgerUpdated();
    }
  };

  const handleExtractSms = () => {
    setSmsSavedMsg(null);
    const parsed = parsePaymentSmsText(smsText);
    setSmsDraft(parsed);
    if (parsed?.accountHint) {
      const matched = accounts.find((a) => a.masked_suffix === parsed.accountHint);
      if (matched) setSmsAccId(matched.id);
    }
  };

  const handleSaveSmsTransaction = async () => {
    if (!smsDraft) return;
    setSavingSms(true);
    const res = await createTransactionAction({
      accountId: smsAccId || null,
      amount: smsDraft.amount,
      currency: 'INR',
      kind: smsDraft.kind,
      category: smsDraft.category,
      description: smsDraft.description,
      merchant: smsDraft.merchant,
      occurredOn: smsDraft.occurredOn,
      notes: 'Quick SMS/UPI Extractor',
    });
    setSavingSms(false);
    if (!res.error) {
      setSmsSavedMsg(`Saved ${formatINR(smsDraft.amount)} to ledger.`);
      setSmsDraft(null);
      setSmsText('');
      onLedgerUpdated();
    }
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingOrder(true);
    const expRefund = Number(refundExpAmt) > 0 ? Number(refundExpAmt) : null;
    const res = await createOrderAction({
      platform: orderPlatform,
      orderRef: orderRef || null,
      description: orderDesc,
      amount: Number(orderAmt) || 0,
      occurredOn: orderDate,
      status: expRefund ? 'return_requested' : 'placed',
      refundExpectedAmount: expRefund,
      refundStatus: expRefund ? 'expected' : 'none',
    });
    setAddingOrder(false);
    if (res.data) {
      onOrdersChange([res.data, ...orders]);
      setOrderDesc('');
      setOrderRef('');
      setOrderAmt('');
      setRefundExpAmt('');
    }
  };

  const handleConfirmRefund = async (order: FinanceOrderItem) => {
    const receivedAmt = order.refund_expected_amount ?? order.amount;
    await updateOrderRefundAction({
      orderId: order.id,
      refundStatus: 'confirmed',
      refundReceivedAmount: receivedAmt,
      orderStatus: 'refund_received',
    });
    onOrdersChange(
      orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              refund_status: 'confirmed',
              refund_received_amount: receivedAmt,
              status: 'refund_received',
            }
          : o
      )
    );
  };

  const handleDeleteOrder = async (orderId: string) => {
    await deleteOrderAction(orderId);
    onOrdersChange(orders.filter((o) => o.id !== orderId));
  };

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* UPI / Bank SMS Quick Parser */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <ScanText className="h-4 w-4 text-emerald-500" />
              SMS / UPI Parser
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder='Example: "INR 499.00 debited from HDFC Card xx9102 at Swiggy on 12-11-26"'
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={handleExtractSms}>
                Extract Draft
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSmsText(
                    `Rs.649.00 debited from A/c xx${accounts[0]?.masked_suffix || '4821'} at Netflix India on ${todayIST()}`
                  )
                }
              >
                Load Example
              </Button>
            </div>

            {smsSavedMsg && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {smsSavedMsg}
              </div>
            )}

            {smsDraft && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span>{smsDraft.merchant}</span>
                  <span className="tabular-nums text-sm">
                    {smsDraft.kind === 'refund' || smsDraft.kind === 'income' ? '+' : '-'}
                    {formatINR(smsDraft.amount)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Account</Label>
                    <select
                      value={smsAccId}
                      onChange={(e) => setSmsAccId(e.target.value)}
                      className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Cash / None</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} (••••{a.masked_suffix})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Category</Label>
                    <select
                      value={smsDraft.category}
                      onChange={(e) =>
                        setSmsDraft({ ...smsDraft, category: e.target.value })
                      }
                      className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
                    >
                      {MONEY_NEST_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSmsDraft(null)}
                  >
                    Discard
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingSms}
                    onClick={handleSaveSmsTransaction}
                  >
                    {savingSms ? 'Saving...' : 'Save to Ledger'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export & Backup */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Download className="h-4 w-4 text-emerald-500" />
              Export &amp; Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="outline"
                className="justify-start h-11 text-xs gap-2"
                onClick={() =>
                  downloadFile(
                    `finance-ledger-${todayIST()}.csv`,
                    exportTransactionsToCsv(transactions, accounts),
                    'text/csv;charset=utf-8'
                  )
                }
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Download Ledger CSV ({transactions.length})
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start h-11 text-xs gap-2"
                onClick={() =>
                  downloadFile(
                    `finance-backup-${todayIST()}.json`,
                    exportWorkspaceJson(workspace),
                    'application/json'
                  )
                }
              >
                <Download className="h-4 w-4 text-blue-600" />
                Download Full JSON Backup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank / Card Statement CSV Importer */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-emerald-500" />
              CSV Statement Import
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={defaultAccId}
                onChange={(e) => setDefaultAccId(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    Default: {a.name}
                  </option>
                ))}
              </select>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                Choose CSV
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={loadSampleCsv}
              >
                Sample CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {importBanner && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              {importBanner}
            </div>
          )}
          {importErrors.length > 0 && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-600">
              {importErrors.join(' ')}
            </div>
          )}

          {candidates.length === 0 ? (
            <div className="space-y-2">
              <textarea
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono"
                placeholder="Or paste CSV rows here (date,description,amount,type,category,merchant)"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
              {csvText.trim().length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleParseCsv(csvText, 'pasted-statement.csv')}
                >
                  Parse Pasted CSV
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="p-2">Keep</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Description</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Type</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {candidates.map((c) => (
                      <tr key={c.id}>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={c.selected}
                            disabled={c.errors.length > 0}
                            onChange={(e) =>
                              setCandidates((prev) =>
                                prev.map((row) =>
                                  row.id === c.id ? { ...row, selected: e.target.checked } : row
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2 whitespace-nowrap">{c.occurredOn}</td>
                        <td className="p-2">{c.description}</td>
                        <td className="p-2">
                          <select
                            value={c.category}
                            onChange={(e) =>
                              setCandidates((prev) =>
                                prev.map((row) =>
                                  row.id === c.id ? { ...row, category: e.target.value } : row
                                )
                              )
                            }
                            className="h-7 rounded border border-input bg-background px-1.5 text-[11px]"
                          >
                            {MONEY_NEST_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 capitalize">{c.kind}</td>
                        <td className="p-2 text-right font-semibold tabular-nums">
                          {formatINR(c.amount)}
                        </td>
                        <td className="p-2">
                          {c.errors.length > 0 ? (
                            <Badge variant="destructive" className="text-[9px]">
                              {c.errors[0]}
                            </Badge>
                          ) : c.status === 'possible_duplicate' ? (
                            <Badge variant="outline" className="text-[9px] text-amber-600">
                              Duplicate Warning
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[9px]">
                              Ready
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {candidates.filter((c) => c.selected).length} of {candidates.length} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCandidates([])}
                  >
                    Clear Preview
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={importing || candidates.filter((c) => c.selected).length === 0}
                    onClick={handleCommitImport}
                  >
                    {importing ? 'Importing...' : 'Commit Selected Rows'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders & Refunds Tracker */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <PackageCheck className="h-4 w-4 text-emerald-500" />
            Orders &amp; Refunds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={handleAddOrder}
            className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end rounded-xl bg-muted/30 p-3 border border-border/60"
          >
            <div className="space-y-1">
              <Label className="text-[10px]">Platform</Label>
              <Input
                value={orderPlatform}
                onChange={(e) => setOrderPlatform(e.target.value)}
                placeholder="Amazon"
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-[10px]">Order Item(s)</Label>
              <Input
                value={orderDesc}
                onChange={(e) => setOrderDesc(e.target.value)}
                placeholder="Item description"
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Order Ref</Label>
              <Input
                value={orderRef}
                onChange={(e) => setOrderRef(e.target.value)}
                placeholder="406-..."
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Total / Refund Due (₹)</Label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  value={orderAmt}
                  onChange={(e) => setOrderAmt(e.target.value)}
                  placeholder="Paid"
                  className="h-8 text-xs"
                  required
                />
                <Input
                  type="number"
                  value={refundExpAmt}
                  onChange={(e) => setRefundExpAmt(e.target.value)}
                  placeholder="Ref?"
                  title="Expected Refund Amount (optional)"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-1">
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="h-8 text-xs hidden"
              />
              <Button type="submit" size="sm" className="h-8 w-full text-xs gap-1" disabled={addingOrder}>
                <PlusCircle className="h-3.5 w-3.5" />
                Track
              </Button>
            </div>
          </form>

          {orders.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No online orders tracked yet.
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border p-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-2">
                      <span>{ord.description}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {ord.platform}
                      </Badge>
                      {ord.refund_status === 'expected' && (
                        <Badge className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                          Refund Awaited: {formatINR(ord.refund_expected_amount)}
                        </Badge>
                      )}
                      {ord.refund_status === 'confirmed' && (
                        <Badge className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                          Refund Received
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDateIN(ord.occurred_on)}
                      {ord.order_ref ? ` · #${ord.order_ref}` : ''} · Order Total:{' '}
                      {formatINR(ord.amount)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {ord.refund_status === 'expected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => handleConfirmRefund(ord)}
                      >
                        Mark Refund Credited
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteOrder(ord.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
