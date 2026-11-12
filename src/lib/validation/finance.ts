import { z } from 'zod';

export const createFinanceAccountSchema = z.object({
  name: z.string().trim().min(2, 'Account name must be at least 2 characters').max(50),
  institution: z.string().trim().min(2, 'Institution name is required').max(50),
  kind: z.enum(['bank', 'wallet', 'credit_card', 'pay_later']),
  maskedSuffix: z.string().trim().min(2).max(6),
  balance: z.number(),
  creditLimit: z.number().nullable().optional(),
  billingDay: z.number().min(1).max(31).nullable().optional(),
  dueDay: z.number().min(1).max(31).nullable().optional(),
  accent: z.string().optional(),
  notes: z.string().max(250).optional(),
});

export type CreateFinanceAccountInput = z.infer<typeof createFinanceAccountSchema>;

export const createFinanceTransactionSchema = z.object({
  accountId: z.string().uuid().nullable().optional(),
  toAccountId: z.string().uuid().nullable().optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string(),
  kind: z.enum(['expense', 'income', 'transfer', 'bill_payment', 'refund']),
  category: z.string().min(1, 'Category is required'),
  description: z.string().trim().min(2, 'Description must be at least 2 characters').max(150),
  merchant: z.string().max(80).optional(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  notes: z.string().max(250).optional(),
});

export type CreateFinanceTransactionInput = z.infer<typeof createFinanceTransactionSchema>;

export const createFinanceBillSchema = z.object({
  accountId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2, 'Bill name is required').max(80),
  amount: z.number().positive('Bill amount must be positive'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format'),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  category: z.string(),
  notes: z.string().max(250).optional(),
});

export type CreateFinanceBillInput = z.infer<typeof createFinanceBillSchema>;

export const createFinanceFDSchema = z.object({
  name: z.string().trim().min(2, 'Deposit name is required').max(80),
  institution: z.string().trim().min(2, 'Institution is required').max(80),
  principal: z.number().positive('Principal must be positive'),
  interestRate: z.number().positive('Interest rate must be positive'),
  openingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Opening date must be in YYYY-MM-DD format'),
  maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Maturity date must be in YYYY-MM-DD format'),
  maturityAmount: z.number().positive('Maturity amount must be positive'),
  payoutMethod: z.string(),
});

export type CreateFinanceFDInput = z.infer<typeof createFinanceFDSchema>;

export const createFinanceLoanSchema = z.object({
  name: z.string().trim().min(2, 'Loan name is required').max(80),
  lender: z.string().trim().min(2, 'Lender name is required').max(80),
  principal: z.number().positive('Principal must be positive'),
  outstanding: z.number().min(0, 'Outstanding must be 0 or more'),
  interestRate: z.number().nullable().optional(),
  monthlyEmi: z.number().positive('Monthly EMI must be positive'),
  totalEmis: z.number().int().positive('Total EMIs must be positive'),
  remainingEmis: z.number().int().min(0, 'Remaining EMIs must be 0 or more'),
  dueDay: z.number().min(1).max(31),
  disbursedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreateFinanceLoanInput = z.infer<typeof createFinanceLoanSchema>;

export const updateFinanceAccountSchema = createFinanceAccountSchema.extend({
  id: z.string().uuid(),
  active: z.boolean().optional(),
});

export type UpdateFinanceAccountInput = z.infer<typeof updateFinanceAccountSchema>;

export const updateFinanceTransactionSchema = createFinanceTransactionSchema.extend({
  id: z.string().uuid(),
});

export type UpdateFinanceTransactionInput = z.infer<typeof updateFinanceTransactionSchema>;

export const accountSnapshotSchema = z.object({
  accountId: z.string().uuid(),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  balance: z.number().nullable().optional(),
  outstanding: z.number().nullable().optional(),
  availableCredit: z.number().nullable().optional(),
  billedAmount: z.number().nullable().optional(),
  unbilledAmount: z.number().nullable().optional(),
  source: z.string().max(40).optional(),
  notes: z.string().max(250).nullable().optional(),
});

export type AccountSnapshotInput = z.infer<typeof accountSnapshotSchema>;

export const categoryBudgetSchema = z.object({
  category: z.string().trim().min(1).max(60),
  monthlyLimit: z.number().positive('Budget limit must be positive'),
});

export type CategoryBudgetInput = z.infer<typeof categoryBudgetSchema>;

export const personalLoanSchema = z.object({
  direction: z.enum(['lent', 'borrowed']),
  personName: z.string().trim().min(1, 'Person name is required').max(80),
  principal: z.number().positive('Principal must be positive'),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  accountId: z.string().uuid().nullable().optional(),
  notes: z.string().max(250).nullable().optional(),
});

export type PersonalLoanInput = z.infer<typeof personalLoanSchema>;

export const personalLoanRepaymentSchema = z.object({
  loanId: z.string().min(1),
  amount: z.number().positive('Repayment amount must be positive'),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accountId: z.string().uuid().nullable().optional(),
  note: z.string().max(200).optional(),
});

export type PersonalLoanRepaymentInput = z.infer<typeof personalLoanRepaymentSchema>;

export const expenseGroupParticipantSchema = z.object({
  participant: z.string().trim().min(1).max(80),
  shareAmount: z.number().min(0),
  isOwner: z.boolean().default(false),
});

export const expenseGroupSchema = z.object({
  name: z.string().trim().min(2, 'Group name is required').max(100),
  mode: z.enum(['split_bill', 'contribution_pool']),
  totalCost: z.number().positive('Total cost must be positive'),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paidByOwner: z.boolean().default(true),
  shares: z.array(expenseGroupParticipantSchema).min(1),
  notes: z.string().max(250).nullable().optional(),
});

export type ExpenseGroupInput = z.infer<typeof expenseGroupSchema>;

export const groupSettlementSchema = z.object({
  groupId: z.string().min(1),
  counterparty: z.string().trim().min(1).max(80),
  direction: z.enum(['incoming', 'outgoing']),
  amount: z.number().positive('Settlement amount must be positive'),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(200).optional(),
});

export type GroupSettlementInput = z.infer<typeof groupSettlementSchema>;

export const emiAgreementSchema = z.object({
  accountId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(2, 'EMI description is required').max(120),
  merchant: z.string().max(80).nullable().optional(),
  orderRef: z.string().max(80).nullable().optional(),
  financedPrincipal: z.number().positive('Principal must be positive'),
  annualInterestRate: z.number().min(0).max(100).default(0),
  processingFee: z.number().min(0).default(0),
  monthlyEmi: z.number().positive('Monthly EMI must be positive'),
  durationMonths: z.number().int().min(1).max(120),
  firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type EmiAgreementInput = z.infer<typeof emiAgreementSchema>;

export const financeOrderSchema = z.object({
  platform: z.string().trim().min(1, 'Platform is required').max(80),
  merchant: z.string().max(80).nullable().optional(),
  orderRef: z.string().max(80).nullable().optional(),
  description: z.string().trim().min(2, 'Order description is required').max(180),
  amount: z.number().min(0),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accountId: z.string().uuid().nullable().optional(),
  status: z.string().min(1).max(40).default('placed'),
  refundExpectedAmount: z.number().min(0).nullable().optional(),
  refundExpectedBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  refundStatus: z
    .enum(['none', 'expected', 'partial', 'confirmed', 'store_credit', 'rejected'])
    .default('none'),
  notes: z.string().max(250).nullable().optional(),
});

export type FinanceOrderInput = z.infer<typeof financeOrderSchema>;
