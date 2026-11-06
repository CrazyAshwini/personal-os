'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  syncExpenseManagerData,
  connectFinanceSchema,
  type ConnectFinanceInput,
  type ExpenseManagerSyncResult,
} from '@/lib/integrations/expense-manager';
import type { Database } from '@/types/database';

export type IntegrationConnectionRow =
  Database['public']['Tables']['integration_connections']['Row'];

export type FinanceActionResult<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
};

export async function getFinanceIntegrationAction(): Promise<
  FinanceActionResult<IntegrationConnectionRow | null>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'expense_manager')
    .maybeSingle();

  if (error) return { error: error.message };

  return { success: true, data: data || null };
}

export async function connectFinanceAction(
  values: ConnectFinanceInput
): Promise<FinanceActionResult<ExpenseManagerSyncResult>> {
  const parsed = connectFinanceSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid connection data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  // Perform initial sync verification
  const syncResult = await syncExpenseManagerData(parsed.data.apiEndpoint, parsed.data.apiKey);

  const { error } = await supabase.from('integration_connections').upsert(
    {
      user_id: user.id,
      provider: 'expense_manager',
      api_endpoint: parsed.data.apiEndpoint,
      status: syncResult.status,
      last_sync_at: new Date().toISOString(),
      last_error: syncResult.error || null,
      cached_monthly_spend: syncResult.monthlySpend,
      cached_currency: syncResult.currency,
      cached_category_breakdown: syncResult.categoryBreakdown,
      cached_recent_transactions: syncResult.recentTransactions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider' }
  );

  if (error) return { error: error.message };

  revalidatePath('/finance');
  revalidatePath('/dashboard');
  return { success: true, data: syncResult };
}

export async function syncFinanceAction(): Promise<
  FinanceActionResult<ExpenseManagerSyncResult>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data: conn } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'expense_manager')
    .maybeSingle();

  if (!conn || !conn.api_endpoint) {
    return { error: 'Integration is not connected. Please connect first.' };
  }

  const syncResult = await syncExpenseManagerData(conn.api_endpoint);

  const { error } = await supabase
    .from('integration_connections')
    .update({
      status: syncResult.status,
      last_sync_at: new Date().toISOString(),
      last_error: syncResult.error || null,
      cached_monthly_spend: syncResult.monthlySpend,
      cached_currency: syncResult.currency,
      cached_category_breakdown: syncResult.categoryBreakdown,
      cached_recent_transactions: syncResult.recentTransactions,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conn.id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/finance');
  revalidatePath('/dashboard');
  return { success: true, data: syncResult };
}

export async function disconnectFinanceAction(): Promise<FinanceActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('integration_connections')
    .update({
      status: 'disconnected',
      api_endpoint: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('provider', 'expense_manager');

  if (error) return { error: error.message };

  revalidatePath('/finance');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function testRevocationAction(): Promise<FinanceActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  // Set status to error with simulated token revoked log
  const { error } = await supabase
    .from('integration_connections')
    .update({
      status: 'error',
      last_error: 'HTTP 401 Unauthorized: Expense Manager API token was revoked.',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('provider', 'expense_manager');

  if (error) return { error: error.message };

  revalidatePath('/finance');
  revalidatePath('/dashboard');
  return { success: true };
}
