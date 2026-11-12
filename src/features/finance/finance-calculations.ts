import Decimal from 'decimal.js';
import type {
  EmiInstallmentItem,
  FinanceAccountRow,
  FinanceAccountSnapshotItem,
  FinanceCategoryBudgetMap,
  FinanceEmiAgreementItem,
  FinanceExpenseGroupItem,
  FinanceFDRow,
  FinancePersonalLoanItem,
  FinanceTransactionRow,
} from './finance-types';
import { CATEGORY_COLOR_MAP } from './finance-types';

Decimal.config({ precision: 20, rounding: Decimal.ROUND_HALF_UP });
type DecimalNum = InstanceType<typeof Decimal>;

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

export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function formatDateIN(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function monthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  if (!y || !m) return yyyyMm;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function shiftMonth(yyyyMm: string, delta: number): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  if (!y || !m) return todayIST().slice(0, 7);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
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
  let totalLiquidCash = 0;
  let totalCreditDebt = 0;

  for (const acc of accounts) {
    if (!acc.active) continue;
    const bal = Number(acc.balance) || 0;
    if (acc.kind === 'bank' || acc.kind === 'wallet') {
      totalLiquidCash += bal;
    } else if (acc.kind === 'credit_card' || acc.kind === 'pay_later') {
      totalCreditDebt += Math.abs(bal);
    }
  }

  const totalInvestments = fds.reduce((sum, f) => sum + (Number(f.principal) || 0), 0);
  const totalLoanOutstanding = loans.reduce((sum, l) => sum + (Number(l.outstanding) || 0), 0);
  const netWorth = totalLiquidCash + totalInvestments - (totalCreditDebt + totalLoanOutstanding);

  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
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
  const savingsRate =
    monthlyIncome > 0 ? Number(((monthlySavings / monthlyIncome) * 100).toFixed(1)) : 0;

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

export type UsageBand = 'smart' | 'medium' | 'high' | 'unknown';

export function getUsageBand(percentage: number | null): UsageBand {
  if (percentage === null || !Number.isFinite(percentage)) return 'unknown';
  if (percentage < 30) return 'smart';
  if (percentage < 70) return 'medium';
  return 'high';
}

export interface CreditUsageMetrics {
  outstanding: number;
  creditLimit: number | null;
  availableCredit: number | null;
  utilizationPercent: number | null;
  band: UsageBand;
  latestSnapshot: FinanceAccountSnapshotItem | null;
}

export function computeCreditUsage(
  account: Pick<FinanceAccountRow, 'id' | 'kind' | 'balance' | 'credit_limit'>,
  snapshots: FinanceAccountSnapshotItem[] = []
): CreditUsageMetrics {
  const accSnapshots = snapshots
    .filter((s) => s.account_id === account.id)
    .sort((a, b) => b.as_of.localeCompare(a.as_of));
  const latest = accSnapshots[0] ?? null;

  const outstanding = Math.abs(
    latest?.outstanding !== null && latest?.outstanding !== undefined
      ? Number(latest.outstanding)
      : Number(account.balance) || 0
  );
  const creditLimit =
    account.credit_limit !== null && Number(account.credit_limit) > 0
      ? Number(account.credit_limit)
      : null;

  const availableCredit =
    latest?.available_credit !== null && latest?.available_credit !== undefined
      ? Math.max(0, Number(latest.available_credit))
      : creditLimit !== null
        ? Math.max(0, Number(new Decimal(creditLimit).minus(outstanding).toFixed(2)))
        : null;

  const utilizationPercent =
    creditLimit !== null && creditLimit > 0
      ? Number(new Decimal(outstanding).div(creditLimit).times(100).toFixed(1))
      : null;

  return {
    outstanding: Number(outstanding.toFixed(2)),
    creditLimit,
    availableCredit,
    utilizationPercent,
    band: getUsageBand(utilizationPercent),
    latestSnapshot: latest,
  };
}

export interface MonthlySpendAnalytics {
  month: string;
  grossSpend: number;
  refunds: number;
  netSpend: number;
  income: number;
  transfers: number;
  billPayments: number;
  savings: number;
  savingsRate: number;
  expenseCount: number;
}

export function computeMonthlySpendAnalytics(
  transactions: FinanceTransactionRow[],
  month: string
): MonthlySpendAnalytics {
  let gross = new Decimal(0);
  let refunds = new Decimal(0);
  let income = new Decimal(0);
  let transfers = new Decimal(0);
  let billPayments = new Decimal(0);
  let expenseCount = 0;

  for (const tx of transactions) {
    if (!tx.occurred_on.startsWith(`${month}-`)) continue;
    const amt = new Decimal(tx.amount || 0);
    switch (tx.kind) {
      case 'expense':
        gross = gross.plus(amt);
        expenseCount += 1;
        break;
      case 'refund':
        refunds = refunds.plus(amt);
        break;
      case 'income':
        income = income.plus(amt);
        break;
      case 'transfer':
        transfers = transfers.plus(amt);
        break;
      case 'bill_payment':
        billPayments = billPayments.plus(amt);
        break;
    }
  }

  const net = Decimal.max(0, gross.minus(refunds));
  const savings = income.minus(net);
  const savingsRate = income.gt(0)
    ? Number(savings.div(income).times(100).toFixed(1))
    : 0;

  return {
    month,
    grossSpend: Number(gross.toFixed(2)),
    refunds: Number(refunds.toFixed(2)),
    netSpend: Number(net.toFixed(2)),
    income: Number(income.toFixed(2)),
    transfers: Number(transfers.toFixed(2)),
    billPayments: Number(billPayments.toFixed(2)),
    savings: Number(savings.toFixed(2)),
    savingsRate,
    expenseCount,
  };
}

export interface CategorySpendSummary {
  category: string;
  gross: number;
  refunds: number;
  net: number;
  count: number;
  percentage: number;
  color: string;
}

export function computeCategorySpending(
  transactions: FinanceTransactionRow[],
  month: string,
  mode: 'gross' | 'net' = 'gross'
): CategorySpendSummary[] {
  const map = new Map<string, { gross: DecimalNum; refunds: DecimalNum; count: number }>();

  for (const tx of transactions) {
    if (!tx.occurred_on.startsWith(`${month}-`)) continue;
    if (tx.kind !== 'expense' && tx.kind !== 'refund') continue;
    const cat = tx.category || 'Others';
    const cur = map.get(cat) ?? {
      gross: new Decimal(0),
      refunds: new Decimal(0),
      count: 0,
    };
    const amt = new Decimal(tx.amount || 0);
    if (tx.kind === 'expense') {
      cur.gross = cur.gross.plus(amt);
      cur.count += 1;
    } else {
      cur.refunds = cur.refunds.plus(amt);
    }
    map.set(cat, cur);
  }

  const rows = Array.from(map.entries())
    .map(([category, vals]) => {
      const gross = Number(vals.gross.toFixed(2));
      const refunds = Number(vals.refunds.toFixed(2));
      const net = Math.max(0, Number(vals.gross.minus(vals.refunds).toFixed(2)));
      return {
        category,
        gross,
        refunds,
        net,
        count: vals.count,
        activeAmount: mode === 'net' ? net : gross,
        color: CATEGORY_COLOR_MAP[category] || '#64748b',
      };
    })
    .filter((r) => r.activeAmount > 0 || r.gross > 0)
    .sort((a, b) => b.activeAmount - a.activeAmount);

  const total = rows.reduce((s, r) => s + r.activeAmount, 0);
  return rows.map((r) => ({
    category: r.category,
    gross: r.gross,
    refunds: r.refunds,
    net: r.net,
    count: r.count,
    percentage: total > 0 ? Number(((r.activeAmount / total) * 100).toFixed(1)) : 0,
    color: r.color,
  }));
}

export interface DailySpendPoint {
  date: string;
  day: number;
  gross: number;
  refunds: number;
  net: number;
  amount: number;
  expenseCount: number;
}

export function computeDailySpending(
  transactions: FinanceTransactionRow[],
  month: string,
  mode: 'gross' | 'net' = 'gross'
): DailySpendPoint[] {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = y && m ? new Date(Date.UTC(y, m, 0)).getUTCDate() : 30;

  const byDay = new Map<string, { gross: DecimalNum; refunds: DecimalNum; count: number }>();
  for (const tx of transactions) {
    if (!tx.occurred_on.startsWith(`${month}-`)) continue;
    if (tx.kind !== 'expense' && tx.kind !== 'refund') continue;
    const cur = byDay.get(tx.occurred_on) ?? {
      gross: new Decimal(0),
      refunds: new Decimal(0),
      count: 0,
    };
    const amt = new Decimal(tx.amount || 0);
    if (tx.kind === 'expense') {
      cur.gross = cur.gross.plus(amt);
      cur.count += 1;
    } else {
      cur.refunds = cur.refunds.plus(amt);
    }
    byDay.set(tx.occurred_on, cur);
  }

  const points: DailySpendPoint[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const entry = byDay.get(date);
    const gross = entry ? Number(entry.gross.toFixed(2)) : 0;
    const refunds = entry ? Number(entry.refunds.toFixed(2)) : 0;
    const net = Math.max(0, Number(new Decimal(gross).minus(refunds).toFixed(2)));
    points.push({
      date,
      day,
      gross,
      refunds,
      net,
      amount: mode === 'net' ? net : gross,
      expenseCount: entry?.count ?? 0,
    });
  }
  return points;
}

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  income: number;
  grossSpend: number;
  netSpend: number;
}

