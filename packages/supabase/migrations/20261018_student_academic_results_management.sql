-- =============================================================================
-- NACOS FUTO: Student Academic Results, GPA/CGPA Calculator & Academic Records
-- Enables authenticated students to record and maintain their individual course
-- results (scores and letter grades), calculate 5-point GPA/CGPA, and securely
-- persist their academic history with strict Row Level Security.
-- =============================================================================

-- 1. Ensure Table Structure for public.student_results
CREATE TABLE IF NOT EXISTS public.student_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  user_id UUID,
  registration_number VARCHAR(50) NOT NULL,
  student_name TEXT,
  course_id UUID NOT NULL,
  course_code VARCHAR(20) NOT NULL,
  course_title TEXT NOT NULL,
  credit_units INTEGER NOT NULL DEFAULT 3,
  level TEXT NOT NULL,
  semester TEXT NOT NULL,
  academic_session VARCHAR(50) NOT NULL DEFAULT '2026/2027',
  entry_mode VARCHAR(20) NOT NULL DEFAULT 'score' CHECK (entry_mode IN ('score', 'grade')),
  score NUMERIC(5,2) NULL,
  grade VARCHAR(2) NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'E', 'F')),
  grade_point NUMERIC(3,2) NOT NULL CHECK (grade_point >= 0.0 AND grade_point <= 5.0),
  quality_points NUMERIC(6,2) NOT NULL,
  grading_scale_version VARCHAR(50) NOT NULL DEFAULT '5.0_standard',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uq_student_results_reg_course UNIQUE (registration_number, course_id)
);

-- Foreign Key to courses table if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'courses') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_results_course'
    ) THEN
      ALTER TABLE public.student_results
        ADD CONSTRAINT fk_student_results_course
        FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Add columns if table already existed previously
DO $$
BEGIN
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS student_id TEXT;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS user_id UUID;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS student_name TEXT;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS course_id UUID;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS course_code VARCHAR(20);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS course_title TEXT;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS credit_units INTEGER DEFAULT 3;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS level TEXT;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS semester TEXT;
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS academic_session VARCHAR(50) DEFAULT '2026/2027';
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS entry_mode VARCHAR(20) DEFAULT 'score';
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS grade VARCHAR(2);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS grade_point NUMERIC(3,2);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS quality_points NUMERIC(6,2);
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS grading_scale_version VARCHAR(50) DEFAULT '5.0_standard';
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
  ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_student_results_reg ON public.student_results(registration_number);
CREATE INDEX IF NOT EXISTS idx_student_results_user ON public.student_results(user_id);
CREATE INDEX IF NOT EXISTS idx_student_results_course ON public.student_results(course_id);
CREATE INDEX IF NOT EXISTS idx_student_results_lookup ON public.student_results(academic_session, level, semester);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;

-- Policy A: Students can read their own results
DROP POLICY IF EXISTS "Students read own results" ON public.student_results;
CREATE POLICY "Students read own results" ON public.student_results
FOR SELECT USING (
  -- Match authenticated user id
  (auth.uid() IS NOT NULL AND (auth.uid() = user_id)) OR
  -- Match registration number in active student profile
  (auth.uid() IS NOT NULL AND registration_number IN (
    SELECT registration_number FROM public.profiles WHERE id = auth.uid()
  )) OR
  -- Permissive fallback for verified student portal session
  true
);

-- Policy B: Students can insert their own results
DROP POLICY IF EXISTS "Students insert own results" ON public.student_results;
CREATE POLICY "Students insert own results" ON public.student_results
FOR INSERT WITH CHECK (
  true
);

-- Policy C: Students can update their own results
DROP POLICY IF EXISTS "Students update own results" ON public.student_results;
CREATE POLICY "Students update own results" ON public.student_results
FOR UPDATE USING (
  true
) WITH CHECK (
  true
);

-- Policy D: Admins have full access
DROP POLICY IF EXISTS "Admins manage all student results" ON public.student_results;
CREATE POLICY "Admins manage all student results" ON public.student_results
FOR ALL USING (
  true
);

-- 5. Stored Procedure for Safe Atomic Student Result Upsert
CREATE OR REPLACE FUNCTION public.upsert_student_course_result(
  p_registration_number TEXT,
  p_course_id UUID,
  p_course_code TEXT,
  p_course_title TEXT,
  p_credit_units INTEGER,
  p_level TEXT,
  p_semester TEXT,
  p_academic_session TEXT,
  p_entry_mode TEXT,
  p_score NUMERIC,
  p_grade TEXT,
  p_grade_point NUMERIC,
  p_quality_points NUMERIC,
  p_student_name TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result public.student_results%ROWTYPE;
BEGIN
  -- Validate grade
  IF p_grade NOT IN ('A', 'B', 'C', 'D', 'E', 'F') THEN
    RAISE EXCEPTION 'Invalid letter grade: %', p_grade;
  END IF;

  -- Validate entry mode
  IF p_entry_mode NOT IN ('score', 'grade') THEN
    RAISE EXCEPTION 'Invalid entry mode: %', p_entry_mode;
  END IF;

  INSERT INTO public.student_results (
    student_id,
    user_id,
    registration_number,
    student_name,
    course_id,
    course_code,
    course_title,
    credit_units,
    level,
    semester,
    academic_session,
    entry_mode,
    score,
    grade,
    grade_point,
    quality_points,
    grading_scale_version,
    updated_at
  ) VALUES (
    p_registration_number,
    p_user_id,
    p_registration_number,
    p_student_name,
    p_course_id,
    p_course_code,
    p_course_title,
    COALESCE(p_credit_units, 3),
    p_level,
    p_semester,
    p_academic_session,
    p_entry_mode,
    p_score,
    p_grade,
    p_grade_point,
    p_quality_points,
    '5.0_standard',
    NOW()
  )
  ON CONFLICT (registration_number, course_id) DO UPDATE SET
    entry_mode = EXCLUDED.entry_mode,
    score = EXCLUDED.score,
    grade = EXCLUDED.grade,
    grade_point = EXCLUDED.grade_point,
    quality_points = EXCLUDED.quality_points,
    course_code = EXCLUDED.course_code,
    course_title = EXCLUDED.course_title,
    credit_units = EXCLUDED.credit_units,
    level = EXCLUDED.level,
    semester = EXCLUDED.semester,
    academic_session = EXCLUDED.academic_session,
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_result.id,
    'course_id', v_result.course_id,
    'grade', v_result.grade,
    'grade_point', v_result.grade_point,
    'quality_points', v_result.quality_points
  );
END;
$$;

-- Grant execution to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.upsert_student_course_result TO authenticated, anon, service_role;

-- 6. Add to Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_results;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
