import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { SettingsView } from '@/features/settings/settings-view';
import { getUserPreferencesAction } from '@/features/settings/actions';

export const instant = false;

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const prefsRes = await getUserPreferencesAction();
  const preferences = prefsRes.data || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings & Preferences
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure notification rules, study durations, timezone, and security.
        </p>
      </div>

      <SettingsView
        preferences={preferences}
        userEmail={user?.email || ''}
        userName={user?.user_metadata?.name || null}
      />
    </div>
  );
}
