import type { Database } from '@/types/database';

export type FinanceAccountRow = Database['public']['Tables']['finance_accounts']['Row'];
export type FinanceTransactionRow = Database['public']['Tables']['finance_transactions']['Row'];
export type FinanceBillRow = Database['public']['Tables']['finance_bills']['Row'];
export type FinanceFDRow = Database['public']['Tables']['finance_fixed_deposits']['Row'];
export type FinanceLoanRow = Database['public']['Tables']['finance_loans']['Row'];

export interface PersonalLoanRepayment {
  id: string;
  amount: number;
  occurredOn: string;
  accountId?: string | null;
  note?: string | null;
}

export interface FinancePersonalLoanItem {
  id: string;
  direction: 'lent' | 'borrowed';
  person_name: string;
  principal: number;
  outstanding: number;
  occurred_on: string;
  due_date: string | null;
  account_id: string | null;
  status: 'active' | 'settled';
  notes: string | null;
  repayments: PersonalLoanRepayment[];
}

export interface ExpenseGroupShare {
  participant: string;
  shareAmount: number;
  isOwner: boolean;
}

export interface ExpenseGroupSettlement {
  id: string;
  counterparty: string;
  direction: 'incoming' | 'outgoing';
  amount: number;
  occurredOn: string;
  note?: string | null;
}

export interface FinanceExpenseGroupItem {
  id: string;
  name: string;
  mode: 'split_bill' | 'contribution_pool';
  total_cost: number;
  occurred_on: string;
  paid_by_owner: boolean;
  shares: ExpenseGroupShare[];
  settlements: ExpenseGroupSettlement[];
  notes: string | null;
}

export interface EmiInstallmentItem {
  number: number;
  dueDate: string;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  status: 'pending' | 'paid';
  paidOn?: string | null;
}

export interface FinanceEmiAgreementItem {
  id: string;
  account_id: string | null;
  title: string;
  merchant: string | null;
  order_ref: string | null;
  financed_principal: number;
  annual_interest_rate: number;
  processing_fee: number;
  monthly_emi: number;
  duration_months: number;
  paid_installments: number;
  first_due_date: string;
  schedule: EmiInstallmentItem[];
  status: 'active' | 'completed';
}

export interface FinanceOrderItem {
  id: string;
  platform: string;
  merchant: string | null;
  order_ref: string | null;
  description: string;
  amount: number;
  occurred_on: string;
  account_id: string | null;
  status: string;
  refund_expected_amount: number | null;
  refund_expected_by: string | null;
  refund_received_amount: number;
  refund_status: 'none' | 'expected' | 'partial' | 'confirmed' | 'store_credit' | 'rejected';
  notes: string | null;
}

export interface FinanceAccountSnapshotItem {
  id: string;
  account_id: string;
  as_of: string;
  balance: number | null;
  outstanding: number | null;
  available_credit: number | null;
  billed_amount: number | null;
  unbilled_amount: number | null;
  source: string;
  notes: string | null;
}

export interface FinanceCategoryBudgetMap {
  [category: string]: number;
}

export interface NativeFinanceWorkspace {
  userId?: string;
  accounts: FinanceAccountRow[];
  transactions: FinanceTransactionRow[];
  bills: FinanceBillRow[];
  fixedDeposits: FinanceFDRow[];
  loans: FinanceLoanRow[];
  snapshots?: FinanceAccountSnapshotItem[];
  budgets?: FinanceCategoryBudgetMap;
  personalLoans?: FinancePersonalLoanItem[];
  expenseGroups?: FinanceExpenseGroupItem[];
  emiAgreements?: FinanceEmiAgreementItem[];
  orders?: FinanceOrderItem[];
}

export const MONEY_NEST_CATEGORIES = [
  'Food',
  'Groceries',
  'Transport',
  'Bills & Utilities',
  'Shopping',
  'Subscriptions',
  'Entertainment',
  'Education',
  'Health',
  'Travel',
  'Housing',
  'Investments',
  'Gifts',
  'Salary',
  'Credit Card Payment',
  'Pay Later Payment',
  'Loan EMI',
  'Own Account Transfer',
  'Purchase Refund',
  'Split Bill Reimbursement',
  'Others',
] as const;

export const CATEGORY_COLOR_MAP: Record<string, string> = {
  Food: '#10b981',
  Groceries: '#14b8a6',
  Transport: '#3b82f6',
  'Bills & Utilities': '#f59e0b',
  Utilities: '#f59e0b',
  Shopping: '#8b5cf6',
  Subscriptions: '#ec4899',
  Entertainment: '#f43f5e',
  Education: '#06b6d4',
  Health: '#ef4444',
  Travel: '#6366f1',
  Housing: '#84cc16',
  Investments: '#059669',
  Gifts: '#d946ef',
  Salary: '#22c55e',
  'Credit Card Payment': '#64748b',
  'Pay Later Payment': '#7c3aed',
  'Loan EMI': '#0ea5e9',
  'Own Account Transfer': '#94a3b8',
  'Purchase Refund': '#34d399',
  'Split Bill Reimbursement': '#2dd4bf',
  Others: '#6b7280',
  Other: '#6b7280',
};
