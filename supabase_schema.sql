-- =========================================================================
-- NACOS FUTO: COMPLETE MASTER DATABASE SCHEMA
-- For Supabase PostgreSQL (SQL Editor copy-paste ready)
--
-- Includes:
-- 1. Academic Configuration & Dynamic Level Calculation
-- 2. Student Profiles & Authentication
-- 3. Verified Student Registry (FUTO Institutional Seed)
-- 4. OTP Verification System (Termii SMS & Resend Email)
-- 5. Verification Sessions & Rate Limiting
-- 6. Account Recovery Requests
-- 7. Admin Scopes, Roles & Permissions (Portal & CMS)
-- 8. Digital Student ID Card Applications & Verification
-- 9. Academic Courses & Curriculum
-- 10. Student Academic Results & Grading
-- 11. Departmental Dues & Clearance
-- 12. CMS Announcements & News
-- 13. CMS Events & Hackathons
-- 14. CMS Campus Gallery
-- 15. CMS Media Library
-- 16. Audit Logging & Security Activity Trail
-- 17. Row Level Security (RLS) Policies
-- 18. Pre-Seeded Default Accounts & Academic Data
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. ACADEMIC SYSTEM CONFIGURATION
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.academic_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  current_academic_year_start INTEGER NOT NULL DEFAULT 2026,
  current_session TEXT NOT NULL DEFAULT '2026/2027',
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

INSERT INTO public.academic_settings (id, current_academic_year_start, current_session)
VALUES ('default', 2026, '2026/2027')
ON CONFLICT (id) DO UPDATE 
SET current_academic_year_start = EXCLUDED.current_academic_year_start,
    current_session = EXCLUDED.current_session,
    updated_at = NOW();

-- Dynamic Level Calculation Function
CREATE OR REPLACE FUNCTION public.calculate_student_level(p_admission_year INTEGER, p_duration INTEGER DEFAULT 5)
RETURNS TEXT AS $$
DECLARE
  v_current_year INTEGER;
  v_level INTEGER;
BEGIN
  SELECT current_academic_year_start INTO v_current_year FROM public.academic_settings WHERE id = 'default';
  IF v_current_year IS NULL THEN
    v_current_year := 2026;
  END IF;

  v_level := v_current_year - p_admission_year + 1;

  IF v_level <= 1 THEN
    RETURN '100 Level';
  ELSIF v_level = 2 THEN
    RETURN '200 Level';
  ELSIF v_level = 3 THEN
    RETURN '300 Level';
  ELSIF v_level = 4 THEN
    RETURN '400 Level';
  ELSIF v_level = 5 THEN
    RETURN '500 Level';
  ELSE
    RETURN 'Alumni / Graduated';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- =========================================================================
-- 2. VERIFIED STUDENT REGISTRY (Institutional Ground Truth)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.verified_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number VARCHAR(30),
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_number TEXT,
  masked_email TEXT,
  masked_phone TEXT,
  admission_year INTEGER DEFAULT 2024,
  level TEXT DEFAULT '100 Level',
  programme TEXT DEFAULT 'B.Tech Computer Science',
  department TEXT DEFAULT 'Computer Science',
  faculty TEXT DEFAULT 'School of Information & Communication Tech (SICT)',
  is_registered BOOLEAN DEFAULT false,
  registered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure columns exist even if table pre-existed with different columns
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS registration_number VARCHAR(30);
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS surname TEXT;
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS middle_name TEXT DEFAULT '';
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS masked_email TEXT;
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS masked_phone TEXT;
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS admission_year INTEGER DEFAULT 2024;
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS level TEXT DEFAULT '100 Level';
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS programme TEXT DEFAULT 'B.Tech Computer Science';
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Computer Science';
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS faculty TEXT DEFAULT 'School of Information & Communication Tech (SICT)';
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS is_registered BOOLEAN DEFAULT false;
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS has_registered BOOLEAN DEFAULT false;
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS auth_user_id TEXT;
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ;
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

CREATE INDEX IF NOT EXISTS idx_verified_students_reg ON public.verified_students(registration_number);
CREATE INDEX IF NOT EXISTS idx_verified_students_email ON public.verified_students(email);
CREATE INDEX IF NOT EXISTS idx_verified_students_phone ON public.verified_students(phone_number);

