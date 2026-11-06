import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { TravelView } from '@/features/travel/travel-view';

export const instant = false;

export default async function TravelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  const { data: journeys } = await supabase
    .from('journeys')
    .select('*')
    .eq('user_id', userId)
    .order('departure_time', { ascending: true });

  return (
    <div className="space-y-6">
      <TravelView journeys={journeys || []} />
    </div>
  );
}
