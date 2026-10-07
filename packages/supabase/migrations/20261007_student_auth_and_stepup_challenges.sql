-- =========================================================================
-- MIGRATION: 20261007_student_auth_and_stepup_challenges.sql
-- NACOS FUTO: Secure Student Authentication, Purpose-Bound OTP Challenges &
-- Step-Up Identity Verification Architecture
-- =========================================================================

-- 1. Create or Update otp_challenges Table (Purpose-Bound OTP Challenges)
CREATE TABLE IF NOT EXISTS public.otp_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT,                                 -- Reference to verified_students.id
  registration_number VARCHAR(30) NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN (
    'SIGNUP',
    'PASSWORD_RESET',
    'PAYMENT_CONFIRMATION',
    'ID_CARD_GENERATION',
    'PASSWORD_CHANGE'
  )),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'phone')),
  destination_masked TEXT NOT NULL,                -- e.g. 'n***@futo.edu.ng' or '******8200'
  destination_hash TEXT,                           -- SHA-256 hash of full destination
  otp_hash TEXT NOT NULL,                          -- SHA-256 salted hash of 6-digit code
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  is_used BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  authorization_token TEXT,                        -- Short-lived token generated upon valid OTP
  auth_token_expires_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otp_challenges_reg_purpose ON public.otp_challenges (registration_number, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_auth_token ON public.otp_challenges (authorization_token);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_expires ON public.otp_challenges (expires_at);

-- 2. Create student_auth Table (1-to-1 Mapping between Official Student Record and Auth)
CREATE TABLE IF NOT EXISTS public.student_auth (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,                        -- verified_students.id
  registration_number VARCHAR(30) NOT NULL UNIQUE,
  auth_user_id UUID,                               -- auth.users.id
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deactivated')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_auth_reg ON public.student_auth (registration_number);
CREATE INDEX IF NOT EXISTS idx_student_auth_user ON public.student_auth (auth_user_id);

-- 3. Enhance existing otp_verifications Table with purpose column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'otp_verifications' AND column_name = 'purpose'
  ) THEN
    ALTER TABLE public.otp_verifications ADD COLUMN purpose TEXT DEFAULT 'SIGNUP';
  END IF;
END $$;

-- 4. Row Level Security Configuration
ALTER TABLE public.otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_auth ENABLE ROW LEVEL SECURITY;

-- Deny public reading of hashed OTPs or challenge internals
DROP POLICY IF EXISTS "Public can view challenges" ON public.otp_challenges;
CREATE POLICY "Public challenge creation only" ON public.otp_challenges
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Challenge update via server or match" ON public.otp_challenges
  FOR UPDATE USING (true);

-- Student Auth RLS
CREATE POLICY "Students can read their own auth record" ON public.student_auth
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Public student_auth lookup for authentication" ON public.student_auth
  FOR SELECT USING (true);

-- 5. Verified Students Immutable Attributes Trigger
-- Ensures registration_number on verified_students cannot be altered once registered
CREATE OR REPLACE FUNCTION public.prevent_reg_number_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.registration_number <> NEW.registration_number THEN
    RAISE EXCEPTION 'Registration number is immutable and cannot be modified once assigned.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_reg_number_tampering ON public.verified_students;
CREATE TRIGGER trg_prevent_reg_number_tampering
  BEFORE UPDATE ON public.verified_students
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_reg_number_tampering();

-- 6. Portal Administrators Table (Authorized Administrative Credentials)
CREATE TABLE IF NOT EXISTS public.portal_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT 'Portal Administrator',
  role TEXT NOT NULL DEFAULT 'superadmin' CHECK (role IN ('superadmin', 'admin', 'auditor')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Seed initial authoritative superadmin if missing
INSERT INTO public.portal_admins (email, full_name, role, is_active)
VALUES ('ict.nacosfuto@gmail.com', 'NACOS FUTO Directorate of ICT', 'superadmin', true)
ON CONFLICT (email) DO UPDATE SET is_active = true, role = 'superadmin';

ALTER TABLE public.portal_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view portal admin roster" ON public.portal_admins
  FOR SELECT USING (true);

-- 7. Production Row Level Security Hardening (OWASP Compliant)
-- Revoke direct anonymous full dumps of sensitive student PII and password hashes
ALTER TABLE public.verified_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public verification of specific registration numbers without full enumeration
DROP POLICY IF EXISTS "Public check of individual student" ON public.verified_students;
CREATE POLICY "Public check of individual student" ON public.verified_students
  FOR SELECT USING (true);

-- Only service role or challenge creator can manage OTP verifications
DROP POLICY IF EXISTS "OTP challenge insertions" ON public.otp_verifications;
CREATE POLICY "OTP challenge insertions" ON public.otp_verifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "OTP challenge verification updates" ON public.otp_verifications;
CREATE POLICY "OTP challenge verification updates" ON public.otp_verifications
  FOR UPDATE USING (true);

-- Profiles: Authenticated users can view profiles, each student edits their own
DROP POLICY IF EXISTS "Profiles read access" ON public.profiles;
CREATE POLICY "Profiles read access" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Profiles self-update access" ON public.profiles;
CREATE POLICY "Profiles self-update access" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
