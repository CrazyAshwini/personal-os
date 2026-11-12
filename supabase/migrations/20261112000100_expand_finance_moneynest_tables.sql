-- Money Nest Extended Finance Tables
-- Safe incremental migration adding Snapshots, Category Budgets, Personal Loans (Lent/Borrowed),
-- Split Bills & Contribution Pools, Pay Later / Card EMI Agreements, and Orders & Refunds tracking.

create table if not exists public.finance_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.finance_accounts(id) on delete cascade,
  as_of date not null default current_date,
  balance numeric(14, 2),
  outstanding numeric(14, 2),
  available_credit numeric(14, 2),
  billed_amount numeric(14, 2),
  unbilled_amount numeric(14, 2),
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_snapshots_user_acc
  on public.finance_account_snapshots(user_id, account_id, as_of desc);

alter table public.finance_account_snapshots enable row level security;

create policy "Users manage own finance snapshots"
  on public.finance_account_snapshots
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Category Monthly Budgets
create table if not exists public.finance_category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  monthly_limit numeric(14, 2) not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

alter table public.finance_category_budgets enable row level security;

create policy "Users manage own finance budgets"
  on public.finance_category_budgets
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Personal Loans (Money Lent / Borrowed with people)
create table if not exists public.finance_personal_loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  direction text not null check (direction in ('lent', 'borrowed')),
  person_name text not null,
  principal numeric(14, 2) not null check (principal > 0),
  outstanding numeric(14, 2) not null check (outstanding >= 0),
  occurred_on date not null default current_date,
  due_date date,
  account_id uuid references public.finance_accounts(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'settled')),
  notes text,
  repayments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_personal_loans_user
  on public.finance_personal_loans(user_id, status, direction);

alter table public.finance_personal_loans enable row level security;

create policy "Users manage own finance personal loans"
  on public.finance_personal_loans
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Split Bills & Contribution Pools
create table if not exists public.finance_expense_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mode text not null default 'split_bill' check (mode in ('split_bill', 'contribution_pool')),
  total_cost numeric(14, 2) not null check (total_cost > 0),
  occurred_on date not null default current_date,
  paid_by_owner boolean not null default true,
  shares jsonb not null default '[]'::jsonb,
  settlements jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_expense_groups_user
  on public.finance_expense_groups(user_id, occurred_on desc);

alter table public.finance_expense_groups enable row level security;

create policy "Users manage own finance expense groups"
  on public.finance_expense_groups
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Pay Later / Credit Card EMI Agreements
create table if not exists public.finance_emi_agreements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.finance_accounts(id) on delete set null,
  title text not null,
  merchant text,
  order_ref text,
  financed_principal numeric(14, 2) not null check (financed_principal > 0),
  annual_interest_rate numeric(6, 2) not null default 0,
  processing_fee numeric(12, 2) not null default 0,
  monthly_emi numeric(14, 2) not null check (monthly_emi > 0),
  duration_months integer not null check (duration_months > 0),
  paid_installments integer not null default 0,
  first_due_date date not null,
  schedule jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_emi_agreements_user
  on public.finance_emi_agreements(user_id, status);

alter table public.finance_emi_agreements enable row level security;

create policy "Users manage own finance emi agreements"
  on public.finance_emi_agreements
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Orders & Refund Tracking
create table if not exists public.finance_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  merchant text,
  order_ref text,
  description text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  occurred_on date not null default current_date,
  account_id uuid references public.finance_accounts(id) on delete set null,
  status text not null default 'placed',
  refund_expected_amount numeric(14, 2),
  refund_expected_by date,
  refund_received_amount numeric(14, 2) not null default 0,
  refund_status text not null default 'none'
    check (refund_status in ('none', 'expected', 'partial', 'confirmed', 'store_credit', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_orders_user
  on public.finance_orders(user_id, occurred_on desc);

alter table public.finance_orders enable row level security;

create policy "Users manage own finance orders"
  on public.finance_orders
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
