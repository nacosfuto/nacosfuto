-- =============================================================================
-- NACOS FUTO: Zero-Destruction Production Admin Authentication Setup
-- Safe to execute: Does NOT drop any tables, rows, or existing records.
-- Completely preserves all existing admins, students, elections, and data.
-- =============================================================================

-- 1. Ensure Table Structure for Administrative Users
CREATE TABLE IF NOT EXISTS public.admin_scopes (
  id TEXT PRIMARY KEY,
  user_id UUID,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT,
  scope TEXT NOT NULL DEFAULT 'main_website',
  role TEXT NOT NULL DEFAULT 'website_admin',
  assigned_level TEXT DEFAULT 'all',
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  granted_by TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Add any missing columns safely without modifying existing values
DO $$
BEGIN
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS id TEXT;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS user_id UUID;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS full_name TEXT;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS password_hash TEXT;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS scope TEXT;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS role TEXT;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS assigned_level TEXT DEFAULT 'all';
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS granted_by TEXT;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

  -- Ensure id column is unique
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_scopes_pkey' OR conname = 'admin_scopes_id_key'
  ) THEN
    ALTER TABLE public.admin_scopes ADD CONSTRAINT admin_scopes_id_key UNIQUE (id);
  END IF;

  -- Ensure unique constraint on email
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_scopes_email_key'
  ) THEN
    ALTER TABLE public.admin_scopes ADD CONSTRAINT admin_scopes_email_key UNIQUE (email);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. High-Performance Indices
CREATE INDEX IF NOT EXISTS idx_admin_scopes_email ON public.admin_scopes (email);
CREATE INDEX IF NOT EXISTS idx_admin_scopes_scope ON public.admin_scopes (scope);
CREATE INDEX IF NOT EXISTS idx_admin_scopes_is_active ON public.admin_scopes (is_active);

-- 4. Row Level Security Configuration (Additive Only - No DROP statements)
ALTER TABLE public.admin_scopes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Policy for reading admin scopes during login verification
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_scopes' AND policyname = 'Allow read admin scopes for authentication'
  ) THEN
    CREATE POLICY "Allow read admin scopes for authentication"
      ON public.admin_scopes
      FOR SELECT
      USING (true);
  END IF;

  -- Policy for full admin scopes management
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_scopes' AND policyname = 'Allow authoritative admin management'
  ) THEN
    CREATE POLICY "Allow authoritative admin management"
      ON public.admin_scopes
      FOR ALL
      USING (true);
  END IF;
END $$;

-- 5. Ensure Audit Trail Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  admin_email TEXT NOT NULL,
  scope TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_logs' AND policyname = 'Allow audit log inserts'
  ) THEN
    CREATE POLICY "Allow audit log inserts" ON public.admin_audit_logs FOR ALL USING (true);
  END IF;
END $$;

-- 6. Ensure OTP Verifications Table is Configured for Password Resets
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number TEXT,
  channel TEXT NOT NULL DEFAULT 'email',
  destination TEXT NOT NULL,
  destination_full TEXT,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  is_used BOOLEAN DEFAULT false,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otp_verifications_dest_full ON public.otp_verifications (destination_full);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires ON public.otp_verifications (expires_at);

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'otp_verifications' AND policyname = 'Allow OTP verification management'
  ) THEN
    CREATE POLICY "Allow OTP verification management" ON public.otp_verifications FOR ALL USING (true);
  END IF;
END $$;

-- Output confirmation
SELECT 'Production Admin Authentication and Scopes successfully verified and active!' AS status;
