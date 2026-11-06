import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { FinanceView } from '@/features/finance/finance-view';

export const instant = false;

export default async function FinancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  const { data: connection } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'expense_manager')
    .maybeSingle();

  return (
    <div className="space-y-6">
      <FinanceView connection={connection || null} />
    </div>
  );
}
