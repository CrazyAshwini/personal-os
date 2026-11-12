'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  createFinanceAccountSchema,
  updateFinanceAccountSchema,
  createFinanceTransactionSchema,
  updateFinanceTransactionSchema,
  createFinanceBillSchema,
  createFinanceFDSchema,
  createFinanceLoanSchema,
  accountSnapshotSchema,
  personalLoanSchema,
  personalLoanRepaymentSchema,
  expenseGroupSchema,
  groupSettlementSchema,
  emiAgreementSchema,
  financeOrderSchema,
  type CreateFinanceAccountInput,
  type UpdateFinanceAccountInput,
  type CreateFinanceTransactionInput,
  type UpdateFinanceTransactionInput,
  type CreateFinanceBillInput,
  type CreateFinanceFDInput,
  type CreateFinanceLoanInput,
  type AccountSnapshotInput,
  type PersonalLoanInput,
  type PersonalLoanRepaymentInput,
  type ExpenseGroupInput,
  type GroupSettlementInput,
  type EmiAgreementInput,
  type FinanceOrderInput,
} from '@/lib/validation/finance';
import {
  createDemoExtendedState,
  type ExtendedFinanceState,
} from './moneynest-demo';
import { generateEmiInstallmentSchedule, todayIST } from './finance-calculations';
import type {
  EmiInstallmentItem,
  ExpenseGroupSettlement,
  ExpenseGroupShare,
  FinanceAccountRow,
  FinanceAccountSnapshotItem,
  FinanceBillRow,
  FinanceCategoryBudgetMap,
  FinanceEmiAgreementItem,
  FinanceExpenseGroupItem,
  FinanceFDRow,
  FinanceLoanRow,
  FinanceOrderItem,
  FinancePersonalLoanItem,
  FinanceTransactionRow,
  NativeFinanceWorkspace,
  PersonalLoanRepayment,
} from './finance-types';

export type {
  FinanceAccountRow,
  FinanceTransactionRow,
  FinanceBillRow,
  FinanceFDRow,
  FinanceLoanRow,
  NativeFinanceWorkspace,
};

export type NativeFinanceResult<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
  fallbackOnly?: boolean;
  demoExtended?: ExtendedFinanceState;
};

function isMissingTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    Boolean(err.message && /does not exist|schema cache/i.test(err.message))
  );
}

function isDebtKind(kind: string): boolean {
  return kind === 'credit_card' || kind === 'pay_later';
}

function applyAccountDelta(
  accountKind: string,
  currentBalance: number,
  txKind: string,
  amount: number,
  role: 'source' | 'destination',
  reverse: boolean = false
): number {
  const mult = reverse ? -1 : 1;
  const debt = isDebtKind(accountKind);
  let delta = 0;

  if (role === 'source') {
    if (debt) {
      if (txKind === 'expense') delta = amount;
      else if (txKind === 'refund') delta = -amount;
      else if (txKind === 'bill_payment') delta = -amount;
    } else {
      if (txKind === 'expense' || txKind === 'bill_payment' || txKind === 'transfer') {
        delta = -amount;
      } else if (txKind === 'income' || txKind === 'refund') {
        delta = amount;
      }
    }
  } else {
    if (debt) {
      if (txKind === 'transfer' || txKind === 'bill_payment') delta = -amount;
    } else {
      if (txKind === 'transfer' || txKind === 'income' || txKind === 'refund') {
        delta = amount;
      }
    }
  }

  const next = currentBalance + delta * mult;
  return Number((debt ? Math.max(0, next) : next).toFixed(2));
}