export function computeMonthlyTrend(
  transactions: FinanceTransactionRow[],
  anchorMonth: string,
  monthsCount: number = 6
): MonthlyTrendPoint[] {
  const points: MonthlyTrendPoint[] = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const m = shiftMonth(anchorMonth, -i);
    const summary = computeMonthlySpendAnalytics(transactions, m);
    const [yr, mo] = m.split('-').map(Number);
    const shortLabel = new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(yr, mo - 1, 1)));
    points.push({
      month: m,
      label: shortLabel,
      income: summary.income,
      grossSpend: summary.grossSpend,
      netSpend: summary.netSpend,
    });
  }
  return points;
}

export interface BudgetStatusRow {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'ok' | 'warning' | 'over';
  color: string;
}

export function computeBudgetStatuses(
  budgets: FinanceCategoryBudgetMap,
  transactions: FinanceTransactionRow[],
  month: string,
  mode: 'gross' | 'net' = 'gross'
): BudgetStatusRow[] {
  const categorySpend = computeCategorySpending(transactions, month, mode);
  const spendMap = new Map(
    categorySpend.map((c) => [c.category.toLowerCase(), mode === 'net' ? c.net : c.gross])
  );

  return Object.entries(budgets)
    .filter(([, limit]) => Number(limit) > 0)
    .map(([category, limit]) => {
      const cap = Number(limit);
      const spent = spendMap.get(category.toLowerCase()) ?? 0;
      const remaining = Number(new Decimal(cap).minus(spent).toFixed(2));
      const percentage = cap > 0 ? Number(((spent / cap) * 100).toFixed(1)) : 0;
      const status: BudgetStatusRow['status'] =
        percentage > 100 ? 'over' : percentage >= 80 ? 'warning' : 'ok';

      return {
        category,
        budget: cap,
        spent,
        remaining,
        percentage,
        status,
        color: CATEGORY_COLOR_MAP[category] || '#10b981',
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
}

export function computeTopMerchants(
  transactions: FinanceTransactionRow[],
  month: string,
  limit: number = 6
): Array<{ merchant: string; total: number; count: number }> {
  const map = new Map<string, { total: DecimalNum; count: number }>();
  for (const tx of transactions) {
    if (!tx.occurred_on.startsWith(`${month}-`) || tx.kind !== 'expense') continue;
    const label = (tx.merchant || tx.description || 'Unknown').trim();
    const cur = map.get(label) ?? { total: new Decimal(0), count: 0 };
    cur.total = cur.total.plus(tx.amount || 0);
    cur.count += 1;
    map.set(label, cur);
  }
  return Array.from(map.entries())
    .map(([merchant, val]) => ({
      merchant,
      total: Number(val.total.toFixed(2)),
      count: val.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function calculateFdMaturity(params: {
  principal: number;
  annualRatePercent: number;
  tenureMonths: number;
  compoundingFrequency?: 'quarterly' | 'monthly' | 'yearly' | 'simple';
}): {
  maturityAmount: number;
  interestEarned: number;
} {
  const { principal, annualRatePercent, tenureMonths, compoundingFrequency = 'quarterly' } = params;
  if (principal <= 0 || annualRatePercent < 0 || tenureMonths <= 0) {
    return { maturityAmount: principal, interestEarned: 0 };
  }
  const years = tenureMonths / 12;
  const r = annualRatePercent / 100;

  let maturity = principal;
  if (compoundingFrequency === 'simple') {
    maturity = principal * (1 + r * years);
  } else {
    const n = compoundingFrequency === 'monthly' ? 12 : compoundingFrequency === 'yearly' ? 1 : 4;
    maturity = principal * Math.pow(1 + r / n, n * years);
  }

  const maturityAmount = Number(new Decimal(maturity).toFixed(2));
  const interestEarned = Number(new Decimal(maturityAmount).minus(principal).toFixed(2));
  return { maturityAmount, interestEarned };
}

export function estimatedFdAccruedToday(fd: FinanceFDRow, asOf: string = todayIST()): number {
  const start = Date.parse(`${fd.opening_date}T00:00:00Z`);
  const maturity = Date.parse(`${fd.maturity_date}T00:00:00Z`);
  const end = Math.min(Date.parse(`${asOf.slice(0, 10)}T00:00:00Z`), maturity);
  if (!Number.isFinite(start) || !Number.isFinite(end) || maturity <= start) {
    return Number(fd.principal) || 0;
  }
  const totalDays = Math.max(1, (maturity - start) / 86400000);
  const elapsedDays = Math.max(0, (end - start) / 86400000);
  const totalGain = Math.max(0, Number(fd.maturity_amount) - Number(fd.principal));
  const accrued = Number(fd.principal) + totalGain * (elapsedDays / totalDays);
  return Number(new Decimal(accrued).toFixed(2));
}

export function generateEmiInstallmentSchedule(params: {
  financedPrincipal: number;
  annualInterestRate: number;
  durationMonths: number;
  monthlyEmi: number;
  firstDueDate: string;
}): EmiInstallmentItem[] {
  const { financedPrincipal, annualInterestRate, durationMonths, monthlyEmi, firstDueDate } = params;
  const schedule: EmiInstallmentItem[] = [];
  let balance = new Decimal(financedPrincipal);
  const monthlyRate = new Decimal(annualInterestRate).div(100).div(12);
  const emi = new Decimal(monthlyEmi);

  const [y, m, d] = firstDueDate.split('-').map(Number);

  for (let i = 0; i < durationMonths; i++) {
    const dueObj = new Date(Date.UTC(y || 2026, (m || 1) - 1 + i, d || 5));
    const dueDate = dueObj.toISOString().slice(0, 10);

    const interest =
      annualInterestRate > 0 ? balance.times(monthlyRate) : new Decimal(0);
    const roundedInterest = Number(interest.toFixed(2));

    const principalComp =
      i === durationMonths - 1
        ? Number(balance.toFixed(2))
        : Math.min(
            Number(balance.toFixed(2)),
            Math.max(0, Number(emi.minus(roundedInterest).toFixed(2)))
          );
    const totalDue =
      i === durationMonths - 1
        ? Number(new Decimal(principalComp).plus(roundedInterest).toFixed(2))
        : Number(emi.toFixed(2));

    balance = Decimal.max(0, balance.minus(principalComp));

    schedule.push({
      number: i + 1,
      dueDate,
      emiAmount: totalDue,
      principalComponent: principalComp,
      interestComponent: roundedInterest,
      status: 'pending',
      paidOn: null,
    });
  }

  return schedule;
}

export function computeEmiAgreementsSummary(agreements: FinanceEmiAgreementItem[]) {
  let principalOutstanding = new Decimal(0);
  let monthlyCommitment = new Decimal(0);
  let totalRemainingPayable = new Decimal(0);
  let activeCount = 0;

  for (const ag of agreements) {
    if (ag.status === 'active') activeCount += 1;
    const unpaid = ag.schedule.filter((s) => s.status === 'pending');
    if (unpaid.length > 0 && ag.status === 'active') {
      monthlyCommitment = monthlyCommitment.plus(ag.monthly_emi);
    }
    for (const item of unpaid) {
      principalOutstanding = principalOutstanding.plus(item.principalComponent);
      totalRemainingPayable = totalRemainingPayable.plus(item.emiAmount);
    }
  }

  return {
    activeCount,
    principalOutstanding: Number(principalOutstanding.toFixed(2)),
    monthlyCommitment: Number(monthlyCommitment.toFixed(2)),
    totalRemainingPayable: Number(totalRemainingPayable.toFixed(2)),
  };
}

export function computePersonalLoansSummary(loans: FinancePersonalLoanItem[]) {
  let totalReceivable = new Decimal(0);
  let totalPayable = new Decimal(0);
  let activeLentCount = 0;
  let activeBorrowedCount = 0;

  for (const loan of loans) {
    if (loan.status === 'settled' || loan.outstanding <= 0) continue;
    if (loan.direction === 'lent') {
      totalReceivable = totalReceivable.plus(loan.outstanding);
      activeLentCount += 1;
    } else {
      totalPayable = totalPayable.plus(loan.outstanding);
      activeBorrowedCount += 1;
    }
  }

  const receivable = Number(totalReceivable.toFixed(2));
  const payable = Number(totalPayable.toFixed(2));

  return {
    totalReceivable: receivable,
    totalPayable: payable,
    netPosition: Number(totalReceivable.minus(totalPayable).toFixed(2)),
    activeLentCount,
    activeBorrowedCount,
  };
}

export function computeExpenseGroupSummary(group: FinanceExpenseGroupItem) {
  const ownerShare = group.shares
    .filter((s) => s.isOwner)
    .reduce((sum, s) => sum + Number(s.shareAmount || 0), 0);

  const participantTargets = new Map<string, number>();
  for (const s of group.shares) {
    if (!s.isOwner) {
      participantTargets.set(
        s.participant,
        (participantTargets.get(s.participant) ?? 0) + Number(s.shareAmount || 0)
      );
    }
  }

  let incomingSettled = 0;
  let outgoingSettled = 0;
  const participantPaid = new Map<string, number>();

  for (const st of group.settlements) {
    const amt = Number(st.amount || 0);
    if (st.direction === 'incoming') {
      incomingSettled += amt;
      participantPaid.set(st.counterparty, (participantPaid.get(st.counterparty) ?? 0) + amt);
    } else {
      outgoingSettled += amt;
      participantPaid.set(st.counterparty, (participantPaid.get(st.counterparty) ?? 0) + amt);
    }
  }

  const totalNonOwnerShare = Array.from(participantTargets.values()).reduce((a, b) => a + b, 0);
  const receivable = group.paid_by_owner
    ? Math.max(0, Number(new Decimal(totalNonOwnerShare).minus(incomingSettled).toFixed(2)))
    : 0;
  const payable = !group.paid_by_owner
    ? Math.max(0, Number(new Decimal(ownerShare).minus(outgoingSettled).toFixed(2)))
    : 0;

  return {
    ownerShare: Number(ownerShare.toFixed(2)),
    totalNonOwnerShare: Number(totalNonOwnerShare.toFixed(2)),
    incomingSettled: Number(incomingSettled.toFixed(2)),
    outgoingSettled: Number(outgoingSettled.toFixed(2)),
    receivable,
    payable,
    isSettled: receivable <= 0 && payable <= 0,
    participantBalances: Array.from(participantTargets.entries()).map(([participant, share]) => {
      const settled = participantPaid.get(participant) ?? 0;
      const remaining = Math.max(0, Number(new Decimal(share).minus(settled).toFixed(2)));
      return { participant, share, settled, remaining };
    }),
  };
}
