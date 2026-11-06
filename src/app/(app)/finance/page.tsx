import React from 'react';
import { getNativeFinanceWorkspaceAction } from '@/features/finance/native-actions';
import { NativeFinanceView } from '@/features/finance/native-finance-view';

export const instant = false;

export default async function FinancePage() {
  const result = await getNativeFinanceWorkspaceAction();

  const workspace = result.data || {
    accounts: [],
    transactions: [],
    bills: [],
    fixedDeposits: [],
    loans: [],
  };

  return (
    <div className="space-y-6">
      <NativeFinanceView initialWorkspace={workspace} />
    </div>
  );
}
