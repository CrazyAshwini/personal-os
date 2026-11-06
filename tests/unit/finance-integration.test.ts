import { describe, it, expect } from 'vitest';
import {
  connectFinanceSchema,
  syncExpenseManagerData,
} from '@/lib/integrations/expense-manager';

describe('Finance Integration & Expense Manager Client', () => {
  it('validates connection parameters schema', () => {
    const valid = {
      apiEndpoint: 'https://expense.example.com',
      apiKey: 'secret_token_123',
    };
    expect(connectFinanceSchema.safeParse(valid).success).toBe(true);

    const invalid = {
      apiEndpoint: 'not-a-url',
      apiKey: '',
    };
    expect(connectFinanceSchema.safeParse(invalid).success).toBe(false);
  });

  it('handles disconnected state gracefully when endpoint is omitted', async () => {
    const result = await syncExpenseManagerData(null);
    expect(result.success).toBe(false);
    expect(result.status).toBe('disconnected');
    expect(result.monthlySpend).toBe(0);
    expect(result.error).toContain('not connected');
  });

  it('handles unreachable endpoints gracefully with timeout/error status', async () => {
    // Unreachable local port
    const result = await syncExpenseManagerData('http://127.0.0.1:54321');
    expect(result.success).toBe(false);
    expect(result.status).toBe('error');
    expect(result.error).toBeDefined();
  });
});