export async function getNativeFinanceWorkspaceAction(): Promise<
  NativeFinanceResult<NativeFinanceWorkspace>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const [
    accRes,
    txRes,
    billRes,
    fdRes,
    loanRes,
    snapRes,
    budgetRes,
    plRes,
    groupRes,
    emiRes,
    orderRes,
  ] = await Promise.all([
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
      .order('created_at', { ascending: false })
      .limit(300),
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
    supabase
      .from('finance_account_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('as_of', { ascending: false }),
    supabase.from('finance_category_budgets').select('*').eq('user_id', user.id),
    supabase
      .from('finance_personal_loans')
      .select('*')
      .eq('user_id', user.id)
      .order('occurred_on', { ascending: false }),
    supabase
      .from('finance_expense_groups')
      .select('*')
      .eq('user_id', user.id)
      .order('occurred_on', { ascending: false }),
    supabase
      .from('finance_emi_agreements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('finance_orders')
      .select('*')
      .eq('user_id', user.id)
      .order('occurred_on', { ascending: false }),
  ]);

  if (accRes.error) return { error: accRes.error.message };

  const budgets: FinanceCategoryBudgetMap = {};
  if (!budgetRes.error && budgetRes.data) {
    for (const row of budgetRes.data) {
      budgets[row.category] = Number(row.monthly_limit);
    }
  }

  const snapshots: FinanceAccountSnapshotItem[] =
    !snapRes.error && snapRes.data
      ? snapRes.data.map((s) => ({
          id: s.id,
          account_id: s.account_id,
          as_of: s.as_of,
          balance: s.balance !== null ? Number(s.balance) : null,
          outstanding: s.outstanding !== null ? Number(s.outstanding) : null,
          available_credit: s.available_credit !== null ? Number(s.available_credit) : null,
          billed_amount: s.billed_amount !== null ? Number(s.billed_amount) : null,
          unbilled_amount: s.unbilled_amount !== null ? Number(s.unbilled_amount) : null,
          source: s.source,
          notes: s.notes,
        }))
      : [];

  const personalLoans: FinancePersonalLoanItem[] =
    !plRes.error && plRes.data
      ? plRes.data.map((p) => ({
          id: p.id,
          direction: p.direction,
          person_name: p.person_name,
          principal: Number(p.principal),
          outstanding: Number(p.outstanding),
          occurred_on: p.occurred_on,
          due_date: p.due_date,
          account_id: p.account_id,
          status: p.status,
          notes: p.notes,
          repayments: Array.isArray(p.repayments) ? (p.repayments as PersonalLoanRepayment[]) : [],
        }))
      : [];

  const expenseGroups: FinanceExpenseGroupItem[] =
    !groupRes.error && groupRes.data
      ? groupRes.data.map((g) => ({
          id: g.id,
          name: g.name,
          mode: g.mode,
          total_cost: Number(g.total_cost),
          occurred_on: g.occurred_on,
          paid_by_owner: g.paid_by_owner,
          shares: Array.isArray(g.shares) ? (g.shares as ExpenseGroupShare[]) : [],
          settlements: Array.isArray(g.settlements)
            ? (g.settlements as ExpenseGroupSettlement[])
            : [],
          notes: g.notes,
        }))
      : [];

  const emiAgreements: FinanceEmiAgreementItem[] =
    !emiRes.error && emiRes.data
      ? emiRes.data.map((e) => ({
          id: e.id,
          account_id: e.account_id,
          title: e.title,
          merchant: e.merchant,
          order_ref: e.order_ref,
          financed_principal: Number(e.financed_principal),
          annual_interest_rate: Number(e.annual_interest_rate),
          processing_fee: Number(e.processing_fee),
          monthly_emi: Number(e.monthly_emi),
          duration_months: e.duration_months,
          paid_installments: e.paid_installments,
          first_due_date: e.first_due_date,
          schedule: Array.isArray(e.schedule) ? (e.schedule as EmiInstallmentItem[]) : [],
          status: e.status,
        }))
      : [];

  const orders: FinanceOrderItem[] =
    !orderRes.error && orderRes.data
      ? orderRes.data.map((o) => ({
          id: o.id,
          platform: o.platform,
          merchant: o.merchant,
          order_ref: o.order_ref,
          description: o.description,
          amount: Number(o.amount),
          occurred_on: o.occurred_on,
          account_id: o.account_id,
          status: o.status,
          refund_expected_amount:
            o.refund_expected_amount !== null ? Number(o.refund_expected_amount) : null,
          refund_expected_by: o.refund_expected_by,
          refund_received_amount: Number(o.refund_received_amount),
          refund_status: o.refund_status,
          notes: o.notes,
        }))
      : [];

  return {
    success: true,
    data: {
      userId: user.id,
      accounts: accRes.data || [],
      transactions: txRes.data || [],
      bills: billRes.data || [],
      fixedDeposits: fdRes.data || [],
      loans: loanRes.data || [],
      snapshots,
      budgets,
      personalLoans,
      expenseGroups,
      emiAgreements,
      orders,
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
      accent: parsed.data.accent || '#059669',
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/finance');
  return { success: true, data };
}

export async function updateAccountAction(
  values: UpdateFinanceAccountInput
): Promise<NativeFinanceResult<FinanceAccountRow>> {
  const parsed = updateFinanceAccountSchema.safeParse(values);
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
    .update({
      name: parsed.data.name,
      institution: parsed.data.institution,
      kind: parsed.data.kind,
      masked_suffix: parsed.data.maskedSuffix,
      balance: parsed.data.balance,
      credit_limit: parsed.data.creditLimit ?? null,
      billing_day: parsed.data.billingDay ?? null,
      due_day: parsed.data.dueDay ?? null,
      accent: parsed.data.accent,
      active: parsed.data.active ?? true,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/finance');
  return { success: true, data };
}

export async function toggleAccountActiveAction(
  accountId: string,
  active: boolean
): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('finance_accounts')
    .update({ active })
    .eq('id', accountId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/finance');
  return { success: true };
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

  if (parsed.data.accountId) {
    const { data: acc } = await supabase
      .from('finance_accounts')
      .select('balance, kind')
      .eq('id', parsed.data.accountId)
      .eq('user_id', user.id)
      .single();

    if (acc) {
      const nextBal = applyAccountDelta(
        acc.kind,
        Number(acc.balance),
        parsed.data.kind,
        parsed.data.amount,
        'source'
      );
      await supabase
        .from('finance_accounts')
        .update({ balance: nextBal })
        .eq('id', parsed.data.accountId)
        .eq('user_id', user.id);
    }
  }

  if (
    (parsed.data.kind === 'transfer' || parsed.data.kind === 'bill_payment') &&
    parsed.data.toAccountId
  ) {
    const { data: destAcc } = await supabase
      .from('finance_accounts')
      .select('balance, kind')
      .eq('id', parsed.data.toAccountId)
      .eq('user_id', user.id)
      .single();

    if (destAcc) {
      const nextDestBal = applyAccountDelta(
        destAcc.kind,
        Number(destAcc.balance),
        parsed.data.kind,
        parsed.data.amount,
        'destination'
      );
      await supabase
        .from('finance_accounts')
        .update({ balance: nextDestBal })
        .eq('id', parsed.data.toAccountId)
        .eq('user_id', user.id);
    }
  }

  revalidatePath('/finance');
  return { success: true, data: tx };
}

export async function updateTransactionAction(
  values: UpdateFinanceTransactionInput
): Promise<NativeFinanceResult<FinanceTransactionRow>> {
  const parsed = updateFinanceTransactionSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid transaction details.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { data: existing } = await supabase
    .from('finance_transactions')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .single();

  if (!existing) return { error: 'Transaction not found.' };

  // Revert previous balance effects first
  if (existing.account_id) {
    const { data: acc } = await supabase
      .from('finance_accounts')
      .select('balance, kind')
      .eq('id', existing.account_id)
      .eq('user_id', user.id)
      .single();
    if (acc) {
      await supabase
        .from('finance_accounts')
        .update({
          balance: applyAccountDelta(
            acc.kind,
            Number(acc.balance),
            existing.kind,
            Number(existing.amount),
            'source',
            true
          ),
        })
        .eq('id', existing.account_id)
        .eq('user_id', user.id);
    }
  }
  if (existing.to_account_id) {
    const { data: destAcc } = await supabase
      .from('finance_accounts')
      .select('balance, kind')
      .eq('id', existing.to_account_id)
      .eq('user_id', user.id)
      .single();
    if (destAcc) {
      await supabase
        .from('finance_accounts')
        .update({
          balance: applyAccountDelta(
            destAcc.kind,
            Number(destAcc.balance),
            existing.kind,
            Number(existing.amount),
            'destination',
            true
          ),
        })
        .eq('id', existing.to_account_id)
        .eq('user_id', user.id);
    }
  }

  const { data: updated, error } = await supabase
    .from('finance_transactions')
    .update({
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
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return { error: error.message };

  // Apply updated balance effects
  if (parsed.data.accountId) {
    const { data: acc } = await supabase
      .from('finance_accounts')
      .select('balance, kind')
      .eq('id', parsed.data.accountId)
      .eq('user_id', user.id)
      .single();
    if (acc) {
      await supabase
        .from('finance_accounts')
        .update({
          balance: applyAccountDelta(
            acc.kind,
            Number(acc.balance),
            parsed.data.kind,
            parsed.data.amount,
            'source'
          ),
        })
        .eq('id', parsed.data.accountId)
        .eq('user_id', user.id);
    }
  }
  if (
    (parsed.data.kind === 'transfer' || parsed.data.kind === 'bill_payment') &&
    parsed.data.toAccountId
  ) {
    const { data: destAcc } = await supabase
      .from('finance_accounts')
      .select('balance, kind')
      .eq('id', parsed.data.toAccountId)
      .eq('user_id', user.id)
      .single();
    if (destAcc) {
      await supabase
        .from('finance_accounts')
        .update({
          balance: applyAccountDelta(
            destAcc.kind,
            Number(destAcc.balance),
            parsed.data.kind,
            parsed.data.amount,
            'destination'
          ),
        })
        .eq('id', parsed.data.toAccountId)
        .eq('user_id', user.id);
    }
  }

  revalidatePath('/finance');
  return { success: true, data: updated };
}

export async function deleteTransactionAction(txId: string): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { data: existing } = await supabase
    .from('finance_transactions')
    .select('*')
    .eq('id', txId)
    .eq('user_id', user.id)
    .single();

  const { error } = await supabase
    .from('finance_transactions')
    .delete()
    .eq('id', txId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  if (existing?.account_id) {
    const { data: acc } = await supabase
      .from('finance_accounts')
      .select('balance, kind')
      .eq('id', existing.account_id)
      .eq('user_id', user.id)
      .single();
    if (acc) {
      await supabase
        .from('finance_accounts')
        .update({
          balance: applyAccountDelta(
            acc.kind,
            Number(acc.balance),
            existing.kind,
            Number(existing.amount),
            'source',
            true
          ),
        })
        .eq('id', existing.account_id)
        .eq('user_id', user.id);
    }
  }

  revalidatePath('/finance');
  return { success: true };
}

export async function batchImportTransactionsAction(
  rows: Array<{
    accountId: string | null;
    toAccountId?: string | null;
    amount: number;
    kind: 'expense' | 'income' | 'transfer' | 'bill_payment' | 'refund';
    category: string;
    description: string;
    merchant?: string | null;
    occurredOn: string;
    notes?: string | null;
  }>
): Promise<NativeFinanceResult<{ insertedCount: number; transactions: FinanceTransactionRow[] }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const validRows = rows.filter(
    (r) => r.amount > 0 && r.description.trim().length >= 1 && /^\d{4}-\d{2}-\d{2}$/.test(r.occurredOn)
  );
  if (validRows.length === 0) {
    return { error: 'No valid rows selected for import.' };
  }

  const inserts = validRows.slice(0, 500).map((r) => ({
    user_id: user.id,
    account_id: r.accountId || null,
    to_account_id: r.toAccountId || null,
    amount: Number(r.amount.toFixed(2)),
    currency: 'INR',
    kind: r.kind,
    category: r.category || 'Others',
    description: r.description.trim().slice(0, 150),
    merchant: r.merchant?.trim().slice(0, 80) || null,
    occurred_on: r.occurredOn,
    notes: r.notes?.slice(0, 250) || null,
  }));

  const { data: inserted, error } = await supabase
    .from('finance_transactions')
    .insert(inserts)
    .select();

  if (error) return { error: error.message };

  // Update affected account balances
  const { data: userAccounts } = await supabase
    .from('finance_accounts')
    .select('id, balance, kind')
    .eq('user_id', user.id);

  if (userAccounts) {
    const balanceMap = new Map(
      userAccounts.map((a) => [a.id, { balance: Number(a.balance), kind: a.kind }])
    );
    const touched = new Set<string>();

    for (const r of inserts) {
      if (r.account_id && balanceMap.has(r.account_id)) {
        const entry = balanceMap.get(r.account_id)!;
        entry.balance = applyAccountDelta(entry.kind, entry.balance, r.kind, r.amount, 'source');
        touched.add(r.account_id);
      }
      if (r.to_account_id && balanceMap.has(r.to_account_id)) {
        const entry = balanceMap.get(r.to_account_id)!;
        entry.balance = applyAccountDelta(
          entry.kind,
          entry.balance,
          r.kind,
          r.amount,
          'destination'
        );
        touched.add(r.to_account_id);
      }
    }

    await Promise.all(
      Array.from(touched).map((accId) =>
        supabase
          .from('finance_accounts')
          .update({ balance: balanceMap.get(accId)!.balance })
          .eq('id', accId)
          .eq('user_id', user.id)
      )
    );
  }

  revalidatePath('/finance');
  return {
    success: true,
    data: { insertedCount: inserted?.length || 0, transactions: inserted || [] },
  };
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

export async function payBillWithAccountAction(params: {
  billId: string;
  sourceAccountId: string;
  toAccountId?: string | null;
  amount: number;
  paidOn: string;
}): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { data: bill } = await supabase
    .from('finance_bills')
    .select('*')
    .eq('id', params.billId)
    .eq('user_id', user.id)
    .single();

  if (!bill) return { error: 'Bill not found.' };

  await supabase
    .from('finance_bills')
    .update({ status: 'paid' })
    .eq('id', params.billId)
    .eq('user_id', user.id);

  await createTransactionAction({
    accountId: params.sourceAccountId,
    toAccountId: params.toAccountId || bill.account_id || null,
    amount: params.amount,
    currency: 'INR',
    kind: 'bill_payment',
    category: bill.category || 'Bills & Utilities',
    description: `Paid bill: ${bill.name}`,
    occurredOn: params.paidOn || todayIST(),
    notes: `Bill #${bill.id.slice(0, 8)}`,
  });

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

// ---------- Extended Finance Actions (Postgres with graceful fallback) ----------

export async function upsertAccountSnapshotAction(
  values: AccountSnapshotInput
): Promise<NativeFinanceResult<FinanceAccountSnapshotItem>> {
  const parsed = accountSnapshotSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid snapshot details.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  // Also synchronize current balance on the main finance_accounts row
  const accUpdate: { balance?: number } = {};
  if (parsed.data.outstanding !== null && parsed.data.outstanding !== undefined) {
    accUpdate.balance = parsed.data.outstanding;
  } else if (parsed.data.balance !== null && parsed.data.balance !== undefined) {
    accUpdate.balance = parsed.data.balance;
  }
  if (accUpdate.balance !== undefined) {
    await supabase
      .from('finance_accounts')
      .update(accUpdate)
      .eq('id', parsed.data.accountId)
      .eq('user_id', user.id);
  }

  const snapItem: FinanceAccountSnapshotItem = {
    id: crypto.randomUUID(),
    account_id: parsed.data.accountId,
    as_of: parsed.data.asOf,
    balance: parsed.data.balance ?? null,
    outstanding: parsed.data.outstanding ?? null,
    available_credit: parsed.data.availableCredit ?? null,
    billed_amount: parsed.data.billedAmount ?? null,
    unbilled_amount: parsed.data.unbilledAmount ?? null,
    source: parsed.data.source || 'manual',
    notes: parsed.data.notes ?? null,
  };

  const { data, error } = await supabase
    .from('finance_account_snapshots')
    .insert({
      id: snapItem.id,
      user_id: user.id,
      account_id: snapItem.account_id,
      as_of: snapItem.as_of,
      balance: snapItem.balance,
      outstanding: snapItem.outstanding,
      available_credit: snapItem.available_credit,
      billed_amount: snapItem.billed_amount,
      unbilled_amount: snapItem.unbilled_amount,
      source: snapItem.source,
      notes: snapItem.notes,
    })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return { success: true, fallbackOnly: true, data: snapItem };
    }
    return { error: error.message };
  }

  revalidatePath('/finance');
  return {
    success: true,
    data: {
      ...snapItem,
      id: data.id,
    },
  };
}

export async function saveCategoryBudgetsAction(
  budgets: FinanceCategoryBudgetMap
): Promise<NativeFinanceResult<FinanceCategoryBudgetMap>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const cleanBudgets: FinanceCategoryBudgetMap = {};
  for (const [cat, val] of Object.entries(budgets)) {
    const n = Number(val);
    if (cat.trim() && Number.isFinite(n) && n > 0) {
      cleanBudgets[cat.trim()] = Number(n.toFixed(2));
    }
  }

  const { error: delErr } = await supabase
    .from('finance_category_budgets')
    .delete()
    .eq('user_id', user.id);

  if (delErr) {
    if (isMissingTableError(delErr)) {
      return { success: true, fallbackOnly: true, data: cleanBudgets };
    }
    return { error: delErr.message };
  }

  const entries = Object.entries(cleanBudgets);
  if (entries.length > 0) {
    const { error: insErr } = await supabase.from('finance_category_budgets').insert(
      entries.map(([category, monthly_limit]) => ({
        user_id: user.id,
        category,
        monthly_limit,
      }))
    );
    if (insErr) {
      if (isMissingTableError(insErr)) {
        return { success: true, fallbackOnly: true, data: cleanBudgets };
      }
      return { error: insErr.message };
    }
  }

  revalidatePath('/finance');
  return { success: true, data: cleanBudgets };
}

export async function createPersonalLoanAction(
  values: PersonalLoanInput
): Promise<NativeFinanceResult<FinancePersonalLoanItem>> {
  const parsed = personalLoanSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid personal loan details.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const item: FinancePersonalLoanItem = {
    id: crypto.randomUUID(),
    direction: parsed.data.direction,
    person_name: parsed.data.personName,
    principal: Number(parsed.data.principal.toFixed(2)),
    outstanding: Number(parsed.data.principal.toFixed(2)),
    occurred_on: parsed.data.occurredOn,
    due_date: parsed.data.dueDate || null,
    account_id: parsed.data.accountId || null,
    status: 'active',
    notes: parsed.data.notes || null,
    repayments: [],
  };

  const { data, error } = await supabase
    .from('finance_personal_loans')
    .insert({
      id: item.id,
      user_id: user.id,
      direction: item.direction,
      person_name: item.person_name,
      principal: item.principal,
      outstanding: item.outstanding,
      occurred_on: item.occurred_on,
      due_date: item.due_date,
      account_id: item.account_id,
      status: item.status,
      notes: item.notes,
      repayments: item.repayments,
    })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return { success: true, fallbackOnly: true, data: item };
    }
    return { error: error.message };
  }

  revalidatePath('/finance');
  return { success: true, data: { ...item, id: data.id } };
}

export async function recordPersonalLoanRepaymentAction(
  values: PersonalLoanRepaymentInput
): Promise<NativeFinanceResult<{ loanId: string; outstanding: number; status: 'active' | 'settled'; repayment: PersonalLoanRepayment }>> {
  const parsed = personalLoanRepaymentSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid repayment details.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const repayment: PersonalLoanRepayment = {
    id: crypto.randomUUID(),
    amount: Number(parsed.data.amount.toFixed(2)),
    occurredOn: parsed.data.occurredOn,
    accountId: parsed.data.accountId || null,
    note: parsed.data.note || null,
  };

  const { data: row, error: fetchErr } = await supabase
    .from('finance_personal_loans')
    .select('*')
    .eq('id', parsed.data.loanId)
    .eq('user_id', user.id)
    .single();

  if (fetchErr) {
    if (isMissingTableError(fetchErr)) {
      return {
        success: true,
        fallbackOnly: true,
        data: { loanId: parsed.data.loanId, outstanding: 0, status: 'active', repayment },
      };
    }
    return {
      success: true,
      fallbackOnly: true,
      data: { loanId: parsed.data.loanId, outstanding: 0, status: 'active', repayment },
    };
  }

  const nextOutstanding = Math.max(0, Number((Number(row.outstanding) - repayment.amount).toFixed(2)));
  const nextStatus: 'active' | 'settled' = nextOutstanding === 0 ? 'settled' : 'active';
  const prevRepayments = Array.isArray(row.repayments) ? (row.repayments as PersonalLoanRepayment[]) : [];

  const { error: upErr } = await supabase
    .from('finance_personal_loans')
    .update({
      outstanding: nextOutstanding,
      status: nextStatus,
      repayments: [...prevRepayments, repayment],
    })
    .eq('id', parsed.data.loanId)
    .eq('user_id', user.id);

  if (upErr) return { error: upErr.message };

  revalidatePath('/finance');
  return {
    success: true,
    data: { loanId: parsed.data.loanId, outstanding: nextOutstanding, status: nextStatus, repayment },
  };
}

export async function deletePersonalLoanAction(loanId: string): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('finance_personal_loans')
    .delete()
    .eq('id', loanId)
    .eq('user_id', user.id);

  if (error) {
    if (isMissingTableError(error)) return { success: true, fallbackOnly: true };
    return { error: error.message };
  }

  revalidatePath('/finance');
  return { success: true };
}

export async function createExpenseGroupAction(
  values: ExpenseGroupInput
): Promise<NativeFinanceResult<FinanceExpenseGroupItem>> {
  const parsed = expenseGroupSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid group details.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const group: FinanceExpenseGroupItem = {
    id: crypto.randomUUID(),
    name: parsed.data.name,
    mode: parsed.data.mode,
    total_cost: Number(parsed.data.totalCost.toFixed(2)),
    occurred_on: parsed.data.occurredOn,
    paid_by_owner: parsed.data.paidByOwner,
    shares: parsed.data.shares,
    settlements: [],
    notes: parsed.data.notes || null,
  };

  const { data, error } = await supabase
    .from('finance_expense_groups')
    .insert({
      id: group.id,
      user_id: user.id,
      name: group.name,
      mode: group.mode,
      total_cost: group.total_cost,
      occurred_on: group.occurred_on,
      paid_by_owner: group.paid_by_owner,
      shares: group.shares,
      settlements: group.settlements,
      notes: group.notes,
    })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return { success: true, fallbackOnly: true, data: group };
    }
    return { error: error.message };
  }

  revalidatePath('/finance');
  return { success: true, data: { ...group, id: data.id } };
}

