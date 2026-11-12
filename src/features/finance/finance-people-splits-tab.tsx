'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  PlusCircle,
  Trash2,
  Users,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  computeExpenseGroupSummary,
  computePersonalLoansSummary,
  formatDateIN,
  formatINR,
  todayIST,
} from './finance-calculations';
import type {
  FinanceAccountRow,
  FinanceExpenseGroupItem,
  FinancePersonalLoanItem,
} from './finance-types';
import {
  createExpenseGroupAction,
  createPersonalLoanAction,
  deleteExpenseGroupAction,
  deletePersonalLoanAction,
  recordGroupSettlementAction,
  recordPersonalLoanRepaymentAction,
} from './native-actions';

export function FinancePeopleSplitsTab({
  accounts,
  personalLoans,
  expenseGroups,
  onPersonalLoansChange,
  onExpenseGroupsChange,
}: {
  accounts: FinanceAccountRow[];
  personalLoans: FinancePersonalLoanItem[];
  expenseGroups: FinanceExpenseGroupItem[];
  onPersonalLoansChange: (next: FinancePersonalLoanItem[]) => void;
  onExpenseGroupsChange: (next: FinanceExpenseGroupItem[]) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'lent' | 'borrowed' | 'settled'>('all');
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [repayLoan, setRepayLoan] = useState<FinancePersonalLoanItem | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [settleGroup, setSettleGroup] = useState<FinanceExpenseGroupItem | null>(null);

  // Personal loan creation form
  const [loanDir, setLoanDir] = useState<'lent' | 'borrowed'>('lent');
  const [personName, setPersonName] = useState('');
  const [loanPrincipal, setLoanPrincipal] = useState('');
  const [loanDate, setLoanDate] = useState(todayIST());
  const [loanDueDate, setLoanDueDate] = useState('');
  const [loanNotes, setLoanNotes] = useState('');
  const [busyLoan, setBusyLoan] = useState(false);

  // Repayment form
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(todayIST());
  const [repayNote, setRepayNote] = useState('');

  // Split group creation form
  const [groupName, setGroupName] = useState('');
  const [groupMode, setGroupMode] = useState<'split_bill' | 'contribution_pool'>('split_bill');
  const [groupTotal, setGroupTotal] = useState('');
  const [groupDate, setGroupDate] = useState(todayIST());
  const [paidByOwner, setPaidByOwner] = useState(true);
  const [participantsText, setParticipantsText] = useState('You, Friend 1, Friend 2');
  const [busyGroup, setBusyGroup] = useState(false);

  // Settlement form
  const [settleCounterparty, setSettleCounterparty] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDate, setSettleDate] = useState(todayIST());

  const plSummary = useMemo(
    () => computePersonalLoansSummary(personalLoans),
    [personalLoans]
  );

  const filteredLoans = personalLoans.filter((l) => {
    if (filter === 'settled') return l.status === 'settled' || l.outstanding <= 0;
    if (filter === 'lent') return l.direction === 'lent' && l.status === 'active';
    if (filter === 'borrowed') return l.direction === 'borrowed' && l.status === 'active';
    return true;
  });

  const handleCreatePersonalLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyLoan(true);
    const res = await createPersonalLoanAction({
      direction: loanDir,
      personName,
      principal: Number(loanPrincipal),
      occurredOn: loanDate,
      dueDate: loanDueDate || null,
      accountId: accounts[0]?.id || null,
      notes: loanNotes || null,
    });
    setBusyLoan(false);
    if (res.data) {
      onPersonalLoansChange([res.data, ...personalLoans]);
      setPersonName('');
      setLoanPrincipal('');
      setLoanNotes('');
      setLoanModalOpen(false);
    }
  };

  const handleRecordRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayLoan) return;
    const amt = Number(repayAmount);
    if (amt <= 0) return;

    const res = await recordPersonalLoanRepaymentAction({
      loanId: repayLoan.id,
      amount: amt,
      occurredOn: repayDate,
      note: repayNote || undefined,
    });
    if (res.data) {
      const updated = personalLoans.map((item) => {
        if (item.id !== repayLoan.id) return item;
        const nextOutstanding = Math.max(0, Number((item.outstanding - amt).toFixed(2)));
        return {
          ...item,
          outstanding: nextOutstanding,
          status: (nextOutstanding === 0 ? 'settled' : 'active') as 'active' | 'settled',
          repayments: [...item.repayments, res.data!.repayment],
        };
      });
      onPersonalLoansChange(updated);
      setRepayLoan(null);
      setRepayAmount('');
      setRepayNote('');
    }
  };

  const handleDeletePersonalLoan = async (id: string) => {
    await deletePersonalLoanAction(id);
    onPersonalLoansChange(personalLoans.filter((l) => l.id !== id));
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(groupTotal);
    const names = participantsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (total <= 0 || names.length === 0) return;

    const perHead = Number((total / names.length).toFixed(2));
    const shares = names.map((name, idx) => ({
      participant: name,
      shareAmount:
        idx === names.length - 1
          ? Number((total - perHead * (names.length - 1)).toFixed(2))
          : perHead,
      isOwner: idx === 0 || name.toLowerCase() === 'you',
    }));

    setBusyGroup(true);
    const res = await createExpenseGroupAction({
      name: groupName,
      mode: groupMode,
      totalCost: total,
      occurredOn: groupDate,
      paidByOwner,
      shares,
    });
    setBusyGroup(false);
    if (res.data) {
      onExpenseGroupsChange([res.data, ...expenseGroups]);
      setGroupName('');
      setGroupTotal('');
      setGroupModalOpen(false);
    }
  };

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleGroup) return;
    const amt = Number(settleAmount);
    if (amt <= 0 || !settleCounterparty.trim()) return;

    const direction = settleGroup.paid_by_owner ? 'incoming' : 'outgoing';
    const res = await recordGroupSettlementAction({
      groupId: settleGroup.id,
      counterparty: settleCounterparty,
      direction,
      amount: amt,
      occurredOn: settleDate,
    });

    if (res.data) {
      onExpenseGroupsChange(
        expenseGroups.map((g) =>
          g.id === settleGroup.id
            ? { ...g, settlements: [...g.settlements, res.data!] }
            : g
        )
      );
      setSettleGroup(null);
      setSettleAmount('');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    await deleteExpenseGroupAction(id);
    onExpenseGroupsChange(expenseGroups.filter((g) => g.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border p-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Money Lent (Owed to You)
          </span>
          <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatINR(plSummary.totalReceivable)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {plSummary.activeLentCount} active receivable(s)
          </p>
        </Card>
        <Card className="border-border p-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Money Borrowed (You Owe)
          </span>
          <div className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {formatINR(plSummary.totalPayable)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {plSummary.activeBorrowedCount} active payable(s)
          </p>
        </Card>
        <Card className="border-border p-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Net People Balance
          </span>
          <div
            className={`mt-1 text-xl font-bold tabular-nums ${
              plSummary.netPosition >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatINR(plSummary.netPosition)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Receivable minus payable
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal Loans Ledger */}
        <Card className="border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold">
              Personal Loans &amp; IOUs
            </CardTitle>
            <Button
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => setLoanModalOpen(true)}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add IOU
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'lent', 'borrowed', 'settled'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize cursor-pointer border ${
                    filter === tab
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {filteredLoans.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No personal loans in this view.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="rounded-xl border border-border p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            loan.direction === 'lent'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}
                        >
                          {loan.direction === 'lent' ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">
                            {loan.person_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {loan.direction === 'lent' ? 'Lent on' : 'Borrowed on'}{' '}
                            {formatDateIN(loan.occurred_on)}
                            {loan.due_date ? ` · Due ${formatDateIN(loan.due_date)}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold tabular-nums">
                          {formatINR(loan.outstanding)}
                        </div>
                        <div className="text-[10px] text-muted-foreground tabular-nums">
                          of {formatINR(loan.principal)}
                        </div>
                      </div>
                    </div>

                    {loan.notes && (
                      <p className="text-[11px] text-muted-foreground">{loan.notes}</p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <Badge
                        variant={loan.status === 'settled' ? 'outline' : 'secondary'}
                        className="text-[10px]"
                      >
                        {loan.status === 'settled'
                          ? 'Settled'
                          : `${loan.repayments.length} repayment(s)`}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        {loan.status !== 'settled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] px-2"
                            onClick={() => {
                              setRepayLoan(loan);
                              setRepayAmount(String(loan.outstanding));
                            }}
                          >
                            Record Payment
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeletePersonalLoan(loan.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Split Bills & Contribution Pools */}
        <Card className="border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="h-4 w-4 text-emerald-500" />
              Split Bills &amp; Pools
            </CardTitle>
            <Button
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => setGroupModalOpen(true)}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Split
            </Button>
          </CardHeader>
          <CardContent>
            {expenseGroups.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No split bills or group pools created yet.
              </div>
            ) : (
              <div className="space-y-3">
                {expenseGroups.map((group) => {
                  const gs = computeExpenseGroupSummary(group);
                  return (
                    <div
                      key={group.id}
                      className="rounded-xl border border-border p-3 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold flex items-center gap-1.5">
                            {group.name}
                            <Badge variant="outline" className="text-[9px]">
                              {group.mode === 'contribution_pool' ? 'Pool' : 'Split'}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Total {formatINR(group.total_cost)} · {formatDateIN(group.occurred_on)}{' '}
                            · {group.paid_by_owner ? 'You paid upfront' : 'Another person paid'}
                          </div>
                        </div>
                        <div className="text-right">
                          {gs.isSettled ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Settled
                            </span>
                          ) : (
                            <span
                              className={`text-xs font-bold tabular-nums ${
                                gs.receivable > 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {gs.receivable > 0
                                ? `+${formatINR(gs.receivable)} owed`
                                : `-${formatINR(gs.payable)} due`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 bg-muted/30 rounded-lg p-2">
                        {gs.participantBalances.map((p) => (
                          <div
                            key={p.participant}
                            className="flex items-center justify-between text-[11px]"
                          >
                            <span>{p.participant}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {p.remaining === 0 ? (
                                <span className="text-emerald-600 font-medium">Settled</span>
                              ) : (
                                `${formatINR(p.remaining)} remaining (of ${formatINR(p.share)})`
                              )}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-end gap-1.5">
                        {!gs.isSettled && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] px-2"
                            onClick={() => {
                              const firstUnsettled = gs.participantBalances.find(
                                (p) => p.remaining > 0
                              );
                              setSettleGroup(group);
                              setSettleCounterparty(firstUnsettled?.participant || '');
                              setSettleAmount(
                                firstUnsettled ? String(firstUnsettled.remaining) : ''
                              );
                            }}
                          >
                            Settle Share
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteGroup(group.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Personal Loan Modal */}
      <Dialog open={loanModalOpen} onOpenChange={setLoanModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Record Personal Loan / IOU</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePersonalLoan} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLoanDir('lent')}
                className={`py-2 rounded-md border text-xs font-medium cursor-pointer ${
                  loanDir === 'lent'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-input text-muted-foreground'
                }`}
              >
                Money Lent (Receivable)
              </button>
              <button
                type="button"
                onClick={() => setLoanDir('borrowed')}
                className={`py-2 rounded-md border text-xs font-medium cursor-pointer ${
                  loanDir === 'borrowed'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'border-input text-muted-foreground'
                }`}
              >
                Money Borrowed (Payable)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Person Name</Label>
                <Input
                  placeholder="e.g. Rohan Sharma"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Principal (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={loanPrincipal}
                  onChange={(e) => setLoanPrincipal(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expected Return Date</Label>
                <Input
                  type="date"
                  value={loanDueDate}
                  onChange={(e) => setLoanDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input
                placeholder="Reason or payment reference"
                value={loanNotes}
                onChange={(e) => setLoanNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLoanModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busyLoan}>
                {busyLoan ? 'Saving...' : 'Save IOU'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Repayment Modal */}
      <Dialog open={Boolean(repayLoan)} onOpenChange={(o) => !o && setRepayLoan(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Record Repayment · {repayLoan?.person_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordRepayment} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={repayDate}
                  onChange={(e) => setRepayDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Note</Label>
              <Input
                placeholder="e.g. Paid via UPI"
                value={repayNote}
                onChange={(e) => setRepayNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setRepayLoan(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Repayment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Split Group Modal */}
      <Dialog open={groupModalOpen} onOpenChange={setGroupModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Create Split Bill / Pool</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateGroup} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGroupMode('split_bill')}
                className={`py-2 rounded-md border text-xs font-medium cursor-pointer ${
                  groupMode === 'split_bill'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-input text-muted-foreground'
                }`}
              >
                Split Bill
              </button>
              <button
                type="button"
                onClick={() => setGroupMode('contribution_pool')}
                className={`py-2 rounded-md border text-xs font-medium cursor-pointer ${
                  groupMode === 'contribution_pool'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-input text-muted-foreground'
                }`}
              >
                Contribution Pool
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Event / Expense Name</Label>
                <Input
                  placeholder="e.g. Goa Trip, Flat Wi-Fi"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total Cost (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={groupTotal}
                  onChange={(e) => setGroupTotal(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={groupDate}
                  onChange={(e) => setGroupDate(e.target.value)}
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paidByOwner}
                    onChange={(e) => setPaidByOwner(e.target.checked)}
                  />
                  <span>I paid the bill upfront</span>
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Participants (comma separated, equal split)</Label>
              <Input
                value={participantsText}
                onChange={(e) => setParticipantsText(e.target.value)}
                placeholder="You, Karthik, Meera"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGroupModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busyGroup}>
                {busyGroup ? 'Saving...' : 'Create Split'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settle Group Share Modal */}
      <Dialog open={Boolean(settleGroup)} onOpenChange={(o) => !o && setSettleGroup(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Record Settlement · {settleGroup?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordSettlement} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Participant Name</Label>
              <Input
                value={settleCounterparty}
                onChange={(e) => setSettleCounterparty(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSettleGroup(null)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Confirm Settlement
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