-- =========================================================================
-- 3. REGISTERED STUDENT PROFILES
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number VARCHAR(30),
  surname TEXT DEFAULT '',
  first_name TEXT DEFAULT '',
  middle_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  full_name TEXT DEFAULT '',
  matric_number VARCHAR(30),
  admission_year INTEGER DEFAULT 2024,
  email TEXT,
  phone_number TEXT DEFAULT '',
  password_hash TEXT DEFAULT '',
  programme TEXT DEFAULT 'B.Tech Computer Science',
  department TEXT DEFAULT 'Computer Science',
  faculty TEXT DEFAULT 'School of Information & Communication Tech (SICT)',
  programme_duration INTEGER DEFAULT 5,
  institution TEXT DEFAULT 'Federal University of Technology, Owerri (FUTO)',
  role TEXT DEFAULT 'Student Member',
  is_active BOOLEAN DEFAULT true,
  profile_photo_url TEXT,
  cloudinary_public_id TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure all profiles columns exist even if public.profiles already existed (e.g. Supabase starter)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_number VARCHAR(30);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS surname TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS middle_name TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS matric_number VARCHAR(30);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admission_year INTEGER DEFAULT 2024;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS programme TEXT DEFAULT 'B.Tech Computer Science';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Computer Science';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS faculty TEXT DEFAULT 'School of Information & Communication Tech (SICT)';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS programme_duration INTEGER DEFAULT 5;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution TEXT DEFAULT 'Federal University of Technology, Owerri (FUTO)';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Student Member';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

CREATE INDEX IF NOT EXISTS idx_profiles_reg ON public.profiles(registration_number);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- =========================================================================
-- AUTOMATIC STUDENT NAME SYNCHRONIZATION FUNCTION & TRIGGERS
-- Auto-computes Full Name from (Surname, First Name, Middle Name) and vice versa
-- =========================================================================
CREATE OR REPLACE FUNCTION public.sync_student_names()
RETURNS TRIGGER AS $$
DECLARE
  v_parts TEXT[];