export async function recordGroupSettlementAction(
  values: GroupSettlementInput
): Promise<NativeFinanceResult<ExpenseGroupSettlement>> {
  const parsed = groupSettlementSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid settlement details.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const settlement: ExpenseGroupSettlement = {
    id: crypto.randomUUID(),
    counterparty: parsed.data.counterparty,
    direction: parsed.data.direction,
    amount: Number(parsed.data.amount.toFixed(2)),
    occurredOn: parsed.data.occurredOn,
    note: parsed.data.note || null,
  };

  const { data: row, error: fetchErr } = await supabase
    .from('finance_expense_groups')
    .select('*')
    .eq('id', parsed.data.groupId)
    .eq('user_id', user.id)
    .single();

  if (fetchErr) {
    return { success: true, fallbackOnly: true, data: settlement };
  }

  const prev = Array.isArray(row.settlements) ? (row.settlements as ExpenseGroupSettlement[]) : [];
  const { error: upErr } = await supabase
    .from('finance_expense_groups')
    .update({ settlements: [...prev, settlement] })
    .eq('id', parsed.data.groupId)
    .eq('user_id', user.id);

  if (upErr) return { error: upErr.message };

  revalidatePath('/finance');
  return { success: true, data: settlement };
}

export async function deleteExpenseGroupAction(groupId: string): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('finance_expense_groups')
    .delete()
    .eq('id', groupId)
    .eq('user_id', user.id);

  if (error) {
    if (isMissingTableError(error)) return { success: true, fallbackOnly: true };
    return { error: error.message };
  }

  revalidatePath('/finance');
  return { success: true };
}

