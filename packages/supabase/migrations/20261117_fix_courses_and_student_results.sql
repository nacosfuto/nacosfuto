-- =============================================================================
-- NACOS FUTO: Synchronized Academic Courses & Student Results Schema Migration
-- Ensures complete column alignment for admin course management, student
-- course visibility, and academic transcript score generation.
-- =============================================================================

-- 1. Ensure Table Structure & Missing Columns for public.courses
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  credit_units INTEGER NOT NULL DEFAULT 3,
  level TEXT NOT NULL,
  semester TEXT NOT NULL,
  academic_session VARCHAR(50) NOT NULL DEFAULT '2026/2027',
  course_type VARCHAR(50) DEFAULT 'Core / Compulsory',
  lecturer_name TEXT,
  office TEXT,
  prerequisites TEXT DEFAULT 'None',
  description TEXT,
  syllabus TEXT,
  is_elective BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DO $$
BEGIN
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS code VARCHAR(20);
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS credit_units INTEGER DEFAULT 3;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS level TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS semester TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS academic_session VARCHAR(50) DEFAULT '2026/2027';
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_type VARCHAR(50) DEFAULT 'Core / Compulsory';
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS lecturer_name TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS office TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS prerequisites TEXT DEFAULT 'None';
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS syllabus TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_elective BOOLEAN DEFAULT false;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS created_by TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

  UPDATE public.courses SET academic_session = '2026/2027' WHERE academic_session IS NULL OR trim(academic_session) = '';
  UPDATE public.courses SET course_type = 'Core / Compulsory' WHERE course_type IS NULL OR trim(course_type) = '';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Indexes for public.courses
CREATE INDEX IF NOT EXISTS idx_courses_code ON public.courses (code);
CREATE INDEX IF NOT EXISTS idx_courses_session_level_sem ON public.courses (academic_session, level, semester);

-- 3. Ensure Table Structure & Missing Columns for public.student_results
CREATE TABLE IF NOT EXISTS public.student_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT,
  user_id UUID,
  registration_number VARCHAR(50),
  matric_number VARCHAR(50),
  student_name TEXT,
  course_id UUID,
  course_code VARCHAR(20) NOT NULL,
  course_title TEXT,
  credit_units INTEGER DEFAULT 3,
  units INTEGER DEFAULT 3,
  level TEXT,
  semester TEXT,
  academic_session VARCHAR(50) DEFAULT '2026/2027',
  session VARCHAR(50) DEFAULT '2026/2027',
  entry_mode VARCHAR(20) DEFAULT 'score',
  test NUMERIC(5,2),
  exam NUMERIC(5,2),
  score NUMERIC(5,2),
  grade VARCHAR(5),
  grade_point NUMERIC(3,2),
  quality_points NUMERIC(5,2),
  gp NUMERIC(5,2),
  status VARCHAR(20) DEFAULT 'Passed',
  grading_scale_version VARCHAR(20) DEFAULT '5.0',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DO $$
BEGIN
  -- Ensure ID generates UUID by default
  ALTER TABLE public.student_results ALTER COLUMN id SET DEFAULT gen_random_uuid();

  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS student_id TEXT;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS user_id UUID;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS matric_number VARCHAR(50);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS student_name TEXT;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS course_id UUID;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS course_code VARCHAR(20);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS course_title TEXT;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS credit_units INTEGER DEFAULT 3;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS units INTEGER DEFAULT 3;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS level TEXT;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS semester TEXT;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS academic_session VARCHAR(50) DEFAULT '2026/2027';
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS session VARCHAR(50) DEFAULT '2026/2027';
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS entry_mode VARCHAR(20) DEFAULT 'score';
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS test NUMERIC(5,2);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS exam NUMERIC(5,2);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS grade VARCHAR(5);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS grade_point NUMERIC(3,2);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS quality_points NUMERIC(5,2);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS gp NUMERIC(5,2);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Passed';
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS grading_scale_version VARCHAR(20) DEFAULT '5.0';
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

  -- Backfill alignment between dual column pairs
  UPDATE public.student_results SET registration_number = matric_number WHERE registration_number IS NULL AND matric_number IS NOT NULL;
  UPDATE public.student_results SET matric_number = registration_number WHERE matric_number IS NULL AND registration_number IS NOT NULL;
  UPDATE public.student_results SET academic_session = session WHERE academic_session IS NULL AND session IS NOT NULL;
  UPDATE public.student_results SET session = academic_session WHERE session IS NULL AND academic_session IS NOT NULL;
  UPDATE public.student_results SET credit_units = units WHERE credit_units IS NULL AND units IS NOT NULL;
  UPDATE public.student_results SET units = credit_units WHERE units IS NULL AND credit_units IS NOT NULL;
  UPDATE public.student_results SET quality_points = gp WHERE quality_points IS NULL AND gp IS NOT NULL;
  UPDATE public.student_results SET gp = quality_points WHERE gp IS NULL AND quality_points IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. High Performance Indexes for student_results
CREATE INDEX IF NOT EXISTS idx_student_results_reg ON public.student_results (registration_number);
CREATE INDEX IF NOT EXISTS idx_student_results_matric ON public.student_results (matric_number);
CREATE INDEX IF NOT EXISTS idx_student_results_course ON public.student_results (course_code);
CREATE INDEX IF NOT EXISTS idx_student_results_lookup ON public.student_results (registration_number, course_code, academic_session);

-- 5. Row Level Security Policies
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read courses" ON public.courses;
CREATE POLICY "Allow public read courses" ON public.courses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow admin modify courses" ON public.courses;
CREATE POLICY "Allow admin modify courses" ON public.courses FOR ALL USING (true);

ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read student_results" ON public.student_results;
CREATE POLICY "Allow public read student_results" ON public.student_results FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow modify student_results" ON public.student_results;
CREATE POLICY "Allow modify student_results" ON public.student_results FOR ALL USING (true);
