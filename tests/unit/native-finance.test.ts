import { describe, it, expect } from 'vitest';
import {
  formatINR,
  computeFinanceSummary,
} from '@/features/finance/finance-calculations';
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