export async function createEmiAgreementAction(
  values: EmiAgreementInput
): Promise<NativeFinanceResult<FinanceEmiAgreementItem>> {
  const parsed = emiAgreementSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid EMI agreement details.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const schedule = generateEmiInstallmentSchedule({
    financedPrincipal: parsed.data.financedPrincipal,
    annualInterestRate: parsed.data.annualInterestRate,
    durationMonths: parsed.data.durationMonths,
    monthlyEmi: parsed.data.monthlyEmi,
    firstDueDate: parsed.data.firstDueDate,
  });

  const item: FinanceEmiAgreementItem = {
    id: crypto.randomUUID(),
    account_id: parsed.data.accountId || null,
    title: parsed.data.title,
    merchant: parsed.data.merchant || null,
    order_ref: parsed.data.orderRef || null,
    financed_principal: Number(parsed.data.financedPrincipal.toFixed(2)),
    annual_interest_rate: parsed.data.annualInterestRate,
    processing_fee: parsed.data.processingFee,
    monthly_emi: Number(parsed.data.monthlyEmi.toFixed(2)),
    duration_months: parsed.data.durationMonths,
    paid_installments: 0,
    first_due_date: parsed.data.firstDueDate,
    schedule,
    status: 'active',
  };

  const { data, error } = await supabase
    .from('finance_emi_agreements')
    .insert({
      id: item.id,
      user_id: user.id,
      account_id: item.account_id,
      title: item.title,
      merchant: item.merchant,
      order_ref: item.order_ref,
      financed_principal: item.financed_principal,
      annual_interest_rate: item.annual_interest_rate,
      processing_fee: item.processing_fee,
      monthly_emi: item.monthly_emi,
      duration_months: item.duration_months,
      paid_installments: item.paid_installments,
      first_due_date: item.first_due_date,
      schedule: item.schedule,
      status: item.status,
    })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return { success: true, fallbackOnly: true, data: item };
    }
    return { error: error.message };
  }

  revalidatePath('/finance');
  return { success: true, data: { ...item, id: data.id } };
}

