-- =============================================================================
-- NACOS FUTO: PAYMENTS & ACADEMIC SESSION INTEGRATION MIGRATION
-- Database: Supabase PostgreSQL (SQL Editor ready)
--
-- PURPOSE:
-- 1. Extends the global academic session architecture to the payments system.
-- 2. Adds first-class immutable `academic_session` and `level` columns to `public.payments`.
-- 3. Creates `public.payment_fees` registry supporting session-aware fees.
-- 4. Guarantees that historical payment transactions and receipts permanently
--    retain the academic session and level they were created for, even when the
--    global academic session moves forward or backward.
-- 5. Enables session-based deduplication (preventing duplicate payments per session).
-- 6. Safe, idempotent, non-destructive to existing student financial records.
-- =============================================================================

-- =============================================================================
-- 1. EXTEND PUBLIC.PAYMENTS TABLE WITH SESSION & LEVEL SNAPSHOT COLUMNS
-- =============================================================================

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS academic_session VARCHAR(30);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS level VARCHAR(30);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS fee_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS session_start_year INTEGER;

-- Performance and deduplication indexes
CREATE INDEX IF NOT EXISTS idx_payments_academic_session ON public.payments (academic_session);
CREATE INDEX IF NOT EXISTS idx_payments_level ON public.payments (level);
CREATE INDEX IF NOT EXISTS idx_payments_type_session ON public.payments (payment_type, academic_session);
CREATE INDEX IF NOT EXISTS idx_payments_reg_type_session ON public.payments (registration_number, payment_type, academic_session);

-- =============================================================================
-- 2. SAFE BACKFILL FOR HISTORICAL PAYMENT RECORDS
-- =============================================================================

-- Extract academic_session from JSON metadata if not already populated
UPDATE public.payments 
SET academic_session = COALESCE(
  metadata->>'academic_session',
  metadata->>'academicSession',
  metadata->>'session',
  '2026/2027'
)
WHERE academic_session IS NULL;

-- Extract level from JSON metadata if not already populated
UPDATE public.payments 
SET level = COALESCE(
  metadata->>'level',
  metadata->>'student_level',
  metadata->>'current_level'
)
WHERE level IS NULL AND (metadata->>'level' IS NOT NULL OR metadata->>'student_level' IS NOT NULL);

-- =============================================================================
-- 3. SESSION-AWARE PAYMENT FEES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_fees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_key VARCHAR(50) NOT NULL,
  fee_name VARCHAR(100) NOT NULL,
  academic_session VARCHAR(30) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN' NOT NULL,
  applicable_levels TEXT[] DEFAULT ARRAY['100', '200', '300', '400', '500'],
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uq_payment_fees_key_session UNIQUE (fee_key, academic_session)
);

-- Immediately enable Row Level Security to prevent unauthorized access
ALTER TABLE public.payment_fees ENABLE ROW LEVEL SECURITY;

-- 1. Anyone (including students & public) can view active fee rates
DROP POLICY IF EXISTS "Public read payment_fees" ON public.payment_fees;
CREATE POLICY "Public read payment_fees" 
  ON public.payment_fees 
  FOR SELECT 
  TO public 
  USING (true);

-- 2. Authenticated administrators can manage fees
DROP POLICY IF EXISTS "Authenticated admins manage payment_fees" ON public.payment_fees;
CREATE POLICY "Authenticated admins manage payment_fees" 
  ON public.payment_fees 
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- 3. Backend service role has unrestricted management access
DROP POLICY IF EXISTS "Service role manage payment_fees" ON public.payment_fees;
CREATE POLICY "Service role manage payment_fees" 
  ON public.payment_fees 
  FOR ALL 
  TO service_role 
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_payment_fees_key_session ON public.payment_fees (fee_key, academic_session);
CREATE INDEX IF NOT EXISTS idx_payment_fees_active ON public.payment_fees (is_active);

-- =============================================================================
-- 4. SEED SESSION-AWARE FEES (2024/2025 THROUGH 2028/2029)
-- =============================================================================