BEGIN
  -- Sync surname <-> last_name
  IF (NEW.surname IS NULL OR NEW.surname = '') AND (NEW.last_name IS NOT NULL AND NEW.last_name != '') THEN
    NEW.surname := TRIM(NEW.last_name);
  END IF;
  IF (NEW.last_name IS NULL OR NEW.last_name = '') AND (NEW.surname IS NOT NULL AND NEW.surname != '') THEN
    NEW.last_name := TRIM(NEW.surname);
  END IF;

  -- If surname or first_name provided -> construct full_name as: Surname Firstname Middlename
  IF (NEW.surname IS NOT NULL AND NEW.surname != '') OR (NEW.first_name IS NOT NULL AND NEW.first_name != '') THEN
    NEW.full_name := TRIM(CONCAT_WS(' ',
      NULLIF(TRIM(COALESCE(NEW.surname, '')), ''),
      NULLIF(TRIM(COALESCE(NEW.first_name, '')), ''),
      NULLIF(TRIM(COALESCE(NEW.middle_name, '')), '')
    ));
  -- If only full_name provided -> extract surname, first_name, middle_name
  ELSIF (NEW.full_name IS NOT NULL AND NEW.full_name != '') THEN
    v_parts := regexp_split_to_array(TRIM(NEW.full_name), '\s+');
    IF array_length(v_parts, 1) >= 1 THEN
      NEW.surname := v_parts[1];
      NEW.last_name := v_parts[1];
    END IF;
    IF array_length(v_parts, 1) = 2 THEN
      NEW.first_name := v_parts[2];
      NEW.middle_name := '';
    ELSIF array_length(v_parts, 1) >= 3 THEN
      NEW.first_name := v_parts[2];
      NEW.middle_name := array_to_string(v_parts[3:array_length(v_parts, 1)], ' ');
    END IF;
  END IF;

  -- Fallback guarantee
  IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
    NEW.full_name := TRIM(CONCAT_WS(' ',
      NULLIF(TRIM(COALESCE(NEW.surname, '')), ''),
      NULLIF(TRIM(COALESCE(NEW.first_name, '')), ''),
      NULLIF(TRIM(COALESCE(NEW.middle_name, '')), '')
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_verified_student_names ON public.verified_students;
CREATE TRIGGER trg_sync_verified_student_names
BEFORE INSERT OR UPDATE ON public.verified_students
FOR EACH ROW EXECUTE FUNCTION public.sync_student_names();

DROP TRIGGER IF EXISTS trg_sync_profile_names ON public.profiles;
CREATE TRIGGER trg_sync_profile_names
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_student_names();

-- =========================================================================
-- 4. OTP VERIFICATION (Zero-Serverless for Termii SMS & Resend Email)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number VARCHAR(30),
  channel TEXT,
  destination TEXT,
  destination_full TEXT,
  otp_hash TEXT,
  expires_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  verified_at TIMESTAMPTZ,
  is_used BOOLEAN DEFAULT false,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.otp_verifications ADD COLUMN IF NOT EXISTS registration_number VARCHAR(30);
ALTER TABLE public.otp_verifications ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE public.otp_verifications ADD COLUMN IF NOT EXISTS destination TEXT;
ALTER TABLE public.otp_verifications ADD COLUMN IF NOT EXISTS destination_full TEXT;
ALTER TABLE public.otp_verifications ADD COLUMN IF NOT EXISTS otp_hash TEXT;
ALTER TABLE public.otp_verifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.otp_verifications ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
ALTER TABLE public.otp_verifications ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 5;
ALTER TABLE public.otp_verifications ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.otp_verifications ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false;
ALTER TABLE public.otp_verifications ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.otp_verifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

CREATE INDEX IF NOT EXISTS idx_otp_reg_channel ON public.otp_verifications(registration_number, channel);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON public.otp_verifications(expires_at);

-- Verification Sessions
CREATE TABLE IF NOT EXISTS public.verification_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number VARCHAR(30),
  session_token TEXT,
  otp_verification_id UUID REFERENCES public.otp_verifications(id) ON DELETE SET NULL,
  verified_channel TEXT,
  verified_destination TEXT,
  is_consumed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.verification_sessions ADD COLUMN IF NOT EXISTS registration_number VARCHAR(30);
ALTER TABLE public.verification_sessions ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE public.verification_sessions ADD COLUMN IF NOT EXISTS otp_verification_id UUID REFERENCES public.otp_verifications(id) ON DELETE SET NULL;
ALTER TABLE public.verification_sessions ADD COLUMN IF NOT EXISTS verified_channel TEXT;
ALTER TABLE public.verification_sessions ADD COLUMN IF NOT EXISTS verified_destination TEXT;
ALTER TABLE public.verification_sessions ADD COLUMN IF NOT EXISTS is_consumed BOOLEAN DEFAULT false;
ALTER TABLE public.verification_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.verification_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

CREATE INDEX IF NOT EXISTS idx_verif_session_token ON public.verification_sessions(session_token);

-- Rate Limiting
CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number VARCHAR(30),
  request_type TEXT,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.otp_rate_limits ADD COLUMN IF NOT EXISTS registration_number VARCHAR(30);
ALTER TABLE public.otp_rate_limits ADD COLUMN IF NOT EXISTS request_type TEXT;
ALTER TABLE public.otp_rate_limits ADD COLUMN IF NOT EXISTS request_count INTEGER DEFAULT 1;
ALTER TABLE public.otp_rate_limits ADD COLUMN IF NOT EXISTS window_start TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.otp_rate_limits ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

CREATE INDEX IF NOT EXISTS idx_rate_limit_reg ON public.otp_rate_limits(registration_number, request_type);

-- Account Recovery Requests
CREATE TABLE IF NOT EXISTS public.account_recovery_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number VARCHAR(30),
  full_name TEXT,
  requested_email TEXT,
  requested_phone TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.account_recovery_requests ADD COLUMN IF NOT EXISTS registration_number VARCHAR(30);
ALTER TABLE public.account_recovery_requests ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.account_recovery_requests ADD COLUMN IF NOT EXISTS requested_email TEXT;
ALTER TABLE public.account_recovery_requests ADD COLUMN IF NOT EXISTS requested_phone TEXT;
ALTER TABLE public.account_recovery_requests ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.account_recovery_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.account_recovery_requests ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE public.account_recovery_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.account_recovery_requests ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE public.account_recovery_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- =========================================================================
-- 5. ADMINISTRATIVE USERS & SCOPES (Portal Admin & Website CMS)
-- =========================================================================
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

DO $$
BEGIN
  -- Add columns if missing
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS id TEXT;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS user_id UUID;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS full_name TEXT;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS password_hash TEXT;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS scope TEXT;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS role TEXT;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
  ALTER TABLE public.admin_scopes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

  -- Drop NOT NULL on user_id if present from older migrations
  BEGIN
    ALTER TABLE public.admin_scopes ALTER COLUMN user_id DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Ensure id column is text
  BEGIN
    ALTER TABLE public.admin_scopes ALTER COLUMN id TYPE TEXT USING id::TEXT;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Convert permissions to JSONB if it was text[]
  BEGIN
    ALTER TABLE public.admin_scopes ALTER COLUMN permissions TYPE JSONB USING CASE 
      WHEN permissions IS NULL THEN '[]'::jsonb 
      ELSE to_jsonb(permissions) 
    END;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =========================================================================
-- 6. DIGITAL STUDENT ID CARD APPLICATIONS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.id_card_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number VARCHAR(30),
  full_name TEXT,
  level TEXT,
  passport_photo_url TEXT,
  status TEXT DEFAULT 'pending',
  qr_verification_code TEXT,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  card_expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS registration_number VARCHAR(30);
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS passport_photo_url TEXT;
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS qr_verification_code TEXT;
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS card_expiry_date DATE;
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

CREATE INDEX IF NOT EXISTS idx_idcard_reg ON public.id_card_applications(registration_number);
CREATE INDEX IF NOT EXISTS idx_idcard_status ON public.id_card_applications(status);

-- =========================================================================
-- 7. ACADEMIC COURSES & CURRICULUM
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) UNIQUE,
  title TEXT,
  credit_units INTEGER DEFAULT 3,
  level TEXT,
  semester TEXT,
  lecturer_name TEXT,
  description TEXT,
  syllabus TEXT,
  is_elective BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS credit_units INTEGER DEFAULT 3;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS semester TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS lecturer_name TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS syllabus TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_elective BOOLEAN DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- =========================================================================
-- 8. STUDENT ACADEMIC RESULTS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number VARCHAR(30),
  course_code VARCHAR(20),
  session TEXT,
  semester TEXT,
  score NUMERIC(5,2),
  grade VARCHAR(5),
  grade_point NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.results ADD COLUMN IF NOT EXISTS registration_number VARCHAR(30);
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS course_code VARCHAR(20);
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS session TEXT;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS semester TEXT;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS grade VARCHAR(5);
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS grade_point NUMERIC(3,2);
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

CREATE INDEX IF NOT EXISTS idx_results_reg ON public.results(registration_number);

-- =========================================================================
-- 9. DEPARTMENTAL DUES & CLEARANCE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.departmental_dues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number VARCHAR(30),
  session TEXT,
  amount NUMERIC(10,2) DEFAULT 3000.00,
  status TEXT DEFAULT 'unpaid',
  reference TEXT,
  paid_at TIMESTAMPTZ,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.departmental_dues ADD COLUMN IF NOT EXISTS registration_number VARCHAR(30);
ALTER TABLE public.departmental_dues ADD COLUMN IF NOT EXISTS session TEXT;
ALTER TABLE public.departmental_dues ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 3000.00;
ALTER TABLE public.departmental_dues ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unpaid';
ALTER TABLE public.departmental_dues ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE public.departmental_dues ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.departmental_dues ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.departmental_dues ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

CREATE INDEX IF NOT EXISTS idx_dues_reg ON public.departmental_dues(registration_number);

-- =========================================================================
-- 10. CMS ANNOUNCEMENTS & NEWS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  slug TEXT UNIQUE,
  excerpt TEXT,
  content TEXT,
  cover_image_url TEXT,
  category TEXT DEFAULT 'Academic',
  priority TEXT DEFAULT 'normal',
  is_published BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Academic';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- =========================================================================
-- 11. CMS EVENTS & HACKATHONS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  slug TEXT UNIQUE,
  event_date DATE,
  event_time TEXT,
  venue TEXT,
  description TEXT,
  flyer_url TEXT,
  registration_link TEXT,
  is_upcoming BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_time TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS flyer_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_link TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_upcoming BOOLEAN DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- =========================================================================
-- 12. CMS CAMPUS GALLERY
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  category TEXT DEFAULT 'Campus Life',
  image_url TEXT,
  description TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Campus Life';
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- =========================================================================
-- 13. CMS MEDIA ASSETS REGISTRY
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  asset_url TEXT,
  public_id TEXT,
  folder TEXT DEFAULT 'nacos',
  media_type TEXT DEFAULT 'image',
  surface TEXT DEFAULT 'shared',
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS asset_url TEXT;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS public_id TEXT;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT 'nacos';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS surface TEXT DEFAULT 'shared';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS uploaded_by TEXT;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- =========================================================================
-- 14. CMS & PORTAL AUDIT TRAIL
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email TEXT,
  action TEXT,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS admin_email TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- =========================================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.academic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_recovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.id_card_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departmental_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissive public read & operational policies for student portal & registration
DROP POLICY IF EXISTS "Public read academic settings" ON public.academic_settings;
CREATE POLICY "Public read academic settings" ON public.academic_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read verified students" ON public.verified_students;
CREATE POLICY "Public read verified students" ON public.verified_students FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public update verified students status" ON public.verified_students;
CREATE POLICY "Public update verified students status" ON public.verified_students FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;
CREATE POLICY "Public profiles access" ON public.profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Public OTP verifications access" ON public.otp_verifications;
CREATE POLICY "Public OTP verifications access" ON public.otp_verifications FOR ALL USING (true);

DROP POLICY IF EXISTS "Public verification sessions access" ON public.verification_sessions;
CREATE POLICY "Public verification sessions access" ON public.verification_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Public OTP rate limits access" ON public.otp_rate_limits;
CREATE POLICY "Public OTP rate limits access" ON public.otp_rate_limits FOR ALL USING (true);

DROP POLICY IF EXISTS "Public recovery requests access" ON public.account_recovery_requests;
CREATE POLICY "Public recovery requests access" ON public.account_recovery_requests FOR ALL USING (true);

DROP POLICY IF EXISTS "Public ID card applications access" ON public.id_card_applications;
CREATE POLICY "Public ID card applications access" ON public.id_card_applications FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read courses" ON public.courses;
CREATE POLICY "Public read courses" ON public.courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read results" ON public.results;
CREATE POLICY "Public read results" ON public.results FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read dues" ON public.departmental_dues;
CREATE POLICY "Public read dues" ON public.departmental_dues FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read announcements" ON public.announcements;
CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read events" ON public.events;
CREATE POLICY "Public read events" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read gallery" ON public.gallery_items;
CREATE POLICY "Public read gallery" ON public.gallery_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read media assets" ON public.media_assets;
CREATE POLICY "Public read media assets" ON public.media_assets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read admin scopes" ON public.admin_scopes;
CREATE POLICY "Public read admin scopes" ON public.admin_scopes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public write audit logs" ON public.audit_logs;
CREATE POLICY "Public write audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read audit logs" ON public.audit_logs;
CREATE POLICY "Public read audit logs" ON public.audit_logs FOR SELECT USING (true);

-- Admin management policies
DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;
CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins manage events" ON public.events;
CREATE POLICY "Admins manage events" ON public.events FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins manage gallery" ON public.gallery_items;
CREATE POLICY "Admins manage gallery" ON public.gallery_items FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins manage media" ON public.media_assets;
CREATE POLICY "Admins manage media" ON public.media_assets FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins manage results" ON public.results;
CREATE POLICY "Admins manage results" ON public.results FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins manage dues" ON public.departmental_dues;
CREATE POLICY "Admins manage dues" ON public.departmental_dues FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins manage scopes" ON public.admin_scopes;
CREATE POLICY "Admins manage scopes" ON public.admin_scopes FOR ALL USING (true);

-- =========================================================================
-- 16. SEED DATA (Default Accounts, Students, Courses, Dues)
-- =========================================================================

-- Ensure unique constraints exist before conflict handling
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_scopes_pkey' OR conname = 'admin_scopes_id_key'
  ) THEN
    ALTER TABLE public.admin_scopes ADD CONSTRAINT admin_scopes_id_key UNIQUE (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'verified_students_reg_key' OR conname = 'verified_students_registration_number_key'
  ) THEN
    ALTER TABLE public.verified_students ADD CONSTRAINT verified_students_reg_key UNIQUE (registration_number);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_code_key'
  ) THEN
    ALTER TABLE public.courses ADD CONSTRAINT courses_code_key UNIQUE (code);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'announcements_slug_key'
  ) THEN
    ALTER TABLE public.announcements ADD CONSTRAINT announcements_slug_key UNIQUE (slug);
  END IF;