export async function payEmiAgreementInstallmentAction(
  agreementId: string
): Promise<NativeFinanceResult<{ agreementId: string; paidInstallments: number }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { data: row, error: fetchErr } = await supabase
    .from('finance_emi_agreements')
    .select('*')
    .eq('id', agreementId)
    .eq('user_id', user.id)
    .single();

  if (fetchErr) {
    return { success: true, fallbackOnly: true, data: { agreementId, paidInstallments: 1 } };
  }

  const schedule = Array.isArray(row.schedule) ? ([...row.schedule] as EmiInstallmentItem[]) : [];
  const nextPendingIdx = schedule.findIndex((i) => i.status === 'pending');
  if (nextPendingIdx !== -1) {
    schedule[nextPendingIdx] = {
      ...schedule[nextPendingIdx],
      status: 'paid',
      paidOn: todayIST(),
    };
  }
  const paidCount = schedule.filter((i) => i.status === 'paid').length;
  const nextStatus = paidCount >= schedule.length ? 'completed' : 'active';

  const { error: upErr } = await supabase
    .from('finance_emi_agreements')
    .update({
      schedule,
      paid_installments: paidCount,
      status: nextStatus,
    })
    .eq('id', agreementId)
    .eq('user_id', user.id);

  if (upErr) return { error: upErr.message };

  revalidatePath('/finance');
  return { success: true, data: { agreementId, paidInstallments: paidCount } };
}

