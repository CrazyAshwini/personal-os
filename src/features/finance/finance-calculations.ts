import Decimal from 'decimal.js';

Decimal.config({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function formatINR(
  amount: number | string | null | undefined,
  compact: boolean = false
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0.00';
  }

  const dec = new Decimal(amount);
  const isNegative = dec.isNegative();
  const abs = dec.abs();

  if (compact) {
    if (abs.gte(10000000)) {
      return `${isNegative ? '-' : ''}₹${abs.div(10000000).toFixed(2)} Cr`;
    }
    if (abs.gte(100000)) {
      return `${isNegative ? '-' : ''}₹${abs.div(100000).toFixed(2)} L`;
    }
    if (abs.gte(1000)) {
      return `${isNegative ? '-' : ''}₹${abs.div(1000).toFixed(1)} K`;
    }
  }

  const [integerPart, decimalPart] = abs.toFixed(2).split('.');
  // Indian numbering format: last 3 digits, then every 2 digits
  let formattedInteger = integerPart;
  if (integerPart.length > 3) {
    const lastThree = integerPart.slice(-3);
    const otherNumbers = integerPart.slice(0, -3);
    formattedInteger = `${otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
  }

  return `${isNegative ? '-' : ''}₹${formattedInteger}.${decimalPart}`;
}

export interface FinanceSummaryMetrics {
  netWorth: number;
  totalLiquidCash: number;
  totalCreditDebt: number;
  totalInvestments: number;
  totalLoanOutstanding: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;
}

export function computeFinanceSummary(
  accounts: Array<{ kind: string; balance: number; active: boolean }>,
  transactions: Array<{ kind: string; amount: number; occurred_on: string }>,
  fds: Array<{ principal: number }>,
  loans: Array<{ outstanding: number }>
): FinanceSummaryMetrics {
  // 1. Account Assets & Debts
  let totalLiquidCash = 0;
  let totalCreditDebt = 0;

  for (const acc of accounts) {
    if (!acc.active) continue;
    const bal = Number(acc.balance) || 0;
    if (acc.kind === 'bank' || acc.kind === 'wallet') {
      totalLiquidCash += bal;
    } else if (acc.kind === 'credit_card' || acc.kind === 'pay_later') {
      // Credit card balances typically represent utilized/outstanding credit
      totalCreditDebt += Math.abs(bal);
    }
  }

  // 2. Fixed Deposits (Investments)
  const totalInvestments = fds.reduce((sum, f) => sum + (Number(f.principal) || 0), 0);

  // 3. Loans
  const totalLoanOutstanding = loans.reduce((sum, l) => sum + (Number(l.outstanding) || 0), 0);

  // 4. Net Worth = (Liquid + Investments) - (Credit Debt + Loan Debt)
  const netWorth = (totalLiquidCash + totalInvestments) - (totalCreditDebt + totalLoanOutstanding);

  // 5. Monthly Cashflow (Current Month)
  const currentMonthPrefix = new Date().toISOString().slice(0, 7); // e.g. "2026-11"
  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  for (const tx of transactions) {
    if (!tx.occurred_on.startsWith(currentMonthPrefix)) continue;
    const amt = Number(tx.amount) || 0;
    if (tx.kind === 'income') {
      monthlyIncome += amt;
    } else if (tx.kind === 'expense') {
      monthlyExpenses += amt;
    }
  }

  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? Number(((monthlySavings / monthlyIncome) * 100).toFixed(1)) : 0;

  return {
    netWorth: Number(netWorth.toFixed(2)),
    totalLiquidCash: Number(totalLiquidCash.toFixed(2)),
    totalCreditDebt: Number(totalCreditDebt.toFixed(2)),
    totalInvestments: Number(totalInvestments.toFixed(2)),
    totalLoanOutstanding: Number(totalLoanOutstanding.toFixed(2)),
    monthlyIncome: Number(monthlyIncome.toFixed(2)),
    monthlyExpenses: Number(monthlyExpenses.toFixed(2)),
    monthlySavings: Number(monthlySavings.toFixed(2)),
    savingsRate,
  };
}
