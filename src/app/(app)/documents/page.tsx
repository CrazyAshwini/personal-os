import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { DocumentsView } from '@/features/documents/documents-view';

export const instant = false;

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <DocumentsView documents={documents || []} />
    </div>
  );
}