export async function deleteEmiAgreementAction(agreementId: string): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('finance_emi_agreements')
    .delete()
    .eq('id', agreementId)
    .eq('user_id', user.id);

  if (error) {
    if (isMissingTableError(error)) return { success: true, fallbackOnly: true };
    return { error: error.message };
  }

  revalidatePath('/finance');
  return { success: true };
}

export async function createOrderAction(
  values: FinanceOrderInput
): Promise<NativeFinanceResult<FinanceOrderItem>> {
  const parsed = financeOrderSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid order details.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const order: FinanceOrderItem = {
    id: crypto.randomUUID(),
    platform: parsed.data.platform,
    merchant: parsed.data.merchant || null,
    order_ref: parsed.data.orderRef || null,
    description: parsed.data.description,
    amount: Number(parsed.data.amount.toFixed(2)),
    occurred_on: parsed.data.occurredOn,
    account_id: parsed.data.accountId || null,
    status: parsed.data.status,
    refund_expected_amount: parsed.data.refundExpectedAmount ?? null,
    refund_expected_by: parsed.data.refundExpectedBy ?? null,
    refund_received_amount: 0,
    refund_status: parsed.data.refundStatus,
    notes: parsed.data.notes || null,
  };

  const { data, error } = await supabase
    .from('finance_orders')
    .insert({
      id: order.id,
      user_id: user.id,
      platform: order.platform,
      merchant: order.merchant,
      order_ref: order.order_ref,
      description: order.description,
      amount: order.amount,
      occurred_on: order.occurred_on,
      account_id: order.account_id,
      status: order.status,
      refund_expected_amount: order.refund_expected_amount,
      refund_expected_by: order.refund_expected_by,
      refund_received_amount: order.refund_received_amount,
      refund_status: order.refund_status,
      notes: order.notes,
    })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return { success: true, fallbackOnly: true, data: order };
    }
    return { error: error.message };
  }

  revalidatePath('/finance');
  return { success: true, data: { ...order, id: data.id } };
}

