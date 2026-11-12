import { describe, it, expect } from 'vitest';
import {
  formatINR,
  computeFinanceSummary,
  computeCreditUsage,
  computeMonthlySpendAnalytics,
  computeBudgetStatuses,
  calculateFdMaturity,
  generateEmiInstallmentSchedule,
  computePersonalLoansSummary,
  computeExpenseGroupSummary,
} from '@/features/finance/finance-calculations';
import {
  parseStatementCsv,
  exportTransactionsToCsv,
} from '@/features/finance/statement-import';
import {
  parsePaymentSmsText,
  answerFinanceQuestion,
} from '@/features/finance/nestbot-engine';
import type {
  FinanceAccountRow,
  FinanceTransactionRow,
} from '@/features/finance/finance-types';
import {
  createFinanceAccountSchema,
  createFinanceTransactionSchema,
  createFinanceBillSchema,
  createFinanceFDSchema,
  createFinanceLoanSchema,
} from '@/lib/validation/finance';

describe('Native Finance Calculations', () => {
  describe('formatINR', () => {
    it('formats basic amounts in Indian notation', () => {
      expect(formatINR(1000)).toBe('₹1,000.00');
      expect(formatINR(150000)).toBe('₹1,50,000.00');
      expect(formatINR(12345678.9)).toBe('₹1,23,45,678.90');
    });

    it('formats compact amounts correctly', () => {
      expect(formatINR(5000, true)).toBe('₹5.0 K');
      expect(formatINR(250000, true)).toBe('₹2.50 L');
      expect(formatINR(15000000, true)).toBe('₹1.50 Cr');
    });

    it('handles negative numbers and zero', () => {
      expect(formatINR(-2500)).toBe('-₹2,500.00');
      expect(formatINR(0)).toBe('₹0.00');
      expect(formatINR(null)).toBe('₹0.00');
    });
  });

  describe('computeFinanceSummary', () => {
    it('accurately computes net worth, cashflow, and liquid assets', () => {
      const accounts = [
        { kind: 'bank', balance: 50000, active: true },
        { kind: 'wallet', balance: 5000, active: true },
        { kind: 'credit_card', balance: 15000, active: true },
      ];
      const fds = [{ principal: 100000 }];
      const loans = [{ outstanding: 40000 }];
      const currentMonth = new Date().toISOString().slice(0, 7);
      const transactions = [
        { kind: 'income', amount: 80000, occurred_on: `${currentMonth}-01` },
        { kind: 'expense', amount: 30000, occurred_on: `${currentMonth}-05` },
      ];

      const summary = computeFinanceSummary(accounts, transactions, fds, loans);

      // Liquid: 50000 + 5000 = 55000
      expect(summary.totalLiquidCash).toBe(55000);
      // Investments: 100000
      expect(summary.totalInvestments).toBe(100000);
      // Credit: 15000
      expect(summary.totalCreditDebt).toBe(15000);
      // Loan: 40000
      expect(summary.totalLoanOutstanding).toBe(40000);
      // Net Worth: (55000 + 100000) - (15000 + 40000) = 155000 - 55000 = 100000
      expect(summary.netWorth).toBe(100000);
      // Monthly income: 80000, expense: 30000, savings: 50000
      expect(summary.monthlyIncome).toBe(80000);
      expect(summary.monthlyExpenses).toBe(30000);
      expect(summary.monthlySavings).toBe(50000);
      expect(summary.savingsRate).toBe(62.5);
    });
  });
});

