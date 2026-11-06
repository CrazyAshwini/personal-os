'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createFinanceBillSchema,
  type CreateFinanceBillInput,
} from '@/lib/validation/finance';
import {
  createBillAction,
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

interface AddBillDialogProps {
  accounts: FinanceAccountRow[];
  onBillCreated?: () => void;
}

export function AddBillDialog({ accounts, onBillCreated }: AddBillDialogProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [defaultDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFinanceBillInput>({
    resolver: zodResolver(createFinanceBillSchema),
    defaultValues: {
      name: '',
      amount: 0,
      dueDate: defaultDueDate,
      frequency: 'monthly',
      category: 'Utilities',
    },
  });

  const onSubmit = async (values: CreateFinanceBillInput) => {
    setServerError(null);
    const res = await createBillAction(values);
    if (res.error) {
      setServerError(res.error);
    } else {
      reset();
      setOpen(false);
      onBillCreated?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-foreground h-8 px-2.5 text-xs gap-1.5 font-medium cursor-pointer">
        <PlusCircle className="h-3.5 w-3.5" />
        Add Bill / Payable
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Recurring Bill</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-2">
          {serverError && (
            <div className="p-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/50 rounded-md">
              {serverError}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="bill-name" className="text-xs">Bill Name</Label>
            <Input id="bill-name" placeholder="e.g. Electricity, Broadband, Rent" {...register('name')} />
            {errors.name && <p className="text-[10px] text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="bill-amount" className="text-xs">Amount (₹)</Label>
              <Input
                id="bill-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-[10px] text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="bill-due" className="text-xs">Due Date</Label>
              <Input id="bill-due" type="date" {...register('dueDate')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="bill-freq" className="text-xs">Frequency</Label>
              <select
                id="bill-freq"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                {...register('frequency')}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bill-cat" className="text-xs">Category</Label>
              <select
                id="bill-cat"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                {...register('category')}
              >
                <option value="Utilities">Utilities</option>
                <option value="Housing">Housing / Rent</option>
                <option value="Subscriptions">Subscriptions</option>
                <option value="Credit Card">Credit Card Bill</option>
                <option value="Insurance">Insurance</option>
                <option value="Education">Education / Fees</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bill-acc" className="text-xs">Paying Account (optional)</Label>
            <select
              id="bill-acc"
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              {...register('accountId')}
            >
              <option value="">None specified</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (•••• {acc.masked_suffix})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Bill
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
