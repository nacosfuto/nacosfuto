-- =========================================================================
-- MIGRATION: 20260920_fix_admin_scopes_schema.sql
-- NACOS FUTO: Fix admin_scopes relation columns & compatibility
-- Resolves: ERROR 42703: column "password_hash" of relation "admin_scopes" does not exist
-- =========================================================================

-- Step 1: Ensure public.admin_scopes exists with all necessary columns
CREATE TABLE IF NOT EXISTS public.admin_scopes (
  id TEXT PRIMARY KEY,
  user_id UUID,
  email TEXT UNIQUE,
  full_name TEXT,
  password_hash TEXT,
  scope TEXT,
  role TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 2: Migrate existing table columns to match modern auth requirements
DO $$
BEGIN
  -- Add password_hash column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'admin_scopes' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE public.admin_scopes ADD COLUMN password_hash TEXT;
  END IF;

  -- Add user_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'admin_scopes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.admin_scopes ADD COLUMN user_id UUID;
  END IF;

  -- Ensure id column can store custom text keys (e.g., 'admin-seed-super')
  BEGIN
    ALTER TABLE public.admin_scopes ALTER COLUMN id TYPE TEXT USING id::TEXT;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Ensure user_id is nullable (older migrations made it NOT NULL)
  BEGIN
    ALTER TABLE public.admin_scopes ALTER COLUMN user_id DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Ensure permissions column is JSONB (older migrations made it TEXT[])
  BEGIN
    ALTER TABLE public.admin_scopes ALTER COLUMN permissions TYPE JSONB USING CASE 
      WHEN permissions IS NULL THEN '[]'::jsonb 
      ELSE to_jsonb(permissions) 
    END;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Ensure unique constraint on id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_scopes_pkey' OR conname = 'admin_scopes_id_key'
  ) THEN
    ALTER TABLE public.admin_scopes ADD CONSTRAINT admin_scopes_id_key UNIQUE (id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Step 3: Enable RLS and permissive policies for admin scopes
ALTER TABLE public.admin_scopes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read admin scopes" ON public.admin_scopes;

DROP POLICY IF EXISTS "Admins manage scopes" ON public.admin_scopes;
CREATE POLICY "Admins manage scopes" ON public.admin_scopes FOR ALL USING (true);

-- Step 4: Seed default administrator account
INSERT INTO public.admin_scopes (id, email, full_name, password_hash, scope, role, permissions, is_active)
VALUES
  (
    'admin-super-ict',
    'ict.nacosfuto@gmail.com',
    'NACOS FUTO ICT / Super Administrator',
    NULL,
    'super_admin',
    'super_admin',
    '["*"]'::jsonb,
    true
  )
ON CONFLICT (email) DO UPDATE SET
  scope = 'super_admin',
  role = 'super_admin',
  permissions = '["*"]'::jsonb,
  is_active = true;
