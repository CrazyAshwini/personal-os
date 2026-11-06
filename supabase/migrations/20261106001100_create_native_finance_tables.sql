-- Migration: 20261106001100_create_native_finance_tables.sql
-- Description: Creates native Personal OS Finance tables (Accounts, Transactions, Bills, Fixed Deposits, and Loans/EMIs) with strict per-user RLS

-- 1. Finance Accounts (Bank, Wallet, Credit Card, Pay Later)
CREATE TABLE IF NOT EXISTS public.finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  institution TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('bank', 'wallet', 'credit_card', 'pay_later')),
  masked_suffix TEXT NOT NULL DEFAULT '0000',
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  credit_limit NUMERIC(15, 2) DEFAULT NULL,
  billing_day INT DEFAULT NULL CHECK (billing_day BETWEEN 1 AND 31),
  due_day INT DEFAULT NULL CHECK (due_day BETWEEN 1 AND 31),
  accent TEXT NOT NULL DEFAULT '#3b82f6',
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own finance accounts"
  ON public.finance_accounts
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_finance_accounts_user_kind ON public.finance_accounts(user_id, kind);

-- 2. Finance Transactions (Income, Expense, Transfer, Bill Payment, Refund)
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  to_account_id UUID REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'income', 'transfer', 'bill_payment', 'refund')),
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT NOT NULL,
  merchant TEXT DEFAULT NULL,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own finance transactions"
  ON public.finance_transactions
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_date ON public.finance_transactions(user_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_account ON public.finance_transactions(account_id);

-- 3. Finance Bills & Subscriptions
CREATE TABLE IF NOT EXISTS public.finance_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  due_date DATE NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  category TEXT NOT NULL DEFAULT 'Utilities',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.finance_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own finance bills"
  ON public.finance_bills
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_finance_bills_user_due ON public.finance_bills(user_id, due_date ASC);

-- 4. Finance Fixed Deposits
CREATE TABLE IF NOT EXISTS public.finance_fixed_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  institution TEXT NOT NULL,
  principal NUMERIC(15, 2) NOT NULL,
  interest_rate NUMERIC(5, 2) NOT NULL,
  opening_date DATE NOT NULL DEFAULT CURRENT_DATE,
  maturity_date DATE NOT NULL,
  maturity_amount NUMERIC(15, 2) NOT NULL,
  payout_method TEXT NOT NULL DEFAULT 'cumulative',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.finance_fixed_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own fixed deposits"
  ON public.finance_fixed_deposits
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_finance_fd_user ON public.finance_fixed_deposits(user_id, maturity_date ASC);

-- 5. Finance Loans & EMIs
CREATE TABLE IF NOT EXISTS public.finance_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lender TEXT NOT NULL,
  principal NUMERIC(15, 2) NOT NULL,
  outstanding NUMERIC(15, 2) NOT NULL,
  interest_rate NUMERIC(5, 2) DEFAULT NULL,
  monthly_emi NUMERIC(15, 2) NOT NULL,
  total_emis INT NOT NULL,
  remaining_emis INT NOT NULL,
  due_day INT NOT NULL DEFAULT 5 CHECK (due_day BETWEEN 1 AND 31),
  disbursed_on DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.finance_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own finance loans"
  ON public.finance_loans
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_finance_loans_user ON public.finance_loans(user_id);
