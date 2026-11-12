import Decimal from 'decimal.js';
import type {
  FinanceAccountRow,
  FinanceTransactionRow,
  NativeFinanceWorkspace,
} from './finance-types';
import { MONEY_NEST_CATEGORIES } from './finance-types';

export interface ParsedStatementCandidate {
  id: string;
  rowNumber: number;
  occurredOn: string;
  description: string;
  merchant: string | null;
  category: string;
  kind: 'expense' | 'income' | 'transfer' | 'bill_payment' | 'refund';
  amount: number;
  accountId: string | null;
  toAccountId: string | null;
  externalReference: string | null;
  status: 'new' | 'possible_duplicate' | 'needs_review';
  selected: boolean;
  warnings: string[];
  errors: string[];
}

export interface StatementImportReview {
  fileName: string;
  candidates: ParsedStatementCandidate[];
  errors: string[];
}

function readCsvRows(input: string): string[][] {
  const source = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\r' || ch === '\n') {
      row.push(field.trim());
      field = '';
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      if (ch === '\r' && source[i + 1] === '\n') i++;
    } else if (ch === '"' && field === '') {
      inQuotes = true;
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell !== '')) rows.push(row);
  }
  return rows;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function parseFlexibleDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function parseAmountValue(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₹$,\s]/g, '').replace(/cr|dr/gi, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.abs(Number(new Decimal(n).toFixed(2))) : 0;
}

export function inferCategoryFromText(text: string, kind: string): string {
  if (kind === 'income') return 'Salary';
  if (kind === 'bill_payment') return 'Credit Card Payment';
  if (kind === 'transfer') return 'Own Account Transfer';
  if (kind === 'refund') return 'Purchase Refund';

  const t = text.toLowerCase();
  if (/swiggy|zomato|cafe|coffee|restaurant|biryani|pizza|burger|tea|chai/.test(t)) return 'Food';
  if (/blinkit|zepto|instamart|bigbasket|dmart|grocery|supermarket|milk|fruit/.test(t)) return 'Groceries';
  if (/uber|ola|rapido|metro|irctc|petrol|fuel|shell|fastag|flight|indigo/.test(t)) return 'Transport';
  if (/electricity|bescom|jio|airtel|broadband|wifi|recharge|gas|water|bill/.test(t)) return 'Bills & Utilities';
  if (/amazon|flipkart|myntra|ajio|nykaa|mall|store|ikea|decathlon/.test(t)) return 'Shopping';
  if (/netflix|spotify|youtube|apple|prime|hotstar|chatgpt|openai|icloud/.test(t)) return 'Subscriptions';
  if (/pharmacy|apollo|1mg|pharmeasy|hospital|clinic|doctor|medplus/.test(t)) return 'Health';
  if (/pvr|inox|bookmyshow|movie|cinema|steam|playstation/.test(t)) return 'Entertainment';
  if (/book|udemy|coursera|tuition|college|exam|stationery/.test(t)) return 'Education';
  if (/rent|maintenance|house|nobroker/.test(t)) return 'Housing';

  return 'Others';
}

