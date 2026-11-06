-- Migration: 20261106001000_create_finance_integration_tables.sql
-- Description: Creates integration_connections table for read-only sync with Expense Manager

CREATE TABLE IF NOT EXISTS public.integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'expense_manager' CHECK (provider IN ('expense_manager', 'calendar_sync', 'custom')),
  api_endpoint TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'syncing')),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  cached_monthly_spend NUMERIC DEFAULT 0,
  cached_currency TEXT DEFAULT 'INR',
  cached_category_breakdown JSONB DEFAULT '{}'::jsonb,
  cached_recent_transactions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_user ON public.integration_connections(user_id);
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own integrations" ON public.integration_connections FOR ALL
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE TRIGGER set_integration_connections_updated_at BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
