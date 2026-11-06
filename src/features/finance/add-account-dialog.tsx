'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createFinanceAccountSchema,
  type CreateFinanceAccountInput,
} from '@/lib/validation/finance';
import { createAccountAction } from '@/features/finance/native-actions';
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

export function AddAccountDialog({ onAccountCreated }: { onAccountCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFinanceAccountInput>({
    resolver: zodResolver(createFinanceAccountSchema),
    defaultValues: {
      name: '',
      institution: '',
      kind: 'bank',
      maskedSuffix: '0000',
      balance: 0,
      accent: '#2563eb',
    },
  });

  const onSubmit = async (values: CreateFinanceAccountInput) => {
    setServerError(null);
    const res = await createAccountAction(values);
    if (res.error) {
      setServerError(res.error);
    } else {
      reset();
      setOpen(false);
      onAccountCreated?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground hover:bg-primary/80 h-8 px-2.5 text-xs gap-1.5 font-medium cursor-pointer">
        <PlusCircle className="h-3.5 w-3.5" />
        Add Account / Card
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Account or Card</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-2">
          {serverError && (
            <div className="p-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/50 rounded-md">
              {serverError}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="acc-name" className="text-xs">Account / Card Nickname</Label>
            <Input id="acc-name" placeholder="e.g. HDFC Salary, Amazon ICICI" {...register('name')} />
            {errors.name && <p className="text-[10px] text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="institution" className="text-xs">Bank / Institution</Label>
              <Input id="institution" placeholder="e.g. HDFC Bank, SBI" {...register('institution')} />
              {errors.institution && <p className="text-[10px] text-red-500">{errors.institution.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="kind" className="text-xs">Account Type</Label>
              <select
                id="kind"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register('kind')}
              >
                <option value="bank">Bank Account</option>
                <option value="credit_card">Credit Card</option>
                <option value="wallet">Digital Wallet / Cash</option>
                <option value="pay_later">Pay Later (BNPL)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="balance" className="text-xs">Current Balance (₹)</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('balance', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maskedSuffix" className="text-xs">Last 4 Digits</Label>
              <Input id="maskedSuffix" maxLength={4} placeholder="4821" {...register('maskedSuffix')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="creditLimit" className="text-xs">Credit Limit (if card)</Label>
              <Input
                id="creditLimit"
                type="number"
                placeholder="Optional"
                {...register('creditLimit', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="accent" className="text-xs">Card Color Accent</Label>
              <select
                id="accent"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                {...register('accent')}
              >
                <option value="#2563eb">Classic Blue</option>
                <option value="#059669">Emerald Green</option>
                <option value="#d97706">Gold / Amber</option>
                <option value="#7c3aed">Purple</option>
                <option value="#dc2626">Crimson</option>
                <option value="#0f172a">Obsidian Dark</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Account
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