describe('Native Finance Schemas', () => {
  it('validates account input', () => {
    const valid = createFinanceAccountSchema.safeParse({
      name: 'HDFC Checking',
      institution: 'HDFC Bank',
      kind: 'bank',
      maskedSuffix: '4821',
      balance: 10000,
    });
    expect(valid.success).toBe(true);
  });

  it('validates transaction input', () => {
    const valid = createFinanceTransactionSchema.safeParse({
      amount: 1500,
      currency: 'INR',
      kind: 'expense',
      category: 'Food',
      description: 'Groceries',
      occurredOn: '2026-11-06',
    });
    expect(valid.success).toBe(true);
  });

  it('validates bill input', () => {
    const valid = createFinanceBillSchema.safeParse({
      name: 'Broadband',
      amount: 999,
      dueDate: '2026-11-20',
      frequency: 'monthly',
      category: 'Utilities',
    });
    expect(valid.success).toBe(true);
  });

  it('validates fixed deposit input', () => {
    const valid = createFinanceFDSchema.safeParse({
      name: 'SBI FD',
      institution: 'State Bank of India',
      principal: 50000,
      interestRate: 7.1,
      openingDate: '2026-11-01',
      maturityDate: '2027-11-01',
      maturityAmount: 53550,
      payoutMethod: 'cumulative',
    });
    expect(valid.success).toBe(true);
  });

  it('validates loan input', () => {
    const valid = createFinanceLoanSchema.safeParse({
      name: 'Car Loan',
      lender: 'HDFC Bank',
      principal: 500000,
      outstanding: 350000,
      monthlyEmi: 12500,
      totalEmis: 48,
      remainingEmis: 28,
      dueDay: 5,
    });
    expect(valid.success).toBe(true);
  });
});

