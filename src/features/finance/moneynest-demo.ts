import {
  generateEmiInstallmentSchedule,
  todayIST,
} from './finance-calculations';
import type {
  FinanceAccountSnapshotItem,
  FinanceCategoryBudgetMap,
  FinanceEmiAgreementItem,
  FinanceExpenseGroupItem,
  FinanceOrderItem,
  FinancePersonalLoanItem,
} from './finance-types';

export interface ExtendedFinanceState {
  snapshots: FinanceAccountSnapshotItem[];
  budgets: FinanceCategoryBudgetMap;
  personalLoans: FinancePersonalLoanItem[];
  expenseGroups: FinanceExpenseGroupItem[];
  emiAgreements: FinanceEmiAgreementItem[];
  orders: FinanceOrderItem[];
}

export const EMPTY_EXTENDED_STATE: ExtendedFinanceState = {
  snapshots: [],
  budgets: {},
  personalLoans: [],
  expenseGroups: [],
  emiAgreements: [],
  orders: [],
};

const STORAGE_KEY_PREFIX = 'personal_os_moneynest_ext_v1:';
const EXT_EVENT = 'moneynest:ext-change';

export function parseLocalExtendedState(raw: string | null): ExtendedFinanceState {
  if (!raw) return EMPTY_EXTENDED_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<ExtendedFinanceState>;
    return {
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
      budgets: parsed.budgets && typeof parsed.budgets === 'object' ? parsed.budgets : {},
      personalLoans: Array.isArray(parsed.personalLoans) ? parsed.personalLoans : [],
      expenseGroups: Array.isArray(parsed.expenseGroups) ? parsed.expenseGroups : [],
      emiAgreements: Array.isArray(parsed.emiAgreements) ? parsed.emiAgreements : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    };
  } catch {
    return EMPTY_EXTENDED_STATE;
  }
}

export function loadLocalExtendedRaw(userId?: string): string {
  if (typeof window === 'undefined' || !userId) return '';
  try {
    return window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`) ?? '';
  } catch {
    return '';
  }
}

export function loadLocalExtendedState(userId?: string): ExtendedFinanceState {
  return parseLocalExtendedState(loadLocalExtendedRaw(userId) || null);
}

export function subscribeLocalExtendedState(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onStoreChange();
  window.addEventListener('storage', handler);
  window.addEventListener(EXT_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(EXT_EVENT, handler);
  };
}

export function saveLocalExtendedState(userId: string | undefined, state: ExtendedFinanceState) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(state));
    window.dispatchEvent(new Event(EXT_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

export function createDemoExtendedState(
  cardAccountId?: string | null,
  payLaterAccountId?: string | null,
  bankAccountId?: string | null
): ExtendedFinanceState {
  const today = todayIST();
  const addDays = (days: number) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const firstEmiDate = addDays(-25);
  const emiSchedule = generateEmiInstallmentSchedule({
    financedPrincipal: 30509.79,
    annualInterestRate: 18,
    durationMonths: 9,
    monthlyEmi: 3678.7,
    firstDueDate: firstEmiDate,
  });
  if (emiSchedule[0]) {
    emiSchedule[0].status = 'paid';
    emiSchedule[0].paidOn = addDays(-25);
  }

  const snapshots: FinanceAccountSnapshotItem[] = [];
  if (cardAccountId) {
    snapshots.push({
      id: crypto.randomUUID(),
      account_id: cardAccountId,
      as_of: addDays(-2),
      balance: null,
      outstanding: 18450,
      available_credit: 281550,
      billed_amount: 14200,
      unbilled_amount: 4250,
      source: 'statement',
      notes: 'Verified from latest HDFC statement cycle.',
    });
  }
  if (payLaterAccountId) {
    snapshots.push({
      id: crypto.randomUUID(),
      account_id: payLaterAccountId,
      as_of: addDays(-1),
      balance: null,
      outstanding: 2499,
      available_credit: 47501,
      billed_amount: 2499,
      unbilled_amount: 0,
      source: 'statement',
      notes: 'Amazon Pay Later monthly cycle check.',
    });
  }

  return {
    snapshots,
    budgets: {
      Food: 6000,
      Groceries: 8000,
      Housing: 20000,
      Utilities: 3500,
      Subscriptions: 2000,
      Transport: 3000,
      Shopping: 5000,
    },
    personalLoans: [
      {
        id: crypto.randomUUID(),
        direction: 'lent',
        person_name: 'Rohan Sharma',
        principal: 8000,
        outstanding: 5000,
        occurred_on: addDays(-12),
        due_date: addDays(18),
        account_id: bankAccountId || null,
        status: 'active',
        notes: 'Concert tickets + travel advance',
        repayments: [
          {
            id: crypto.randomUUID(),
            amount: 3000,
            occurredOn: addDays(-4),
            accountId: bankAccountId || null,
            note: 'Partial UPI settlement',
          },
        ],
      },
      {
        id: crypto.randomUUID(),
        direction: 'borrowed',
        person_name: 'Ananya Nair',
        principal: 2400,
        outstanding: 2400,
        occurred_on: addDays(-5),
        due_date: addDays(10),
        account_id: bankAccountId || null,
        status: 'active',
        notes: 'Team dinner split advance',
        repayments: [],
      },
    ],
    expenseGroups: [
      {
        id: crypto.randomUUID(),
        name: 'Coorg Weekend Trip',
        mode: 'split_bill',
        total_cost: 12000,
        occurred_on: addDays(-9),
        paid_by_owner: true,
        shares: [
          { participant: 'You', shareAmount: 4000, isOwner: true },
          { participant: 'Karthik', shareAmount: 4000, isOwner: false },
          { participant: 'Meera', shareAmount: 4000, isOwner: false },
        ],
        settlements: [
          {
            id: crypto.randomUUID(),
            counterparty: 'Meera',
            direction: 'incoming',
            amount: 4000,
            occurredOn: addDays(-6),
            note: 'Settled via GPay',
          },
        ],
        notes: 'Homestay + fuel split equally across 3.',
      },
    ],
    emiAgreements: [
      {
        id: crypto.randomUUID(),
        account_id: payLaterAccountId || cardAccountId || null,
        title: '43" 4K Smart TV + Soundbar',
        merchant: 'Amazon Retail',
        order_ref: '406-2479955-3587539',
        financed_principal: 30509.79,
        annual_interest_rate: 18,
        processing_fee: 360.02,
        monthly_emi: 3678.7,
        duration_months: 9,
        paid_installments: 1,
        first_due_date: firstEmiDate,
        schedule: emiSchedule,
        status: 'active',
      },
    ],
    orders: [
      {
        id: crypto.randomUUID(),
        platform: 'Amazon',
        merchant: 'Appario Retail',
        order_ref: '406-6855707-5582708',
        description: 'USB-C Mechanical Keyboard + Stand',
        amount: 4299,
        occurred_on: addDays(-7),
        account_id: cardAccountId || null,
        status: 'return_requested',
        refund_expected_amount: 1499,
        refund_expected_by: addDays(5),
        refund_received_amount: 0,
        refund_status: 'expected',
        notes: 'Returning laptop stand item only; partial refund awaited.',
      },
      {
        id: crypto.randomUUID(),
        platform: 'Swiggy',
        merchant: 'Social Cafe & Diner',
        order_ref: 'SWG-992841',
        description: 'Team lunch order',
        amount: 1450,
        occurred_on: addDays(-4),
        account_id: cardAccountId || null,
        status: 'delivered',
        refund_expected_amount: null,
        refund_expected_by: null,
        refund_received_amount: 0,
        refund_status: 'none',
        notes: null,
      },
    ],
  };
}
