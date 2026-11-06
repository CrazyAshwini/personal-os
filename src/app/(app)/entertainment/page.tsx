import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { EntertainmentView } from '@/features/entertainment/entertainment-view';

export const instant = false;

export default async function EntertainmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  const { data: mediaItems } = await supabase
    .from('media_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <EntertainmentView mediaItems={mediaItems || []} />
    </div>
  );
}
