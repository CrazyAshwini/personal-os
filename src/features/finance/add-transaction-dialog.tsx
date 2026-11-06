'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createFinanceTransactionSchema,
  type CreateFinanceTransactionInput,
} from '@/lib/validation/finance';
import {
  createTransactionAction,
  type FinanceAccountRow,
} from '@/features/finance/native-actions';
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

const CATEGORIES = [
  'Food',
  'Groceries',
  'Housing',
  'Utilities',
  'Transport',
  'Education',
  'Health',
  'Shopping',
  'Subscriptions',
  'Entertainment',
  'Travel',
  'Salary',
  'Investments',
  'Personal Care',
  'Other',
];

interface AddTransactionDialogProps {
  accounts: FinanceAccountRow[];
  onTransactionCreated?: () => void;
}

export function AddTransactionDialog({
  accounts,
  onTransactionCreated,
}: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    watch,
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
    },
  });

  const selectedKind = watch('kind');

  const onSubmit = async (values: CreateFinanceTransactionInput) => {
    setServerError(null);
    const res = await createTransactionAction(values);
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
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground hover:bg-primary/80 h-8 px-2.5 text-xs gap-1.5 font-medium cursor-pointer">
        <PlusCircle className="h-3.5 w-3.5" />
        Log Transaction
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-2">
          {serverError && (
            <div className="p-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/50 rounded-md">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {(['expense', 'income', 'transfer'] as const).map((kind) => (
              <label
                key={kind}
                className={`flex items-center justify-center py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                  selectedKind === kind
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'border-input hover:bg-muted text-muted-foreground'
                }`}
              >
                <input
                  type="radio"
                  value={kind}
                  className="sr-only"
                  {...register('kind')}
                />
                <span className="capitalize">{kind}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="amount" className="text-xs">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                autoFocus
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-[10px] text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="category" className="text-xs">Category</Label>
              <select
                id="category"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                {...register('category')}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs">Description</Label>
            <Input
              id="description"
              placeholder="e.g. Swiggy delivery, Metro recharge"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-[10px] text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="account" className="text-xs">
                {selectedKind === 'transfer' ? 'From Account' : 'Account / Payment Source'}
              </Label>
              <select
                id="account"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                {...register('accountId')}
              >
                <option value="">No account (Cash / Direct)</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (•••• {acc.masked_suffix})
                  </option>
                ))}
              </select>
            </div>

            {selectedKind === 'transfer' ? (
              <div className="space-y-1">
                <Label htmlFor="toAccount" className="text-xs">To Account</Label>
                <select
                  id="toAccount"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                  {...register('toAccountId')}
                >
                  <option value="">Select destination</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (•••• {acc.masked_suffix})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="merchant" className="text-xs">Merchant / Payee</Label>
                <Input id="merchant" placeholder="e.g. Starbucks, Amazon" {...register('merchant')} />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="occurredOn" className="text-xs">Date</Label>
            <Input id="occurredOn" type="date" {...register('occurredOn')} />
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
