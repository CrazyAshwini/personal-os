'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import {
  createFinanceAccountSchema,
  createFinanceTransactionSchema,
  createFinanceBillSchema,
  createFinanceFDSchema,
  createFinanceLoanSchema,
  type CreateFinanceAccountInput,
  type CreateFinanceTransactionInput,
  type CreateFinanceBillInput,
  type CreateFinanceFDInput,
  type CreateFinanceLoanInput,
} from '@/lib/validation/finance';

export type FinanceAccountRow = Database['public']['Tables']['finance_accounts']['Row'];
export type FinanceTransactionRow = Database['public']['Tables']['finance_transactions']['Row'];
export type FinanceBillRow = Database['public']['Tables']['finance_bills']['Row'];
export type FinanceFDRow = Database['public']['Tables']['finance_fixed_deposits']['Row'];
export type FinanceLoanRow = Database['public']['Tables']['finance_loans']['Row'];

export interface NativeFinanceWorkspace {
  accounts: FinanceAccountRow[];
  transactions: FinanceTransactionRow[];
  bills: FinanceBillRow[];
  fixedDeposits: FinanceFDRow[];
  loans: FinanceLoanRow[];
}

export type NativeFinanceResult<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
};

export async function getNativeFinanceWorkspaceAction(): Promise<
  NativeFinanceResult<NativeFinanceWorkspace>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const [accRes, txRes, billRes, fdRes, loanRes] = await Promise.all([
    supabase
      .from('finance_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('finance_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('occurred_on', { ascending: false })
      .limit(100),
    supabase
      .from('finance_bills')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true }),
    supabase
      .from('finance_fixed_deposits')
      .select('*')
      .eq('user_id', user.id)
      .order('maturity_date', { ascending: true }),
    supabase
      .from('finance_loans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ]);

  if (accRes.error) return { error: accRes.error.message };

  return {
    success: true,
    data: {
      accounts: accRes.data || [],
      transactions: txRes.data || [],
      bills: billRes.data || [],
      fixedDeposits: fdRes.data || [],
      loans: loanRes.data || [],
    },
  };
}

export async function createAccountAction(
  values: CreateFinanceAccountInput
): Promise<NativeFinanceResult<FinanceAccountRow>> {
  const parsed = createFinanceAccountSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid account details.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('finance_accounts')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      institution: parsed.data.institution,
      kind: parsed.data.kind,
      masked_suffix: parsed.data.maskedSuffix,
      balance: parsed.data.balance,
      credit_limit: parsed.data.creditLimit || null,
      billing_day: parsed.data.billingDay || null,
      due_day: parsed.data.dueDay || null,
      accent: parsed.data.accent,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/finance');
  return { success: true, data };
}

export async function deleteAccountAction(accountId: string): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('finance_accounts')
    .delete()
    .eq('id', accountId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/finance');
  return { success: true };
}

export async function createTransactionAction(
  values: CreateFinanceTransactionInput
): Promise<NativeFinanceResult<FinanceTransactionRow>> {
  const parsed = createFinanceTransactionSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid transaction details.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { data: tx, error } = await supabase
    .from('finance_transactions')
    .insert({
      user_id: user.id,
      account_id: parsed.data.accountId || null,
      to_account_id: parsed.data.toAccountId || null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      kind: parsed.data.kind,
      category: parsed.data.category,
      description: parsed.data.description,
      merchant: parsed.data.merchant || null,
      occurred_on: parsed.data.occurredOn,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Adjust account balance if account_id is present
  if (parsed.data.accountId) {
    const { data: acc } = await supabase
      .from('finance_accounts')
      .select('balance')
      .eq('id', parsed.data.accountId)
      .eq('user_id', user.id)
      .single();

    if (acc) {
      let newBalance = Number(acc.balance);
      if (parsed.data.kind === 'expense' || parsed.data.kind === 'bill_payment') {
        newBalance -= parsed.data.amount;
      } else if (parsed.data.kind === 'income' || parsed.data.kind === 'refund') {
        newBalance += parsed.data.amount;
      } else if (parsed.data.kind === 'transfer') {
        newBalance -= parsed.data.amount;
      }
      await supabase
        .from('finance_accounts')
        .update({ balance: Number(newBalance.toFixed(2)) })
        .eq('id', parsed.data.accountId)
        .eq('user_id', user.id);
    }
  }

  // If transfer, increase recipient account balance
  if (parsed.data.kind === 'transfer' && parsed.data.toAccountId) {
    const { data: destAcc } = await supabase
      .from('finance_accounts')
      .select('balance')
      .eq('id', parsed.data.toAccountId)
      .eq('user_id', user.id)
      .single();

    if (destAcc) {
      const newDestBal = Number(destAcc.balance) + parsed.data.amount;
      await supabase
        .from('finance_accounts')
        .update({ balance: Number(newDestBal.toFixed(2)) })
        .eq('id', parsed.data.toAccountId)
        .eq('user_id', user.id);
    }
  }

  revalidatePath('/finance');
  return { success: true, data: tx };
}

export async function deleteTransactionAction(txId: string): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('finance_transactions')
    .delete()
    .eq('id', txId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/finance');
  return { success: true };
}

export async function createBillAction(
  values: CreateFinanceBillInput
): Promise<NativeFinanceResult<FinanceBillRow>> {
  const parsed = createFinanceBillSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid bill details.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('finance_bills')
    .insert({
      user_id: user.id,
      account_id: parsed.data.accountId || null,
      name: parsed.data.name,
      amount: parsed.data.amount,
      due_date: parsed.data.dueDate,
      frequency: parsed.data.frequency,
      status: 'pending',
      category: parsed.data.category,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/finance');
  return { success: true, data };
}

export async function toggleBillStatusAction(
  billId: string,
  newStatus: 'pending' | 'paid' | 'overdue'
): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('finance_bills')
    .update({ status: newStatus })
    .eq('id', billId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/finance');
  return { success: true };
}

export async function deleteBillAction(billId: string): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('finance_bills')
    .delete()
    .eq('id', billId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/finance');
  return { success: true };
}

export async function createFDAction(
  values: CreateFinanceFDInput
): Promise<NativeFinanceResult<FinanceFDRow>> {
  const parsed = createFinanceFDSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid FD details.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('finance_fixed_deposits')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      institution: parsed.data.institution,
      principal: parsed.data.principal,
      interest_rate: parsed.data.interestRate,
      opening_date: parsed.data.openingDate,
      maturity_date: parsed.data.maturityDate,
      maturity_amount: parsed.data.maturityAmount,
      payout_method: parsed.data.payoutMethod,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/finance');
  return { success: true, data };
}

export async function deleteFDAction(fdId: string): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('finance_fixed_deposits')
    .delete()
    .eq('id', fdId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/finance');
  return { success: true };
}

export async function createLoanAction(
  values: CreateFinanceLoanInput
): Promise<NativeFinanceResult<FinanceLoanRow>> {
  const parsed = createFinanceLoanSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid loan details.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('finance_loans')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      lender: parsed.data.lender,
      principal: parsed.data.principal,
      outstanding: parsed.data.outstanding,
      interest_rate: parsed.data.interestRate || null,
      monthly_emi: parsed.data.monthlyEmi,
      total_emis: parsed.data.totalEmis,
      remaining_emis: parsed.data.remainingEmis,
      due_day: parsed.data.dueDay,
      disbursed_on: parsed.data.disbursedOn || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/finance');
  return { success: true, data };
}

export async function payEmiAction(loanId: string): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { data: loan } = await supabase
    .from('finance_loans')
    .select('*')
    .eq('id', loanId)
    .eq('user_id', user.id)
    .single();

  if (!loan) return { error: 'Loan not found.' };

  const newRemaining = Math.max(0, loan.remaining_emis - 1);
  const newOutstanding = Math.max(0, Number(loan.outstanding) - Number(loan.monthly_emi));

  const { error } = await supabase
    .from('finance_loans')
    .update({
      remaining_emis: newRemaining,
      outstanding: Number(newOutstanding.toFixed(2)),
    })
    .eq('id', loanId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/finance');
  return { success: true };
}

export async function deleteLoanAction(loanId: string): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('finance_loans')
    .delete()
    .eq('id', loanId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/finance');
  return { success: true };
}

/**
 * Seeds Money Nest inspired realistic Indian financial accounts, cards, and transactions
 * directly into the user's private database.
 */
export async function seedMoneyNestDemoDataAction(): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  // 1. Create sample accounts
  const sampleAccounts = [
    {
      user_id: user.id,
      name: 'Meridian Everyday Salary',
      institution: 'Meridian Bank',
      kind: 'bank' as const,
      masked_suffix: '4821',
      balance: 48350.75,
      accent: '#2563eb',
      notes: 'Primary salary and everyday checking account.',
    },
    {
      user_id: user.id,
      name: 'Crescent Reserve Savings',
      institution: 'Crescent Bank',
      kind: 'bank' as const,
      masked_suffix: '7094',
      balance: 142000.0,
      accent: '#059669',
      notes: 'Emergency reserve fund.',
    },
    {
      user_id: user.id,
      name: 'Regalia Gold Credit Card',
      institution: 'HDFC Bank',
      kind: 'credit_card' as const,
      masked_suffix: '9102',
      balance: 18450.0,
      credit_limit: 300000.0,
      billing_day: 15,
      due_day: 5,
      accent: '#d97706',
      notes: 'Primary travel and dining card.',
    },
    {
      user_id: user.id,
      name: 'Amazon Pay Later',
      institution: 'Axio Capital',
      kind: 'pay_later' as const,
      masked_suffix: '3310',
      balance: 2499.0,
      credit_limit: 50000.0,
      due_day: 10,
      accent: '#7c3aed',
      notes: 'Online purchases and utility bills.',
    },
  ];

  const { data: createdAccounts, error: accError } = await supabase
    .from('finance_accounts')
    .insert(sampleAccounts)
    .select();

  if (accError) return { error: accError.message };

  const bankAccId = createdAccounts?.[0]?.id;
  const cardAccId = createdAccounts?.[2]?.id;

  // 2. Create sample transactions
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const dMinus = (days: number) => {
    const copy = new Date(today);
    copy.setDate(copy.getDate() - days);
    return fmt(copy);
  };

  const sampleTransactions = [
    {
      user_id: user.id,
      account_id: bankAccId || null,
      amount: 85000.0,
      currency: 'INR',
      kind: 'income' as const,
      category: 'Salary',
      description: 'Monthly Salary Credit',
      merchant: 'Arc Studios Tech',
      occurred_on: dMinus(1),
    },
    {
      user_id: user.id,
      account_id: bankAccId || null,
      amount: 18500.0,
      currency: 'INR',
      kind: 'expense' as const,
      category: 'Housing',
      description: 'Apartment Monthly Rent',
      merchant: 'Maple Residences',
      occurred_on: dMinus(2),
    },
    {
      user_id: user.id,
      account_id: cardAccId || null,
      amount: 3450.0,
      currency: 'INR',
      kind: 'expense' as const,
      category: 'Groceries',
      description: 'Nature Basket Supermarket',
      merchant: "Nature's Basket",
      occurred_on: dMinus(3),
    },
    {
      user_id: user.id,
      account_id: cardAccId || null,
      amount: 1450.0,
      currency: 'INR',
      kind: 'expense' as const,
      category: 'Food',
      description: 'Dinner with colleagues',
      merchant: 'Social Cafe & Diner',
      occurred_on: dMinus(4),
    },
    {
      user_id: user.id,
      account_id: bankAccId || null,
      amount: 999.0,
      currency: 'INR',
      kind: 'expense' as const,
      category: 'Utilities',
      description: 'JioFiber Gigabit Broadband',
      merchant: 'Reliance Jio',
      occurred_on: dMinus(5),
    },
    {
      user_id: user.id,
      account_id: cardAccId || null,
      amount: 649.0,
      currency: 'INR',
      kind: 'expense' as const,
      category: 'Subscriptions',
      description: 'Netflix 4K Premium Plan',
      merchant: 'Netflix India',
      occurred_on: dMinus(6),
    },
  ];

  await supabase.from('finance_transactions').insert(sampleTransactions);

  // 3. Create sample bills
  const sampleBills = [
    {
      user_id: user.id,
      account_id: bankAccId || null,
      name: 'Apartment Maintenance & Water',
      amount: 3200.0,
      due_date: dMinus(-5), // 5 days in future
      frequency: 'monthly' as const,
      status: 'pending' as const,
      category: 'Housing',
    },
    {
      user_id: user.id,
      account_id: cardAccId || null,
      name: 'Electricity Discom Bill',
      amount: 2140.0,
      due_date: dMinus(-10),
      frequency: 'monthly' as const,
      status: 'pending' as const,
      category: 'Utilities',
    },
  ];

  await supabase.from('finance_bills').insert(sampleBills);

  // 4. Create sample Fixed Deposit
  const sampleFD = {
    user_id: user.id,
    name: 'Tax Saver Fixed Deposit (5Y)',
    institution: 'State Bank of India',
    principal: 100000.0,
    interest_rate: 7.25,
    opening_date: dMinus(180),
    maturity_date: dMinus(-1645),
    maturity_amount: 142800.0,
    payout_method: 'cumulative',
  };

  await supabase.from('finance_fixed_deposits').insert(sampleFD);

  // 5. Create sample Loan/EMI
  const sampleLoan = {
    user_id: user.id,
    name: 'MacBook Pro Apple No-Cost EMI',
    lender: 'HDFC Consumer Finance',
    principal: 149900.0,
    outstanding: 74950.0,
    interest_rate: 0.0,
    monthly_emi: 12491.66,
    total_emis: 12,
    remaining_emis: 6,
    due_day: 5,
    disbursed_on: dMinus(180),
  };

  await supabase.from('finance_loans').insert(sampleLoan);

  revalidatePath('/finance');
  return { success: true };
}