EXCEPTION
  WHEN duplicate_table OR duplicate_object OR duplicate_column THEN NULL;
END $$;

-- 1. Default Admin Accounts (Password for all three: "password")
-- SHA-256('password') = 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
INSERT INTO public.admin_scopes (id, email, full_name, password_hash, scope, role, permissions, is_active)
VALUES
  (
    'admin-seed-super',
    'superadmin@nacos.org.ng',
    'Executive System Administrator',
    '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    'super_admin',
    'super_admin',
    '["super_admin", "student_portal.all", "main_website.all"]'::jsonb,
    true
  ),
  (
    'admin-seed-portal',
    'portaladmin@nacos.org.ng',
    'Portal Examination & Verification Officer',
    '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    'student_portal',
    'portal_admin',
    '["student_portal.view", "student_portal.students", "student_portal.verification", "student_portal.id_cards", "student_portal.results", "student_portal.dues", "student_portal.settings"]'::jsonb,
    true
  ),
  (
    'admin-seed-website',
    'webadmin@nacos.org.ng',
    'NACOS Director of Software & Public Relations',
    '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    'main_website',
    'website_admin',
    '["main_website.view", "main_website.media", "main_website.gallery", "main_website.news", "main_website.events", "main_website.homepage", "main_website.settings"]'::jsonb,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Pre-Seeded Verified Students (Institutional Ground Truth)
INSERT INTO public.verified_students 
  (registration_number, full_name, first_name, last_name, email, phone_number, masked_email, masked_phone, admission_year, level, is_registered)
VALUES
  (
    '20241429481',
    'Nestor Osuagwu',
    'Nestor',
    'Osuagwu',
    'nestor.cyber@futo.edu.ng',
    '08103598717',
    'n•••••r@futo.edu.ng',
    '•••••••8717',
    2024,
    '100 Level',
    false
  ),
  (
    '20201012948',
    'Emmanuel Irechukwu',
    'Emmanuel',
    'Irechukwu',
    'irechukwu.emmanuel@futo.edu.ng',
    '08012345678',
    'i•••••l@futo.edu.ng',
    '•••••••5678',
    2020,
    '500 Level',
    false
  ),
  (
    '20251512345',
    'Chinedu Okeke',
    'Chinedu',
    'Okeke',
    'chinedu.okeke@futo.edu.ng',
    '09087654321',
    'c•••••e@futo.edu.ng',
    '•••••••4321',
    2025,
    '100 Level',
    false
  ),
  (
    '20231398765',
    'Amarachi Njoku',
    'Amarachi',
    'Njoku',
    'amarachi.njoku@futo.edu.ng',
    '07011223344',
    'a•••••u@futo.edu.ng',
    '•••••••3344',
    2023,
    '200 Level',
    false
  )
ON CONFLICT (registration_number) DO NOTHING;

-- 3. Core Departmental Courses
INSERT INTO public.courses (code, title, credit_units, level, semester, lecturer_name)
VALUES
  ('CSC 101', 'Introduction to Computer Science', 3, '100 Level', 'Harmattan', 'Dr. C. N. Udanor'),
  ('CSC 102', 'Introduction to Problem Solving & Programming', 3, '100 Level', 'Rain', 'Engr. K. O. Ekwonwune'),
  ('MTH 101', 'Elementary Mathematics I (Algebra & Trigonometry)', 3, '100 Level', 'Harmattan', 'Prof. O. C. Onyeneke'),
  ('PHY 101', 'General Physics I (Mechanics & Properties of Matter)', 3, '100 Level', 'Harmattan', 'Dr. E. B. Agbaje'),
  ('CSC 201', 'Computer Programming I (Object-Oriented Java/C++)', 3, '200 Level', 'Harmattan', 'Dr. F. U. Ogban'),
  ('CSC 202', 'Data Structures & Algorithms', 3, '200 Level', 'Rain', 'Dr. B. C. Eke'),
  ('CSC 301', 'Operating Systems Principles & Architecture', 3, '300 Level', 'Harmattan', 'Dr. H. C. Inyiama'),
  ('CSC 303', 'Database Design & Management Systems', 3, '300 Level', 'Harmattan', 'Dr. U. G. Okolie'),
  ('CSC 401', 'Software Engineering & Agile Methodologies', 3, '400 Level', 'Harmattan', 'Dr. O. A. Ojesanmi'),
  ('CSC 501', 'Artificial Intelligence & Machine Learning', 3, '500 Level', 'Harmattan', 'Prof. E. E. Ogheneovo'),
  ('CSC 503', 'Computer & Network Security / Cryptography', 3, '500 Level', 'Harmattan', 'Dr. I. A. Nwakanma')
ON CONFLICT (code) DO NOTHING;

-- 4. Initial CMS Announcements
INSERT INTO public.announcements (title, slug, excerpt, content, category, priority, is_published)
VALUES
  (
    'Harmattan Semester 2026/2027 Registration Officially Open',
    'harmattan-semester-2026-registration',
    'All Computer Science students are expected to complete departmental dues and ID card clearance.',
    'The Department of Computer Science, FUTO announces the commencement of registration for the 2026/2027 academic session. All new and returning students are advised to verify their records and apply for digital ID cards.',
    'Academic',
    'high',
    true
  ),
  (
    'National Hackathon BuildX NACOS Registration Commences',
    'national-hackathon-buildx-nacos',
    'Form your teams of 2 to 4 students and compete for national cash prizes and venture funding.',
    'NACOS FUTO invites all students to apply for the annual BuildX national collegiate hackathon. Build full-stack solutions in AI, FinTech, and EdTech.',
    'Events',
    'normal',
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- 10. STUDENT RESOURCE HUB & CLOUDFLARE R2 SYSTEM
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.resource_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'BookOpen',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.resource_categories(id) ON DELETE SET NULL,
  course_code VARCHAR(30),
  course_title VARCHAR(255),
  level VARCHAR(20) DEFAULT 'All Levels',
  semester VARCHAR(20) DEFAULT 'First Semester',
  resource_type VARCHAR(50) DEFAULT 'document',
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) DEFAULT 'pdf',
  file_extension VARCHAR(20) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT DEFAULT 0,
  storage_provider VARCHAR(50) DEFAULT 'backblaze_b2',
  storage_bucket VARCHAR(100) DEFAULT 'nacos-resources',
  storage_key TEXT NOT NULL,
  thumbnail_storage_key TEXT,
  duration_seconds INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.resource_downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT,
  ip_hash VARCHAR(64),
  user_agent TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.resource_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT,
  viewed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.resource_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.resource_tag_links (
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.resource_tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (resource_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category_id);
CREATE INDEX IF NOT EXISTS idx_resources_course_code ON public.resources(course_code);
CREATE INDEX IF NOT EXISTS idx_resources_level ON public.resources(level);
CREATE INDEX IF NOT EXISTS idx_resources_semester ON public.resources(semester);
CREATE INDEX IF NOT EXISTS idx_resources_type ON public.resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_is_published ON public.resources(is_published);
CREATE INDEX IF NOT EXISTS idx_resources_is_active ON public.resources(is_active);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON public.resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_downloads ON public.resources(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_resources_storage_provider ON public.resources(storage_provider);

CREATE OR REPLACE FUNCTION public.increment_resource_download(
  p_resource_id UUID,
  p_user_id TEXT DEFAULT NULL,
  p_ip_hash TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO public.resource_downloads (resource_id, user_id, ip_hash, user_agent, downloaded_at)
  VALUES (p_resource_id, p_user_id, p_ip_hash, p_user_agent, NOW());

  UPDATE public.resources
  SET 
    download_count = download_count + 1,
    updated_at = NOW()
  WHERE id = p_resource_id
  RETURNING download_count INTO v_new_count;

  RETURN COALESCE(v_new_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_resource_view(
  p_resource_id UUID,
  p_user_id TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO public.resource_views (resource_id, user_id, viewed_at)
  VALUES (p_resource_id, p_user_id, NOW());

  UPDATE public.resources
  SET 
    view_count = view_count + 1,
    updated_at = NOW()
  WHERE id = p_resource_id
  RETURNING view_count INTO v_new_count;

  RETURN COALESCE(v_new_count, 0);
END;
$$;

ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_tag_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read resource categories" ON public.resource_categories;
CREATE POLICY "Public read resource categories" ON public.resource_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage resource categories" ON public.resource_categories;
CREATE POLICY "Admins manage resource categories" ON public.resource_categories FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read active resources" ON public.resources;
CREATE POLICY "Public read active resources" ON public.resources FOR SELECT USING (is_active = true AND is_published = true);
DROP POLICY IF EXISTS "Admins manage resources" ON public.resources;
CREATE POLICY "Admins manage resources" ON public.resources FOR ALL USING (true);

DROP POLICY IF EXISTS "Public log downloads" ON public.resource_downloads;
CREATE POLICY "Public log downloads" ON public.resource_downloads FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins view all downloads" ON public.resource_downloads;
CREATE POLICY "Admins view all downloads" ON public.resource_downloads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public log views" ON public.resource_views;
CREATE POLICY "Public log views" ON public.resource_views FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins view all views" ON public.resource_views;
CREATE POLICY "Admins view all views" ON public.resource_views FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read tags" ON public.resource_tags;
CREATE POLICY "Public read tags" ON public.resource_tags FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage tags" ON public.resource_tags;
CREATE POLICY "Admins manage tags" ON public.resource_tags FOR ALL USING (true);
DROP POLICY IF EXISTS "Public read tag links" ON public.resource_tag_links;
CREATE POLICY "Public read tag links" ON public.resource_tag_links FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage tag links" ON public.resource_tag_links;
CREATE POLICY "Admins manage tag links" ON public.resource_tag_links FOR ALL USING (true);

-- =========================================================================
-- 15. CMS ENTITIES, LIVE EVENT REGISTRIES, AND BACHS PAYMENTS (ENTERPRISE STANDARDS)
-- =========================================================================

-- 15a. Yellow Pages (Student Businesses Directory)
CREATE TABLE IF NOT EXISTS public.yellow_pages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  secondary_categories TEXT[],
  owner_name TEXT NOT NULL,
  owner_level TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  rating NUMERIC(2,1) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  image TEXT,
  cloudinary_public_id TEXT,
  image_position TEXT DEFAULT 'top center',
  status TEXT DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.yellow_pages ADD COLUMN IF NOT EXISTS secondary_categories TEXT[];
ALTER TABLE public.yellow_pages ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
ALTER TABLE public.yellow_pages ADD COLUMN IF NOT EXISTS image_position TEXT DEFAULT 'top center';
ALTER TABLE public.yellow_pages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_yellow_pages_status ON public.yellow_pages (status);
CREATE INDEX IF NOT EXISTS idx_yellow_pages_category ON public.yellow_pages (category);

ALTER TABLE public.yellow_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read approved yellow pages" ON public.yellow_pages;
CREATE POLICY "Public read approved yellow pages" ON public.yellow_pages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage yellow pages" ON public.yellow_pages;
CREATE POLICY "Admins manage yellow pages" ON public.yellow_pages FOR ALL USING (true);

-- 15b. Website Events
CREATE TABLE IF NOT EXISTS public.website_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  event_date TEXT NOT NULL,
  event_time TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  cloudinary_public_id TEXT,
  category TEXT DEFAULT 'Workshop' NOT NULL,
  registration_link TEXT,
  is_published BOOLEAN DEFAULT true NOT NULL,
  is_featured BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.website_events ADD COLUMN IF NOT EXISTS registration_link TEXT;
ALTER TABLE public.website_events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.website_events ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;

CREATE INDEX IF NOT EXISTS idx_website_events_slug ON public.website_events (slug);
CREATE INDEX IF NOT EXISTS idx_website_events_published ON public.website_events (is_published);

ALTER TABLE public.website_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read published website events" ON public.website_events;
CREATE POLICY "Public read published website events" ON public.website_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage website events" ON public.website_events;
CREATE POLICY "Admins manage website events" ON public.website_events FOR ALL USING (true);

-- 15c. Website Gallery
CREATE TABLE IF NOT EXISTS public.website_gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  caption TEXT NOT NULL,
  image_url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  category TEXT DEFAULT 'Campus Life' NOT NULL,
  is_featured BOOLEAN DEFAULT false NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.website_gallery ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
ALTER TABLE public.website_gallery ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE public.website_gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read website gallery" ON public.website_gallery;
CREATE POLICY "Public read website gallery" ON public.website_gallery FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage website gallery" ON public.website_gallery;
CREATE POLICY "Admins manage website gallery" ON public.website_gallery FOR ALL USING (true);

-- 15d. NACOS Executives & Settings
CREATE TABLE IF NOT EXISTS public.nacos_executives (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  portfolio TEXT NOT NULL,
  level TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  cloudinary_public_id TEXT,
  linkedin TEXT,
  github TEXT,
  twitter TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  academic_session TEXT DEFAULT '2026/2027',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nacos_executives_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  hero_badge TEXT DEFAULT 'Leadership & Governance',
  hero_title TEXT DEFAULT 'Meet the 2026/2027 Executive Council',
  hero_description TEXT DEFAULT 'Elected student servant-leaders steering digital innovation and welfare for NACOS FUTO.',
  president_quote TEXT,
  academic_session TEXT DEFAULT '2026/2027',
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.nacos_executives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read executives" ON public.nacos_executives;
CREATE POLICY "Public read executives" ON public.nacos_executives FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage executives" ON public.nacos_executives;
CREATE POLICY "Admins manage executives" ON public.nacos_executives FOR ALL USING (true);

ALTER TABLE public.nacos_executives_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read executives settings" ON public.nacos_executives_settings;
CREATE POLICY "Public read executives settings" ON public.nacos_executives_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage executives settings" ON public.nacos_executives_settings;
CREATE POLICY "Admins manage executives settings" ON public.nacos_executives_settings FOR ALL USING (true);

-- 15e. News & Articles
CREATE TABLE IF NOT EXISTS public.news_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  content TEXT,
  cover_image_url TEXT,
  cloudinary_public_id TEXT,
  author TEXT DEFAULT 'NACOS Press Desk',
  category TEXT DEFAULT 'Tech & Academics',
  is_published BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read news articles" ON public.news_articles;
CREATE POLICY "Public read news articles" ON public.news_articles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage news articles" ON public.news_articles;
CREATE POLICY "Admins manage news articles" ON public.news_articles FOR ALL USING (true);

-- 15f. Student Results Catalog
CREATE TABLE IF NOT EXISTS public.student_results (
  id TEXT PRIMARY KEY,
  matric_number VARCHAR(30) NOT NULL,
  student_name TEXT NOT NULL,
  course_code VARCHAR(20) NOT NULL,
  course_title TEXT NOT NULL,
  units INTEGER DEFAULT 3 NOT NULL,
  level INTEGER DEFAULT 100 NOT NULL,
  semester TEXT NOT NULL,
  session TEXT NOT NULL,
  test NUMERIC(5,2) DEFAULT 0,
  exam NUMERIC(5,2) DEFAULT 0,
  score NUMERIC(5,2) DEFAULT 0,
  grade VARCHAR(5) DEFAULT 'F',
  gp NUMERIC(4,2) DEFAULT 0,
  status TEXT DEFAULT 'Passed',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_results_matric ON public.student_results (matric_number);
CREATE INDEX IF NOT EXISTS idx_student_results_level ON public.student_results (level);
CREATE INDEX IF NOT EXISTS idx_student_results_course ON public.student_results (course_code);

ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read student results" ON public.student_results;
CREATE POLICY "Public read student results" ON public.student_results FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage student results" ON public.student_results;
CREATE POLICY "Admins manage student results" ON public.student_results FOR ALL USING (true);

-- 15g. Announcements Table Synchronization
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'ALL STUDENTS';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS author_unit TEXT DEFAULT 'Admissions Unit';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS is_popup BOOLEAN DEFAULT false;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;

-- 15h. Bachs Payments & Webhooks Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tx_ref TEXT UNIQUE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'NGN' NOT NULL,
  student_name TEXT,
  matric_number TEXT,
  email TEXT,
  payment_type TEXT DEFAULT 'id_card',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'successful', 'failed', 'abandoned')),
  bachs_reference TEXT,
  gateway_response JSONB,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_tx_ref ON public.payments (tx_ref);
CREATE INDEX IF NOT EXISTS idx_payments_matric ON public.payments (matric_number);
CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON public.webhook_events (event_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read payments" ON public.payments;
CREATE POLICY "Public read payments" ON public.payments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage payments" ON public.payments;
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL USING (true);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage webhooks" ON public.webhook_events;
CREATE POLICY "Admins manage webhooks" ON public.webhook_events FOR ALL USING (true);

-- 15i. Media Assets Registry Unique Constraints
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS image_alt TEXT;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_assets_cloudinary_pub_id ON public.media_assets (cloudinary_public_id) WHERE cloudinary_public_id IS NOT NULL;