export function parseStatementCsv(
  csvText: string,
  accounts: FinanceAccountRow[],
  existingTransactions: FinanceTransactionRow[],
  options: { fileName?: string; defaultAccountId?: string | null } = {}
): StatementImportReview {
  const fileName = options.fileName || 'statement.csv';
  const rows = readCsvRows(csvText);

  if (rows.length === 0) {
    return { fileName, candidates: [], errors: ['CSV is empty.'] };
  }
  if (rows.length === 1) {
    return { fileName, candidates: [], errors: ['CSV only contains headers and no transaction rows.'] };
  }

  const headers = rows[0].map(normalizeHeader);
  const colIndex = (aliases: string[]): number =>
    headers.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));

  const dateCol = colIndex(['date', 'txn_date', 'transaction_date', 'value_date', 'occurred_on']);
  const descCol = colIndex(['description', 'narration', 'particulars', 'details', 'remark', 'memo']);
  const amountCol = colIndex(['amount', 'amt', 'transaction_amount', 'value']);
  const debitCol = colIndex(['debit', 'withdrawal', 'dr', 'paid_out']);
  const creditCol = colIndex(['credit', 'deposit', 'cr', 'paid_in']);
  const typeCol = colIndex(['type', 'kind', 'dr_cr']);
  const categoryCol = colIndex(['category', 'cat']);
  const merchantCol = colIndex(['merchant', 'payee', 'vendor', 'seller']);
  const accountCol = colIndex(['account', 'account_name', 'card']);
  const refCol = colIndex(['reference', 'ref', 'utr', 'external_reference', 'txn_id']);

  const errors: string[] = [];
  if (dateCol === -1) errors.push('Missing a Date column (e.g. date, txn_date).');
  if (descCol === -1) errors.push('Missing a Description column (e.g. description, narration).');
  if (amountCol === -1 && debitCol === -1 && creditCol === -1) {
    errors.push('Missing an Amount, Debit, or Credit column.');
  }
  if (errors.length > 0) {
    return { fileName, candidates: [], errors };
  }

  const candidates: ParsedStatementCandidate[] = [];

  for (let i = 1; i < rows.length && i <= 1000; i++) {
    const cells = rows[i];
    const rowErrors: string[] = [];
    const warnings: string[] = [];

    const rawDate = cells[dateCol] || '';
    const occurredOn = parseFlexibleDate(rawDate);
    if (!occurredOn) {
      rowErrors.push(`Invalid date "${rawDate}".`);
    }

    const description = (cells[descCol] || '').trim();
    if (!description) {
      rowErrors.push('Description is empty.');
    }

    let amount = amountCol !== -1 ? parseAmountValue(cells[amountCol]) : 0;
    const debitAmt = debitCol !== -1 ? parseAmountValue(cells[debitCol]) : 0;
    const creditAmt = creditCol !== -1 ? parseAmountValue(cells[creditCol]) : 0;

    let kind: ParsedStatementCandidate['kind'] = 'expense';
    const rawType = typeCol !== -1 ? (cells[typeCol] || '').toLowerCase().trim() : '';

    if (debitAmt > 0 && creditAmt === 0) {
      amount = debitAmt;
      kind = 'expense';
    } else if (creditAmt > 0 && debitAmt === 0) {
      amount = creditAmt;
      kind = /refund|reversal|cashback/i.test(description) ? 'refund' : 'income';
    } else if (rawType) {
      if (['income', 'cr', 'credit', 'deposit'].includes(rawType)) kind = 'income';
      else if (['refund', 'reversal'].includes(rawType)) kind = 'refund';
      else if (['transfer', 'self'].includes(rawType)) kind = 'transfer';
      else if (['bill_payment', 'cc_payment', 'card_payment'].includes(rawType)) kind = 'bill_payment';
      else kind = 'expense';
    } else if (amountCol !== -1 && (cells[amountCol] || '').trim().startsWith('+')) {
      kind = 'income';
    } else if (/refund|cashback/i.test(description)) {
      kind = 'refund';
    }

    if (amount <= 0) {
      rowErrors.push('Amount must be greater than zero.');
    }

    let matchedAccountId: string | null = options.defaultAccountId ?? accounts[0]?.id ?? null;
    if (accountCol !== -1 && cells[accountCol]) {
      const targetName = cells[accountCol].toLowerCase().trim();
      const found = accounts.find(
        (a) =>
          a.name.toLowerCase() === targetName ||
          a.masked_suffix === targetName ||
          a.name.toLowerCase().includes(targetName)
      );
      if (found) matchedAccountId = found.id;
    }

    const rawCategory = categoryCol !== -1 ? (cells[categoryCol] || '').trim() : '';
    const validCat =
      MONEY_NEST_CATEGORIES.find((c) => c.toLowerCase() === rawCategory.toLowerCase()) ||
      inferCategoryFromText(description, kind);

    const merchant = merchantCol !== -1 && cells[merchantCol] ? cells[merchantCol].trim() : null;
    const externalReference = refCol !== -1 && cells[refCol] ? cells[refCol].trim() : null;

    // Duplicate detection against existing transactions
    const isDuplicate = existingTransactions.some((ex) => {
      if (externalReference && ex.notes?.includes(externalReference)) return true;
      return (
        ex.occurred_on === occurredOn &&
        Math.abs(Number(ex.amount) - amount) < 0.01 &&
        ex.kind === kind &&
        (ex.description.toLowerCase().trim() === description.toLowerCase().trim() ||
          ex.description.toLowerCase().includes(description.toLowerCase().slice(0, 12)))
      );
    });

    if (isDuplicate) {
      warnings.push('Possible duplicate of an existing ledger entry.');
    }

    const status: ParsedStatementCandidate['status'] =
      rowErrors.length > 0 ? 'needs_review' : isDuplicate ? 'possible_duplicate' : 'new';

    candidates.push({
      id: `imp-${i}-${Math.random().toString(36).slice(2, 7)}`,
      rowNumber: i + 1,
      occurredOn: occurredOn || new Date().toISOString().slice(0, 10),
      description: description || 'Imported Transaction',
      merchant,
      category: validCat,
      kind,
      amount,
      accountId: matchedAccountId,
      toAccountId: null,
      externalReference,
      status,
      selected: status === 'new',
      warnings,
      errors: rowErrors,
    });
  }

  return { fileName, candidates, errors: [] };
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTransactionsToCsv(
  transactions: FinanceTransactionRow[],
  accounts: FinanceAccountRow[]
): string {
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));
  const header = [
    'date',
    'type',
    'amount',
    'currency',
    'category',
    'description',
    'merchant',
    'account',
    'to_account',
    'notes',
  ].join(',');

  const lines = transactions.map((tx) =>
    [
      tx.occurred_on,
      tx.kind,
      Number(tx.amount).toFixed(2),
      tx.currency || 'INR',
      tx.category,
      tx.description,
      tx.merchant || '',
      tx.account_id ? accMap.get(tx.account_id) || '' : '',
      tx.to_account_id ? accMap.get(tx.to_account_id) || '' : '',
      tx.notes || '',
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return [header, ...lines].join('\r\n');
}

export function exportWorkspaceJson(workspace: NativeFinanceWorkspace): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: 'Personal OS',
      workspace,
    },
    null,
    2
  );
}
