-- =========================================================================
-- NACOS FUTO: Level-by-Level ID Card Renewals & Historical Obligation Tracking
-- Migration: 20261012_level_by_level_id_card_renewals.sql
-- =========================================================================

-- 1. Ensure public.payments has dedicated level and academic_session columns
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS academic_session VARCHAR(50);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS level VARCHAR(30);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS session_start_year INTEGER;

-- 2. Ensure public.id_card_applications has academic_session column
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS academic_session VARCHAR(50);

-- 3. Optimized indexes for fast level-by-level obligation queries & duplicate prevention
CREATE INDEX IF NOT EXISTS idx_payments_session ON public.payments (academic_session);
CREATE INDEX IF NOT EXISTS idx_payments_level ON public.payments (level);
CREATE INDEX IF NOT EXISTS idx_payments_reg_type_lvl ON public.payments (registration_number, payment_type, level);
CREATE INDEX IF NOT EXISTS idx_payments_student_type_lvl ON public.payments (student_id, payment_type, level);
CREATE INDEX IF NOT EXISTS idx_idcard_session ON public.id_card_applications (academic_session);
