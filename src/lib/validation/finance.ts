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
