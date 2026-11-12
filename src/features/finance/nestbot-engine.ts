import type { NativeFinanceWorkspace } from './finance-types';
import {
  computeBudgetStatuses,
  computeCategorySpending,
  computeCreditUsage,
  computeExpenseGroupSummary,
  computeFinanceSummary,
  computeMonthlySpendAnalytics,
  computePersonalLoansSummary,
  formatDateIN,
  formatINR,
  todayIST,
} from './finance-calculations';
import { inferCategoryFromText } from './statement-import';

export interface NestBotMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
  suggestedPrompts?: string[];
}

export interface ParsedSmsTransactionDraft {
  amount: number;
  kind: 'expense' | 'income' | 'refund';
  merchant: string;
  description: string;
  category: string;
  occurredOn: string;
  accountHint: string | null;
}

export function parsePaymentSmsText(rawText: string): ParsedSmsTransactionDraft | null {
  const text = rawText.trim();
  if (!text) return null;

  const amtMatch = text.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amtMatch) return null;
  const amount = Number(amtMatch[1].replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const isRefund = /refund|reversed|cashback/i.test(text);
  const isCredit = /credited|received|deposited/i.test(text);
  const kind: ParsedSmsTransactionDraft['kind'] = isRefund
    ? 'refund'
    : isCredit
      ? 'income'
      : 'expense';

  const merchantMatch =
    text.match(/(?:at|to|towards|info[:\s-]+|vpa\s+)([a-z0-9 &._'-]{2,35})/i) ||
    text.match(/(?:from\s+)([a-z0-9 &._'-]{2,35})/i);
  const merchant = merchantMatch
    ? merchantMatch[1].replace(/\b(on|via|using|ref|utr|avl)\b.*$/i, '').trim()
    : 'UPI / Card Payment';

  const accHintMatch = text.match(/(?:xx|x+|\*{2,}|ending\s*)(\d{4})/i);
  const accountHint = accHintMatch ? accHintMatch[1] : null;

  let occurredOn = todayIST();
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const dmyMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (isoMatch) {
    occurredOn = isoMatch[1];
  } else if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    let year = Number(dmyMatch[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      occurredOn = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const category = inferCategoryFromText(`${merchant} ${text}`, kind);
  const description = merchant ? `${merchant} (${kind === 'refund' ? 'Refund' : 'SMS/UPI'})` : 'SMS/UPI Transaction';

  return {
    amount,
    kind,
    merchant: merchant || 'Merchant',
    description,
    category,
    occurredOn,
    accountHint,
  };
}

export const NESTBOT_QUICK_PROMPTS = [
  'How much liquid money do I have?',
  'What did I spend this month?',
  'Show my credit card & Pay Later status',
  'Which bills are due soon?',
  'Check my category budgets',
  'Who owes me money / personal loans?',
];

export function answerFinanceQuestion(
  question: string,
  workspace: NativeFinanceWorkspace,
  activeMonth: string
): string {
  const q = question.toLowerCase().trim();
  const summary = computeFinanceSummary(
    workspace.accounts,
    workspace.transactions,
    workspace.fixedDeposits,
    workspace.loans
  );
  const monthly = computeMonthlySpendAnalytics(workspace.transactions, activeMonth);
  const categories = computeCategorySpending(workspace.transactions, activeMonth, 'gross');
  const snapshots = workspace.snapshots || [];

  if (q.includes('how much money') || q.includes('balance') || q.includes('liquid') || q.includes('net worth')) {
    const bankWallets = workspace.accounts.filter(
      (a) => a.active && (a.kind === 'bank' || a.kind === 'wallet')
    );
    const lines = bankWallets.map(
      (a) => `• ${a.name} (${a.institution} ••••${a.masked_suffix}): ${formatINR(a.balance)}`
    );
    return [
      `Liquid Cash across ${bankWallets.length} active account(s): ${formatINR(summary.totalLiquidCash)}`,
      `Net Worth (including ${formatINR(summary.totalInvestments)} FDs minus debt): ${formatINR(summary.netWorth)}`,
      lines.length > 0 ? '\nAccounts:\n' + lines.join('\n') : '\nNo bank or wallet accounts added yet.',
    ].join('\n');
  }

  if (q.includes('spend') || q.includes('expense') || q.includes('month')) {
    const topCats = categories
      .slice(0, 4)
      .map((c) => `• ${c.category}: ${formatINR(c.gross)} (${c.percentage}%)`)
      .join('\n');
    return [
      `Spending summary for ${activeMonth}:`,
      `• Gross Spend: ${formatINR(monthly.grossSpend)} (${monthly.expenseCount} txns)`,
      `• Matched Refunds: -${formatINR(monthly.refunds)}`,
      `• Net Spend: ${formatINR(monthly.netSpend)}`,
      `• Monthly Income: ${formatINR(monthly.income)} | Net Saved: ${formatINR(monthly.savings)}`,
      topCats ? `\nTop Categories:\n${topCats}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (q.includes('credit') || q.includes('card') || q.includes('pay later') || q.includes('utilization') || q.includes('limit')) {
    const debtAccounts = workspace.accounts.filter(
      (a) => a.active && (a.kind === 'credit_card' || a.kind === 'pay_later')
    );
    if (debtAccounts.length === 0) {
      return 'No active Credit Cards or Pay Later accounts found in your workspace.';
    }
    const lines = debtAccounts.map((a) => {
      const usage = computeCreditUsage(a, snapshots);
      const availStr = usage.availableCredit !== null ? formatINR(usage.availableCredit) : 'Limit not set';
      const utilStr = usage.utilizationPercent !== null ? `${usage.utilizationPercent}% (${usage.band})` : 'N/A';
      return `• ${a.name} (••••${a.masked_suffix}): Used ${formatINR(usage.outstanding)} | Available: ${availStr} | Utilization: ${utilStr}`;
    });
    return `Credit & Pay Later Summary (Total Debt: ${formatINR(summary.totalCreditDebt)}):\n${lines.join('\n')}`;
  }

  if (q.includes('bill') || q.includes('due') || q.includes('emi')) {
    const pendingBills = workspace.bills
      .filter((b) => b.status !== 'paid')
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    const emiLines = workspace.loans
      .filter((l) => l.remaining_emis > 0)
      .map((l) => `• ${l.name} (${l.lender}): ${formatINR(l.monthly_emi)}/mo (${l.remaining_emis} left, due day ${l.due_day})`);

    const billLines = pendingBills.map(
      (b) => `• ${b.name}: ${formatINR(b.amount)} due ${formatDateIN(b.due_date)} [${b.status.toUpperCase()}]`
    );

    if (billLines.length === 0 && emiLines.length === 0) {
      return 'All tracked bills and loan EMIs are up to date!';
    }
    return [
      billLines.length ? `Pending Bills (${billLines.length}):\n${billLines.join('\n')}` : '',
      emiLines.length ? `\nActive Loan EMIs (${emiLines.length}):\n${emiLines.join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (q.includes('budget')) {
    const statuses = computeBudgetStatuses(
      workspace.budgets || {},
      workspace.transactions,
      activeMonth,
      'gross'
    );
    if (statuses.length === 0) {
      return 'No category budgets configured yet. Open the Analytics tab and click "Configure Budgets" to set monthly spending caps.';
    }
    const lines = statuses.map(
      (b) =>
        `• ${b.category}: ${formatINR(b.spent)} / ${formatINR(b.budget)} (${b.percentage}% — ${b.status === 'over' ? 'OVER BUDGET' : b.status === 'warning' ? 'Near limit' : `${formatINR(b.remaining)} left`})`
    );
    return `Category Budgets for ${activeMonth}:\n${lines.join('\n')}`;
  }

  if (q.includes('loan') || q.includes('owe') || q.includes('lent') || q.includes('borrow') || q.includes('split')) {
    const plSummary = computePersonalLoansSummary(workspace.personalLoans || []);
    const groups = workspace.expenseGroups || [];
    let groupRecv = 0;
    let groupPay = 0;
    for (const g of groups) {
      const gs = computeExpenseGroupSummary(g);
      groupRecv += gs.receivable;
      groupPay += gs.payable;
    }

    return [
      'People, Personal Loans & Split Bills Summary:',
      `• Money Lent (Owed to you): ${formatINR(plSummary.totalReceivable)} across ${plSummary.activeLentCount} active loan(s)`,
      `• Money Borrowed (You owe): ${formatINR(plSummary.totalPayable)} across ${plSummary.activeBorrowedCount} active loan(s)`,
      `• Split Bills Receivable: ${formatINR(groupRecv)} | Split Bills Payable: ${formatINR(groupPay)}`,
      `• Institutional Loan Debt: ${formatINR(summary.totalLoanOutstanding)}`,
    ].join('\n');
  }

  if (q.includes('fd') || q.includes('deposit') || q.includes('invest')) {
    if (workspace.fixedDeposits.length === 0) {
      return 'No Fixed Deposits recorded yet.';
    }
    const totalMat = workspace.fixedDeposits.reduce((s, f) => s + Number(f.maturity_amount), 0);
    const lines = workspace.fixedDeposits.map(
      (f) => `• ${f.name} (${f.institution}): ${formatINR(f.principal)} @ ${f.interest_rate}% -> ${formatINR(f.maturity_amount)} on ${formatDateIN(f.maturity_date)}`
    );
    return `Fixed Deposits (${formatINR(summary.totalInvestments)} principal -> ${formatINR(totalMat)} maturity):\n${lines.join('\n')}`;
  }

  return [
    `Here is your snapshot for ${activeMonth}:`,
    `• Net Worth: ${formatINR(summary.netWorth)} | Liquid Cash: ${formatINR(summary.totalLiquidCash)}`,
    `• Month Spend (Net): ${formatINR(monthly.netSpend)} | Income: ${formatINR(monthly.income)}`,
    `• Credit Debt: ${formatINR(summary.totalCreditDebt)} | Pending Bills: ${workspace.bills.filter((b) => b.status !== 'paid').length}`,
    `Try asking about balances, credit utilization, monthly spending, category budgets, FDs, or personal loans.`,
  ].join('\n');
}