describe('Money Nest Extended Engine', () => {
  const sampleAccount: FinanceAccountRow = {
    id: '11111111-1111-4111-8111-111111111111',
    user_id: 'u1',
    name: 'Regalia Gold',
    institution: 'HDFC Bank',
    kind: 'credit_card',
    masked_suffix: '9102',
    balance: 30000,
    credit_limit: 100000,
    billing_day: 15,
    due_day: 5,
    accent: '#d97706',
    active: true,
    notes: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };

  const sampleTxs: FinanceTransactionRow[] = [
    {
      id: 't1',
      user_id: 'u1',
      account_id: sampleAccount.id,
      to_account_id: null,
      amount: 5000,
      currency: 'INR',
      kind: 'expense',
      category: 'Food',
      description: 'Team Dinner',
      merchant: 'Social',
      occurred_on: '2026-11-05',
      notes: null,
      created_at: '2026-11-05T10:00:00Z',
      updated_at: '2026-11-05T10:00:00Z',
    },
    {
      id: 't2',
      user_id: 'u1',
      account_id: sampleAccount.id,
      to_account_id: null,
      amount: 1000,
      currency: 'INR',
      kind: 'refund',
      category: 'Purchase Refund',
      description: 'Cashback / partial return',
      merchant: 'Social',
      occurred_on: '2026-11-06',
      notes: null,
      created_at: '2026-11-06T10:00:00Z',
      updated_at: '2026-11-06T10:00:00Z',
    },
    {
      id: 't3',
      user_id: 'u1',
      account_id: sampleAccount.id,
      to_account_id: '22222222-2222-4222-8222-222222222222',
      amount: 10000,
      currency: 'INR',
      kind: 'transfer',
      category: 'Own Account Transfer',
      description: 'Self transfer',
      merchant: null,
      occurred_on: '2026-11-07',
      notes: null,
      created_at: '2026-11-07T10:00:00Z',
      updated_at: '2026-11-07T10:00:00Z',
    },
  ];

  it('computes credit card utilization band and available credit accurately', () => {
    const usage = computeCreditUsage(sampleAccount, []);
    expect(usage.outstanding).toBe(30000);
    expect(usage.availableCredit).toBe(70000);
    expect(usage.utilizationPercent).toBe(30);
    expect(usage.band).toBe('medium');
  });

  it('computes monthly gross vs net spend and excludes transfers', () => {
    const stats = computeMonthlySpendAnalytics(sampleTxs, '2026-11');
    expect(stats.grossSpend).toBe(5000);
    expect(stats.refunds).toBe(1000);
    expect(stats.netSpend).toBe(4000);
    expect(stats.transfers).toBe(10000);
  });

  it('tracks category budgets with warning and over thresholds', () => {
    const statuses = computeBudgetStatuses({ Food: 4000 }, sampleTxs, '2026-11', 'gross');
    expect(statuses).toHaveLength(1);
    expect(statuses[0].spent).toBe(5000);
    expect(statuses[0].percentage).toBe(125);
    expect(statuses[0].status).toBe('over');
  });

  it('calculates FD maturity value and EMI installment schedules accurately', () => {
    const fd = calculateFdMaturity({
      principal: 100000,
      annualRatePercent: 7.2,
      tenureMonths: 12,
      compoundingFrequency: 'quarterly',
    });
    expect(fd.maturityAmount).toBeGreaterThan(107300);

    const schedule = generateEmiInstallmentSchedule({
      financedPrincipal: 30000,
      annualInterestRate: 0,
      durationMonths: 6,
      monthlyEmi: 5000,
      firstDueDate: '2026-11-05',
    });
    expect(schedule).toHaveLength(6);
    expect(schedule.reduce((s, i) => s + i.principalComponent, 0)).toBeCloseTo(30000, 2);
  });

  it('computes personal loans lent/borrowed and split bill settlements accurately', () => {
    const plSummary = computePersonalLoansSummary([
      {
        id: 'p1',
        direction: 'lent',
        person_name: 'Rohan',
        principal: 5000,
        outstanding: 2000,
        occurred_on: '2026-11-01',
        due_date: null,
        account_id: null,
        status: 'active',
        notes: null,
        repayments: [],
      },
      {
        id: 'p2',
        direction: 'borrowed',
        person_name: 'Ananya',
        principal: 1000,
        outstanding: 500,
        occurred_on: '2026-11-02',
        due_date: null,
        account_id: null,
        status: 'active',
        notes: null,
        repayments: [],
      },
    ]);
    expect(plSummary.totalReceivable).toBe(2000);
    expect(plSummary.totalPayable).toBe(500);
    expect(plSummary.netPosition).toBe(1500);

    const gs = computeExpenseGroupSummary({
      id: 'g1',
      name: 'Trip',
      mode: 'split_bill',
      total_cost: 9000,
      occurred_on: '2026-11-03',
      paid_by_owner: true,
      shares: [
        { participant: 'You', shareAmount: 3000, isOwner: true },
        { participant: 'A', shareAmount: 3000, isOwner: false },
        { participant: 'B', shareAmount: 3000, isOwner: false },
      ],
      settlements: [
        {
          id: 's1',
          counterparty: 'A',
          direction: 'incoming',
          amount: 3000,
          occurredOn: '2026-11-04',
        },
      ],
      notes: null,
    });
    expect(gs.receivable).toBe(3000);
    expect(gs.isSettled).toBe(false);
  });

  it('parses statement CSV with duplicate detection and exports back cleanly', () => {
    const csv = [
      'date,description,amount,type,category',
      '2026-11-05,Team Dinner,5000.00,expense,Food',
      '2026-11-08,Uber Ride,250.50,expense,Transport',
    ].join('\n');

    const review = parseStatementCsv(csv, [sampleAccount], sampleTxs);
    expect(review.errors).toHaveLength(0);
    expect(review.candidates).toHaveLength(2);
    expect(review.candidates[0].status).toBe('possible_duplicate');
    expect(review.candidates[1].status).toBe('new');

    const exported = exportTransactionsToCsv(sampleTxs, [sampleAccount]);
    expect(exported).toContain('Team Dinner');
    expect(exported).toContain('Regalia Gold');
  });

  it('parses bank/UPI SMS alerts and answers NestBot workspace queries', () => {
    const draft = parsePaymentSmsText(
      'INR 649.00 debited from HDFC Card xx9102 at Netflix India on 2026-11-10'
    );
    expect(draft).not.toBeNull();
    expect(draft?.amount).toBe(649);
    expect(draft?.accountHint).toBe('9102');
    expect(draft?.category).toBe('Subscriptions');

    const reply = answerFinanceQuestion(
      'What did I spend this month?',
      {
        accounts: [sampleAccount],
        transactions: sampleTxs,
        bills: [],
        fixedDeposits: [],
        loans: [],
      },
      '2026-11'
    );
    expect(reply).toContain('5,000.00');
    expect(reply).toContain('4,000.00');
  });
});