export async function updateOrderRefundAction(params: {
  orderId: string;
  refundStatus: FinanceOrderItem['refund_status'];
  refundReceivedAmount: number;
  orderStatus?: string;
}): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const patch: {
    refund_status: FinanceOrderItem['refund_status'];
    refund_received_amount: number;
    status?: string;
  } = {
    refund_status: params.refundStatus,
    refund_received_amount: params.refundReceivedAmount,
    ...(params.orderStatus ? { status: params.orderStatus } : {}),
  };

  const { error } = await supabase
    .from('finance_orders')
    .update(patch)
    .eq('id', params.orderId)
    .eq('user_id', user.id);

  if (error) {
    if (isMissingTableError(error)) return { success: true, fallbackOnly: true };
    return { error: error.message };
  }

  revalidatePath('/finance');
  return { success: true };
}

export async function deleteOrderAction(orderId: string): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('finance_orders')
    .delete()
    .eq('id', orderId)
    .eq('user_id', user.id);

  if (error) {
    if (isMissingTableError(error)) return { success: true, fallbackOnly: true };
    return { error: error.message };
  }

  revalidatePath('/finance');
  return { success: true };
}

export async function seedMoneyNestDemoDataAction(): Promise<NativeFinanceResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required.' };

  const sampleAccounts = [
    {
      user_id: user.id,
      name: 'Meridian Everyday Salary',
      institution: 'Meridian Bank',
      kind: 'bank' as const,
      masked_suffix: '4821',
      balance: 48350.75,
      accent: '#059669',
      notes: 'Primary salary and everyday checking account.',
    },
    {
      user_id: user.id,
      name: 'Crescent Reserve Savings',
      institution: 'Crescent Bank',
      kind: 'bank' as const,
      masked_suffix: '7094',
      balance: 142000.0,
      accent: '#0d9488',
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
      billing_day: 1,
      due_day: 5,
      accent: '#7c3aed',
      notes: 'Online purchases and Pay Later EMIs.',
    },
    {
      user_id: user.id,
      name: 'Cash & UPI Wallet',
      institution: 'Cash / UPI Lite',
      kind: 'wallet' as const,
      masked_suffix: '0001',
      balance: 3850.0,
      accent: '#2563eb',
      notes: 'Petty cash and quick UPI wallet.',
    },
  ];

  const { data: createdAccounts, error: accError } = await supabase
    .from('finance_accounts')
    .insert(sampleAccounts)
    .select();

  if (accError) return { error: accError.message };

  const bankAccId = createdAccounts?.[0]?.id;
  const reserveAccId = createdAccounts?.[1]?.id;
  const cardAccId = createdAccounts?.[2]?.id;
  const payLaterAccId = createdAccounts?.[3]?.id;
  const walletAccId = createdAccounts?.[4]?.id;

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
      category: 'Bills & Utilities',
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
    {
      user_id: user.id,
      account_id: cardAccId || null,
      amount: 4299.0,
      currency: 'INR',
      kind: 'expense' as const,
      category: 'Shopping',
      description: 'Mechanical Keyboard + Desk Stand',
      merchant: 'Amazon Retail',
      occurred_on: dMinus(7),
    },
    {
      user_id: user.id,
      account_id: cardAccId || null,
      amount: 380.0,
      currency: 'INR',
      kind: 'refund' as const,
      category: 'Purchase Refund',
      description: 'Partial item return credit',
      merchant: 'Amazon Retail',
      occurred_on: dMinus(4),
    },
    {
      user_id: user.id,
      account_id: bankAccId || null,
      to_account_id: reserveAccId || null,
      amount: 15000.0,
      currency: 'INR',
      kind: 'transfer' as const,
      category: 'Own Account Transfer',
      description: 'Monthly emergency fund transfer',
      merchant: 'Crescent Bank',
      occurred_on: dMinus(2),
    },
    {
      user_id: user.id,
      account_id: walletAccId || null,
      amount: 420.0,
      currency: 'INR',
      kind: 'expense' as const,
      category: 'Transport',
      description: 'Metro & Auto commute',
      merchant: 'Namma Metro',
      occurred_on: dMinus(1),
    },
  ];

  await supabase.from('finance_transactions').insert(sampleTransactions);

  const sampleBills = [
    {
      user_id: user.id,
      account_id: bankAccId || null,
      name: 'Apartment Maintenance & Water',
      amount: 3200.0,
      due_date: dMinus(-5),
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
      category: 'Bills & Utilities',
    },
    {
      user_id: user.id,
      account_id: payLaterAccId || null,
      name: 'Amazon Pay Later Statement',
      amount: 2499.0,
      due_date: dMinus(-3),
      frequency: 'monthly' as const,
      status: 'pending' as const,
      category: 'Pay Later Payment',
    },
  ];

  await supabase.from('finance_bills').insert(sampleBills);

  await supabase.from('finance_fixed_deposits').insert([
    {
      user_id: user.id,
      name: 'Tax Saver Fixed Deposit (5Y)',
      institution: 'State Bank of India',
      principal: 100000.0,
      interest_rate: 7.25,
      opening_date: dMinus(180),
      maturity_date: dMinus(-1645),
      maturity_amount: 142800.0,
      payout_method: 'cumulative',
    },
    {
      user_id: user.id,
      name: 'Emergency Liquid FD (1Y)',
      institution: 'HDFC Bank',
      principal: 50000.0,
      interest_rate: 6.9,
      opening_date: dMinus(90),
      maturity_date: dMinus(-275),
      maturity_amount: 53540.0,
      payout_method: 'reinvest',
    },
  ]);

  await supabase.from('finance_loans').insert({
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
  });

  // Also seed extended Finance tables when present + pass payload back for local fallback sync
  const demoExtended = createDemoExtendedState(cardAccId, payLaterAccId, bankAccId);

  try {
    if (demoExtended.snapshots.length > 0) {
      await supabase.from('finance_account_snapshots').insert(
        demoExtended.snapshots.map((s) => ({
          id: s.id,
          user_id: user.id,
          account_id: s.account_id,
          as_of: s.as_of,
          balance: s.balance,
          outstanding: s.outstanding,
          available_credit: s.available_credit,
          billed_amount: s.billed_amount,
          unbilled_amount: s.unbilled_amount,
          source: s.source,
          notes: s.notes,
        }))
      );
    }

    const budgetEntries = Object.entries(demoExtended.budgets);
    if (budgetEntries.length > 0) {
      await supabase.from('finance_category_budgets').upsert(
        budgetEntries.map(([category, monthly_limit]) => ({
          user_id: user.id,
          category,
          monthly_limit,
        })),
        { onConflict: 'user_id,category' }
      );
    }

    await supabase.from('finance_personal_loans').insert(
      demoExtended.personalLoans.map((p) => ({
        id: p.id,
        user_id: user.id,
        direction: p.direction,
        person_name: p.person_name,
        principal: p.principal,
        outstanding: p.outstanding,
        occurred_on: p.occurred_on,
        due_date: p.due_date,
        account_id: p.account_id,
        status: p.status,
        notes: p.notes,
        repayments: p.repayments,
      }))
    );

    await supabase.from('finance_expense_groups').insert(
      demoExtended.expenseGroups.map((g) => ({
        id: g.id,
        user_id: user.id,
        name: g.name,
        mode: g.mode,
        total_cost: g.total_cost,
        occurred_on: g.occurred_on,
        paid_by_owner: g.paid_by_owner,
        shares: g.shares,
        settlements: g.settlements,
        notes: g.notes,
      }))
    );

    await supabase.from('finance_emi_agreements').insert(
      demoExtended.emiAgreements.map((e) => ({
        id: e.id,
        user_id: user.id,
        account_id: e.account_id,
        title: e.title,
        merchant: e.merchant,
        order_ref: e.order_ref,
        financed_principal: e.financed_principal,
        annual_interest_rate: e.annual_interest_rate,
        processing_fee: e.processing_fee,
        monthly_emi: e.monthly_emi,
        duration_months: e.duration_months,
        paid_installments: e.paid_installments,
        first_due_date: e.first_due_date,
        schedule: e.schedule,
        status: e.status,
      }))
    );

    await supabase.from('finance_orders').insert(
      demoExtended.orders.map((o) => ({
        id: o.id,
        user_id: user.id,
        platform: o.platform,
        merchant: o.merchant,
        order_ref: o.order_ref,
        description: o.description,
        amount: o.amount,
        occurred_on: o.occurred_on,
        account_id: o.account_id,
        status: o.status,
        refund_expected_amount: o.refund_expected_amount,
        refund_expected_by: o.refund_expected_by,
        refund_received_amount: o.refund_received_amount,
        refund_status: o.refund_status,
        notes: o.notes,
      }))
    );
  } catch {
    // Extended tables optional before remote migration push
  }

  revalidatePath('/finance');
  return { success: true, demoExtended };
}
