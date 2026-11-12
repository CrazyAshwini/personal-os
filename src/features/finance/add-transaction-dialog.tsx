'use client';

import React, { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createFinanceTransactionSchema,
  type CreateFinanceTransactionInput,
} from '@/lib/validation/finance';
import { createTransactionAction } from '@/features/finance/native-actions';
import {
  MONEY_NEST_CATEGORIES,
  type FinanceAccountRow,
} from '@/features/finance/finance-types';
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
import { PlusCircle, Loader2 } from 'lucide-react';

interface AddTransactionDialogProps {
  accounts: FinanceAccountRow[];
  onTransactionCreated?: () => void;
}

const TX_KINDS = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'bill_payment', label: 'Bill Pay' },
  { id: 'refund', label: 'Refund' },
] as const;

export function AddTransactionDialog({
  accounts,
  onTransactionCreated,
}: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFinanceTransactionInput>({
    resolver: zodResolver(createFinanceTransactionSchema),
    defaultValues: {
      kind: 'expense',
      amount: 0,
      currency: 'INR',
      category: 'Food',
      description: '',
      merchant: '',
      occurredOn: today,
      accountId: accounts[0]?.id || undefined,
      toAccountId: undefined,
      notes: '',
    },
  });

  const selectedKind = useWatch({ control, name: 'kind', defaultValue: 'expense' });

  const onSubmit = async (values: CreateFinanceTransactionInput) => {
    setServerError(null);
    const res = await createTransactionAction({
      ...values,
      accountId: values.accountId || null,
      toAccountId: values.toAccountId || null,
    });
    if (res.error) {
      setServerError(res.error);
    } else {
      reset();
      setOpen(false);
      onTransactionCreated?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 text-xs gap-1.5 font-medium cursor-pointer touch-manipulation">
        <PlusCircle className="h-3.5 w-3.5" />
        Log Transaction
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-2">
          {serverError && (
            <div className="p-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/50 rounded-md">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-5 gap-1.5">
            {TX_KINDS.map((item) => (
              <label
                key={item.id}
                className={`flex items-center justify-center py-2 px-1 rounded-md border text-[11px] font-medium cursor-pointer transition-colors touch-manipulation ${
                  selectedKind === item.id
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'border-input hover:bg-muted text-muted-foreground'
                }`}
              >
                <input
                  type="radio"
                  value={item.id}
                  className="sr-only"
                  {...register('kind')}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="tx-amount" className="text-xs">Amount (₹)</Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                autoFocus
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-[10px] text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="tx-category" className="text-xs">Category</Label>
              <select
                id="tx-category"
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
                {...register('category')}
              >
                {MONEY_NEST_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="tx-description" className="text-xs">Description</Label>
            <Input
              id="tx-description"
              placeholder="e.g. Swiggy dinner, Credit card payment, Refund"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-[10px] text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="tx-account" className="text-xs">
                {selectedKind === 'transfer' || selectedKind === 'bill_payment'
                  ? 'From Account'
                  : selectedKind === 'income' || selectedKind === 'refund'
                    ? 'Credited To Account'
                    : 'Paid From Account'}
              </Label>
              <select
                id="tx-account"
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
                {...register('accountId')}
              >
                <option value="">No account (Cash / Direct)</option>
                {accounts.filter((a) => a.active).map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (•••• {acc.masked_suffix})
                  </option>
                ))}
              </select>
            </div>

            {selectedKind === 'transfer' || selectedKind === 'bill_payment' ? (
              <div className="space-y-1">
                <Label htmlFor="tx-toAccount" className="text-xs">
                  {selectedKind === 'bill_payment' ? 'Card / Pay Later Cleared (optional)' : 'To Account'}
                </Label>
                <select
                  id="tx-toAccount"
                  className="w-full h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
                  {...register('toAccountId')}
                >
                  <option value="">Select destination</option>
                  {accounts.filter((a) => a.active).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (•••• {acc.masked_suffix})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="tx-merchant" className="text-xs">Merchant / Platform</Label>
                <Input
                  id="tx-merchant"
                  placeholder="e.g. Swiggy, Amazon, Starbucks"
                  {...register('merchant')}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="tx-occurredOn" className="text-xs">Date</Label>
              <Input id="tx-occurredOn" type="date" {...register('occurredOn')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tx-notes" className="text-xs">UTR / Ref / Notes (optional)</Label>
              <Input
                id="tx-notes"
                placeholder="Optional note"
                {...register('notes')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Transaction
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
