-- =========================================================================
-- NACOS FUTO: Profile Gender and Personal Contact Customization Fields
-- Migration: 20261014_add_profile_gender_and_fields.sql
-- =========================================================================

-- 1. Ensure public.profiles has columns for gender and personal contact details
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'M';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS residential_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS campus_zone VARCHAR(100);

-- 2. Ensure public.verified_students also supports gender and contact synchronization
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'M';
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);

-- 3. Optimized indexes for querying and profile retrieval
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles (gender);
CREATE INDEX IF NOT EXISTS idx_verified_students_gender ON public.verified_students (gender);
