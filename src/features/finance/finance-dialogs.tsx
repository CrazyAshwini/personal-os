'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, PlusCircle, Calculator } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createEmiAgreementAction,
  createFDAction,
  createLoanAction,
  payBillWithAccountAction,
  updateAccountAction,
  updateTransactionAction,
  upsertAccountSnapshotAction,
} from './native-actions';
import {
  calculateFdMaturity,
  formatINR,
  todayIST,
} from './finance-calculations';
import {
  MONEY_NEST_CATEGORIES,
  type FinanceAccountRow,
  type FinanceAccountSnapshotItem,
  type FinanceBillRow,
  type FinanceEmiAgreementItem,
  type FinanceTransactionRow,
} from './finance-types';

export function EditTransactionDialog({
  transaction,
  accounts,
  open,
  onOpenChange,
  onSaved,
}: {
  transaction: FinanceTransactionRow | null;
  accounts: FinanceAccountRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '0');
  const [kind, setKind] = useState<FinanceTransactionRow['kind']>(
    transaction?.kind || 'expense'
  );
  const [category, setCategory] = useState(transaction?.category || 'Food');
  const [description, setDescription] = useState(transaction?.description || '');
  const [merchant, setMerchant] = useState(transaction?.merchant || '');
  const [accountId, setAccountId] = useState(transaction?.account_id || '');
  const [toAccountId, setToAccountId] = useState(transaction?.to_account_id || '');
  const [occurredOn, setOccurredOn] = useState(transaction?.occurred_on || todayIST());
  const [notes, setNotes] = useState(transaction?.notes || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!transaction) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await updateTransactionAction({
      id: transaction.id,
      amount: Number(amount),
      currency: transaction.currency || 'INR',
      kind,
      category,
      description,
      merchant: merchant || undefined,
      accountId: accountId || null,
      toAccountId: toAccountId || null,
      occurredOn,
      notes: notes || undefined,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else {
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3 pt-2">
          {error && (
            <div className="p-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as FinanceTransactionRow['kind'])}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
                <option value="bill_payment">Bill Payment</option>
                <option value="refund">Refund</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                {MONEY_NEST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {!MONEY_NEST_CATEGORIES.includes(
                  category as (typeof MONEY_NEST_CATEGORIES)[number]
                ) && <option value={category}>{category}</option>}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Account</Label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="">No Account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {kind === 'transfer' || kind === 'bill_payment' ? (
              <div className="space-y-1">
                <Label className="text-xs">To Account</Label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="">None</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs">Merchant / Platform</Label>
                <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notes / Reference</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Update Transaction
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditAccountDialog({
  account,
  open,
  onOpenChange,
  onSaved,
}: {
  account: FinanceAccountRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(account?.name || '');
  const [institution, setInstitution] = useState(account?.institution || '');
  const [kind, setKind] = useState<FinanceAccountRow['kind']>(account?.kind || 'bank');
  const [suffix, setSuffix] = useState(account?.masked_suffix || '');
  const [balance, setBalance] = useState(account ? String(account.balance) : '0');
  const [creditLimit, setCreditLimit] = useState(
    account && account.credit_limit !== null ? String(account.credit_limit) : ''
  );
  const [billingDay, setBillingDay] = useState(
    account && account.billing_day !== null ? String(account.billing_day) : ''
  );
  const [dueDay, setDueDay] = useState(
    account && account.due_day !== null ? String(account.due_day) : ''
  );
  const [accent, setAccent] = useState(account?.accent || '#059669');
  const [active, setActive] = useState(account ? account.active : true);
  const [notes, setNotes] = useState(account?.notes || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!account) return null;

  const isDebt = kind === 'credit_card' || kind === 'pay_later';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await updateAccountAction({
      id: account.id,
      name,
      institution,
      kind,
      maskedSuffix: suffix,
      balance: Number(balance) || 0,
      creditLimit: creditLimit ? Number(creditLimit) : null,
      billingDay: billingDay ? Number(billingDay) : null,
      dueDay: dueDay ? Number(dueDay) : null,
      accent,
      active,
      notes: notes || undefined,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else {
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Account / Card</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3 pt-2">
          {error && (
            <div className="p-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Account / Card Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Institution</Label>
              <Input
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as FinanceAccountRow['kind'])}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="bank">Bank Account</option>
                <option value="credit_card">Credit Card</option>
                <option value="wallet">Digital Wallet</option>
                <option value="pay_later">Pay Later</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Last 4 Digits</Label>
              <Input value={suffix} onChange={(e) => setSuffix(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                {isDebt ? 'Current Due / Used (₹)' : 'Current Balance (₹)'}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                required
              />
            </div>
          </div>

          {isDebt && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Credit Limit</Label>
                <Input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bill Day</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={billingDay}
                  onChange={(e) => setBillingDay(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Day</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Card Accent</Label>
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-7 w-10 rounded border border-input cursor-pointer"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <span>Active account</span>
            </label>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AccountSnapshotDialog({
  account,
  open,
  onOpenChange,
  onSnapshotSaved,
}: {
  account: FinanceAccountRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSnapshotSaved: (snapshot: FinanceAccountSnapshotItem) => void;
}) {
  const isDebtInitial = account
    ? account.kind === 'credit_card' || account.kind === 'pay_later'
    : false;
  const [asOf, setAsOf] = useState(todayIST());
  const [balance, setBalance] = useState(
    account && !isDebtInitial ? String(account.balance) : ''
  );
  const [outstanding, setOutstanding] = useState(
    account && isDebtInitial ? String(Math.abs(Number(account.balance))) : ''
  );
  const [availableCredit, setAvailableCredit] = useState(
    account && isDebtInitial && account.credit_limit
      ? String(Math.max(0, Number(account.credit_limit) - Math.abs(Number(account.balance))))
      : ''
  );
  const [billedAmount, setBilledAmount] = useState('');
  const [unbilledAmount, setUnbilledAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!account) return null;

  const isDebt = account.kind === 'credit_card' || account.kind === 'pay_later';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await upsertAccountSnapshotAction({
      accountId: account.id,
      asOf,
      balance: !isDebt && balance !== '' ? Number(balance) : null,
      outstanding: isDebt && outstanding !== '' ? Number(outstanding) : null,
      availableCredit: isDebt && availableCredit !== '' ? Number(availableCredit) : null,
      billedAmount: isDebt && billedAmount !== '' ? Number(billedAmount) : null,
      unbilledAmount: isDebt && unbilledAmount !== '' ? Number(unbilledAmount) : null,
      source: 'statement',
      notes: notes || null,
    });

    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      onSnapshotSaved(res.data);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Balance Checkpoint · {account.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          {error && (
            <div className="p-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Statement / Verified As-Of Date</Label>
            <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} required />
          </div>

          {!isDebt ? (
            <div className="space-y-1">
              <Label className="text-xs">Verified Bank / Wallet Balance (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                required
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Total Outstanding Due (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={outstanding}
                    onChange={(e) => setOutstanding(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Issuer Available Credit (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={availableCredit}
                    onChange={(e) => setAvailableCredit(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Billed Statement Due (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={billedAmount}
                    onChange={(e) => setBilledAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unbilled Spends / EMIs (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={unbilledAmount}
                    onChange={(e) => setUnbilledAmount(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Reconciliation Note</Label>
            <Input
              placeholder="e.g. Verified via NetBanking / statement PDF"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Checkpoint
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PayBillDialog({
  bill,
  accounts,
  open,
  onOpenChange,
  onPaid,
}: {
  bill: FinanceBillRow | null;
  accounts: FinanceAccountRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void;
}) {
  const bankAccounts = accounts.filter(
    (a) => a.active && (a.kind === 'bank' || a.kind === 'wallet')
  );
  const [sourceId, setSourceId] = useState(bankAccounts[0]?.id || accounts[0]?.id || '');
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '0');
  const [paidOn, setPaidOn] = useState(todayIST());
  const [busy, setBusy] = useState(false);

  if (!bill) return null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId) return;
    setBusy(true);
    await payBillWithAccountAction({
      billId: bill.id,
      sourceAccountId: sourceId,
      toAccountId: bill.account_id,
      amount: Number(amount),
      paidOn,
    });
    setBusy(false);
    onOpenChange(false);
    onPaid();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Pay Bill · {bill.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handlePay} className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">Pay From Account</Label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              required
            >
              {accounts
                .filter((a) => a.active)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatINR(a.balance)})
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Date</Label>
              <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Logs a bill payment and updates account balances.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Confirm Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddFixedDepositDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [principal, setPrincipal] = useState('50000');
  const [rate, setRate] = useState('7.25');
  const [tenureMonths, setTenureMonths] = useState('12');
  const [compounding, setCompounding] = useState<'quarterly' | 'monthly' | 'yearly' | 'simple'>(
    'quarterly'
  );
  const [openingDate, setOpeningDate] = useState(todayIST());
  const [payoutMethod, setPayoutMethod] = useState('cumulative');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calc = useMemo(
    () =>
      calculateFdMaturity({
        principal: Number(principal) || 0,
        annualRatePercent: Number(rate) || 0,
        tenureMonths: Number(tenureMonths) || 0,
        compoundingFrequency: compounding,
      }),
    [principal, rate, tenureMonths, compounding]
  );

  const computedMaturityDate = useMemo(() => {
    const d = new Date(`${openingDate || todayIST()}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + (Number(tenureMonths) || 12));
    return Number.isNaN(d.getTime()) ? todayIST() : d.toISOString().slice(0, 10);
  }, [openingDate, tenureMonths]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createFDAction({
      name,
      institution,
      principal: Number(principal),
      interestRate: Number(rate),
      openingDate,
      maturityDate: computedMaturityDate,
      maturityAmount: calc.maturityAmount,
      payoutMethod,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else {
      setName('');
      setInstitution('');
      setOpen(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 text-xs gap-1.5 font-medium cursor-pointer touch-manipulation">
        <PlusCircle className="h-3.5 w-3.5" />
        Add FD + Calculator
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-emerald-500" />
            New Fixed Deposit &amp; Maturity Calculator
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3 pt-2">
          {error && (
            <div className="p-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Deposit Name</Label>
              <Input
                placeholder="e.g. SBI Tax Saver FD"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bank / Institution</Label>
              <Input
                placeholder="e.g. State Bank of India"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Principal (₹)</Label>
              <Input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rate (% p.a.)</Label>
              <Input
                type="number"
                step="0.05"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tenure (Months)</Label>
              <Input
                type="number"
                min="1"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Opening Date</Label>
              <Input
                type="date"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Compounding</Label>
              <select
                value={compounding}
                onChange={(e) =>
                  setCompounding(e.target.value as 'quarterly' | 'monthly' | 'yearly' | 'simple')
                }
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="quarterly">Quarterly (Standard Bank FD)</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Annual</option>
                <option value="simple">Simple Interest</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Maturity Instruction</Label>
            <select
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
            >
              <option value="cumulative">Cumulative (Payout at maturity)</option>
              <option value="reinvest">Auto-Renew / Reinvest</option>
              <option value="pledged_secured_card">Pledged against Secured Card</option>
              <option value="quarterly_interest">Quarterly Interest Payout</option>
            </select>
          </div>

          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Maturity Date</span>
              <span className="font-medium">{computedMaturityDate}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Interest Earned</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                +{formatINR(calc.interestEarned)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-emerald-500/20">
              <span>Projected Maturity Value</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {formatINR(calc.maturityAmount)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Create Fixed Deposit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddLoanOrEmiDialog({
  accounts,
  onLoanCreated,
  onEmiAgreementCreated,
}: {
  accounts: FinanceAccountRow[];
  onLoanCreated: () => void;
  onEmiAgreementCreated: (item: FinanceEmiAgreementItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'emi_agreement' | 'institutional_loan'>('emi_agreement');
  const [title, setTitle] = useState('');
  const [lenderOrMerchant, setLenderOrMerchant] = useState('');
  const [accountId, setAccountId] = useState(
    accounts.find((a) => a.kind === 'pay_later' || a.kind === 'credit_card')?.id || ''
  );
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('16');
  const [processingFee, setProcessingFee] = useState('0');
  const [months, setMonths] = useState('9');
  const [monthlyEmi, setMonthlyEmi] = useState('');
  const [firstDueDate, setFirstDueDate] = useState(todayIST());
  const [dueDay, setDueDay] = useState('5');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimatedEmi = useMemo(() => {
    const p = Number(principal) || 0;
    const n = Number(months) || 1;
    const r = (Number(interestRate) || 0) / 100 / 12;
    if (p <= 0 || n <= 0) return 0;
    if (r === 0) return Number((p / n).toFixed(2));
    const factor = Math.pow(1 + r, n);
    return Number(((p * r * factor) / (factor - 1)).toFixed(2));
  }, [principal, months, interestRate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const emiVal = Number(monthlyEmi) > 0 ? Number(monthlyEmi) : estimatedEmi;

    if (mode === 'emi_agreement') {
      const res = await createEmiAgreementAction({
        accountId: accountId || null,
        title,
        merchant: lenderOrMerchant || null,
        financedPrincipal: Number(principal),
        annualInterestRate: Number(interestRate) || 0,
        processingFee: Number(processingFee) || 0,
        monthlyEmi: emiVal,
        durationMonths: Number(months),
        firstDueDate,
      });
      setBusy(false);
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        onEmiAgreementCreated(res.data);
        setTitle('');
        setPrincipal('');
        setOpen(false);
      }
    } else {
      const res = await createLoanAction({
        name: title,
        lender: lenderOrMerchant || 'Bank',
        principal: Number(principal),
        outstanding: Number(principal),
        interestRate: Number(interestRate) || 0,
        monthlyEmi: emiVal,
        totalEmis: Number(months),
        remainingEmis: Number(months),
        dueDay: Number(dueDay) || 5,
        disbursedOn: firstDueDate,
      });
      setBusy(false);
      if (res.error) {
        setError(res.error);
      } else {
        setTitle('');
        setPrincipal('');
        setOpen(false);
        onLoanCreated();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-foreground h-8 px-3 text-xs gap-1.5 font-medium cursor-pointer touch-manipulation">
        <PlusCircle className="h-3.5 w-3.5" />
        Add EMI / Loan
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Loan or Card / Pay Later EMI</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3 pt-2">
          {error && (
            <div className="p-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('emi_agreement')}
              className={`py-2 px-2 rounded-md border text-xs font-medium cursor-pointer ${
                mode === 'emi_agreement'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input text-muted-foreground'
              }`}
            >
              Pay Later / Card EMI
            </button>
            <button
              type="button"
              onClick={() => setMode('institutional_loan')}
              className={`py-2 px-2 rounded-md border text-xs font-medium cursor-pointer ${
                mode === 'institutional_loan'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input text-muted-foreground'
              }`}
            >
              Bank / Institutional Loan
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Purchase / Loan Title</Label>
              <Input
                placeholder="e.g. TV EMI or Car Loan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                {mode === 'emi_agreement' ? 'Merchant / Platform' : 'Lender'}
              </Label>
              <Input
                placeholder="e.g. Amazon / HDFC"
                value={lenderOrMerchant}
                onChange={(e) => setLenderOrMerchant(e.target.value)}
              />
            </div>
          </div>

          {mode === 'emi_agreement' && (
            <div className="space-y-1">
              <Label className="text-xs">Card / Pay Later Account</Label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="">Not linked to card</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.kind})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Principal (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Interest (% p.a.)</Label>
              <Input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tenure (Months)</Label>
              <Input
                type="number"
                min="1"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Monthly EMI (Est: {formatINR(estimatedEmi)})</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={String(estimatedEmi || '')}
                value={monthlyEmi}
                onChange={(e) => setMonthlyEmi(e.target.value)}
              />
            </div>
            {mode === 'emi_agreement' ? (
              <div className="space-y-1">
                <Label className="text-xs">First EMI Due Date</Label>
                <Input
                  type="date"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs">Monthly Due Day</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                />
              </div>
            )}
          </div>

          {mode === 'emi_agreement' && (
            <div className="space-y-1">
              <Label className="text-xs">Processing Fee (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={processingFee}
                onChange={(e) => setProcessingFee(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save {mode === 'emi_agreement' ? 'EMI Agreement' : 'Loan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