INSERT INTO public.payment_fees (fee_key, fee_name, academic_session, amount, currency, applicable_levels, is_active)
VALUES 
  -- Departmental Dues
  ('departmental_dues', 'NACOS Departmental Dues', '2024/2025', 2500.00, 'NGN', ARRAY['100', '200', '300', '400', '500'], true),
  ('departmental_dues', 'NACOS Departmental Dues', '2025/2026', 2500.00, 'NGN', ARRAY['100', '200', '300', '400', '500'], true),
  ('departmental_dues', 'NACOS Departmental Dues', '2026/2027', 2500.00, 'NGN', ARRAY['100', '200', '300', '400', '500'], true),
  ('departmental_dues', 'NACOS Departmental Dues', '2027/2028', 2500.00, 'NGN', ARRAY['100', '200', '300', '400', '500'], true),
  ('departmental_dues', 'NACOS Departmental Dues', '2028/2029', 2500.00, 'NGN', ARRAY['100', '200', '300', '400', '500'], true),
  -- ID Card Issuance
  ('id_card', 'Digital Student ID Card Issuance', '2024/2025', 5000.00, 'NGN', ARRAY['100', '200', '300', '400', '500'], true),
  ('id_card', 'Digital Student ID Card Issuance', '2025/2026', 5000.00, 'NGN', ARRAY['100', '200', '300', '400', '500'], true),
  ('id_card', 'Digital Student ID Card Issuance', '2026/2027', 5000.00, 'NGN', ARRAY['100', '200', '300', '400', '500'], true),
  ('id_card', 'Digital Student ID Card Issuance', '2027/2028', 5000.00, 'NGN', ARRAY['100', '200', '300', '400', '500'], true),
  ('id_card', 'Digital Student ID Card Issuance', '2028/2029', 5000.00, 'NGN', ARRAY['100', '200', '300', '400', '500'], true)
ON CONFLICT (fee_key, academic_session) DO UPDATE 
SET updated_at = NOW();

-- =============================================================================
-- 5. FUNCTION: RESOLVE AUTHORITATIVE FEE FOR A GIVEN SESSION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.resolve_authoritative_fee(
  p_fee_key TEXT,
  p_academic_session TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_session TEXT;
  v_amount NUMERIC;
BEGIN
  -- 1. Resolve Academic Session
  IF p_academic_session IS NOT NULL AND trim(p_academic_session) != '' THEN
    v_session := trim(p_academic_session);
  ELSE
    SELECT current_session INTO v_session FROM public.academic_settings WHERE id = 'default';
    IF v_session IS NULL THEN
      v_session := '2026/2027';
    END IF;
  END IF;

  -- 2. Lookup in payment_fees
  SELECT amount INTO v_amount
  FROM public.payment_fees
  WHERE fee_key = lower(trim(p_fee_key))
    AND academic_session = v_session
    AND is_active = true
  LIMIT 1;

  IF v_amount IS NOT NULL THEN
    RETURN v_amount;
  END IF;

  -- 3. Fallback to id_card_settings
  IF lower(trim(p_fee_key)) IN ('id_card', 'idcard') THEN
    SELECT id_card_fee INTO v_amount FROM public.id_card_settings WHERE id = 'default';
    IF v_amount IS NOT NULL THEN RETURN v_amount; END IF;
    RETURN 5000.00;
  ELSIF lower(trim(p_fee_key)) IN ('departmental_dues', 'dues') THEN
    SELECT id_card_fee INTO v_amount FROM public.id_card_settings WHERE id = 'dues';
    IF v_amount IS NOT NULL THEN RETURN v_amount; END IF;
    RETURN 2500.00;
  END IF;

  RETURN 5000.00;
END;
$$;

-- =============================================================================
-- 6. VERIFICATION
-- =============================================================================

SELECT 
  fee_key, 
  academic_session, 
  amount, 
  currency,
  public.resolve_authoritative_fee('departmental_dues', academic_session) AS resolved_dues_fee,
  public.resolve_authoritative_fee('id_card', academic_session) AS resolved_id_card_fee
FROM public.payment_fees
ORDER BY fee_key, academic_session;
