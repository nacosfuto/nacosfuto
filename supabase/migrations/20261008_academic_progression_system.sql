-- =============================================================================
-- NACOS FUTO: SCALABLE ACADEMIC PROGRESSION & SESSION SYSTEM MIGRATION
-- Database: Supabase PostgreSQL (SQL Editor ready)
--
-- PURPOSE:
-- 1. Establishes the authoritative `academic_sessions` registry.
-- 2. Enforces dynamic, rule-based level calculation:
--      currentLevel = currentAcademicYearStart - entryYear + 1
-- 3. Eliminates hard-coded level mutations across academic transitions.
-- 4. Establishes institutional graduation states and "Class of [Year]" derivation.
-- 5. Safe, idempotent, non-destructive to existing student profiles.
-- =============================================================================

-- =============================================================================
-- 1. ACADEMIC SESSIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.academic_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_name VARCHAR(20) NOT NULL UNIQUE,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  is_current BOOLEAN DEFAULT false NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure partial unique index so AT MOST ONE session is marked is_current = true
DROP INDEX IF EXISTS idx_academic_sessions_current_unique;
CREATE UNIQUE INDEX idx_academic_sessions_current_unique 
  ON public.academic_sessions (is_current) 
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_academic_sessions_start_year 
  ON public.academic_sessions (start_year);

-- =============================================================================
-- 2. ACADEMIC SETTINGS TABLE (SINGLETON CONFIGURATION)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.academic_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  current_academic_year_start INTEGER NOT NULL DEFAULT 2026,
  current_session TEXT NOT NULL DEFAULT '2026/2027',
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =============================================================================
-- 3. SEED INSTITUTIONAL SESSIONS (2024/2025 THROUGH 2030/2031)
-- =============================================================================

INSERT INTO public.academic_sessions (session_name, start_year, end_year, is_current, start_date, end_date)
VALUES 
  ('2024/2025', 2024, 2025, false, '2024-10-01', '2025-07-31'),
  ('2025/2026', 2025, 2026, false, '2025-10-01', '2026-07-31'),
  ('2026/2027', 2026, 2027, true,  '2026-10-01', '2027-07-31'),
  ('2027/2028', 2027, 2028, false, '2027-10-01', '2028-07-31'),
  ('2028/2029', 2028, 2029, false, '2028-10-01', '2029-07-31'),
  ('2029/2030', 2029, 2030, false, '2029-10-01', '2030-07-31'),
  ('2030/2031', 2030, 2031, false, '2030-10-01', '2031-07-31')
ON CONFLICT (session_name) DO UPDATE 
SET start_year = EXCLUDED.start_year,
    end_year = EXCLUDED.end_year,
    updated_at = NOW();

-- Ensure 2026/2027 is the active session initially
UPDATE public.academic_sessions SET is_current = false WHERE session_name != '2026/2027';
UPDATE public.academic_sessions SET is_current = true WHERE session_name = '2026/2027';

-- Ensure academic_settings matches authoritative session
INSERT INTO public.academic_settings (id, current_academic_year_start, current_session, updated_at)
VALUES ('default', 2026, '2026/2027', NOW())
ON CONFLICT (id) DO UPDATE 
SET current_academic_year_start = 2026,
    current_session = '2026/2027',
    updated_at = NOW();

-- =============================================================================
-- 4. ATOMIC SESSION SWITCHER PROCEDURE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_active_academic_session(p_session_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_result JSONB;
BEGIN
  -- Validate existence of target session
  SELECT * INTO v_session FROM public.academic_sessions WHERE session_name = p_session_name;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Academic session "%" does not exist in academic_sessions registry.', p_session_name;
  END IF;

  -- 1. Deactivate current active session
  UPDATE public.academic_sessions 
  SET is_current = false, updated_at = NOW() 
  WHERE is_current = true;

  -- 2. Activate target session
  UPDATE public.academic_sessions 
  SET is_current = true, updated_at = NOW() 
  WHERE session_name = p_session_name;

  -- 3. Synchronize academic_settings singleton
  INSERT INTO public.academic_settings (id, current_academic_year_start, current_session, updated_at)
  VALUES ('default', v_session.start_year, v_session.session_name, NOW())
  ON CONFLICT (id) DO UPDATE 
  SET current_academic_year_start = EXCLUDED.current_academic_year_start,
      current_session = EXCLUDED.current_session,
      updated_at = NOW();

  -- 4. Synchronize ID card settings if table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'id_card_settings') THEN
    UPDATE public.id_card_settings 
    SET current_session = v_session.session_name, updated_at = NOW()
    WHERE id IN ('default', 'dues');
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'session_name', v_session.session_name,
    'start_year', v_session.start_year,
    'end_year', v_session.end_year,
    'message', 'Academic session successfully switched to ' || v_session.session_name
  );

  RETURN v_result;
END;
$$;

-- =============================================================================
-- 5. PRODUCTION LEVEL CALCULATION FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_student_level(
  p_admission_year INTEGER DEFAULT NULL,
  p_duration INTEGER DEFAULT 5,
  p_reg_no TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_current_year INTEGER;
  v_entry_year INTEGER;
  v_level INTEGER;
  v_prefix_match TEXT;
BEGIN
  -- 1. Resolve Entry Year
  IF p_admission_year IS NOT NULL AND p_admission_year >= 1990 AND p_admission_year <= 2100 THEN
    v_entry_year := p_admission_year;
  ELSIF p_reg_no IS NOT NULL THEN
    v_prefix_match := substring(trim(p_reg_no) FROM '^([0-9]{4})');
    IF v_prefix_match IS NOT NULL AND v_prefix_match ~ '^[0-9]{4}$' THEN
      v_entry_year := v_prefix_match::INTEGER;
    END IF;
  END IF;

  IF v_entry_year IS NULL OR v_entry_year < 1990 OR v_entry_year > 2100 THEN
    RETURN 'Level unavailable';
  END IF;

  -- 2. Resolve Active Academic Year
  SELECT current_academic_year_start INTO v_current_year 
  FROM public.academic_settings 
  WHERE id = 'default';

  IF v_current_year IS NULL THEN
    SELECT start_year INTO v_current_year 
    FROM public.academic_sessions 
    WHERE is_current = true;
  END IF;

  IF v_current_year IS NULL THEN
    v_current_year := 2026;
  END IF;

  -- 3. Calculate Academic Progression
  v_level := v_current_year - v_entry_year + 1;

  IF v_level <= 0 THEN
    RETURN 'Upcoming Cohort';
  ELSIF v_level = 1 THEN
    RETURN '100 Level';
  ELSIF v_level = 2 THEN
    RETURN '200 Level';
  ELSIF v_level = 3 THEN
    RETURN '300 Level';
  ELSIF v_level = 4 THEN
    RETURN '400 Level';
  ELSIF v_level = 5 AND p_duration >= 5 THEN
    RETURN '500 Level';
  ELSIF v_level > p_duration THEN
    RETURN 'Graduated';
  ELSE
    RETURN 'Graduated';
  END IF;
END;
$$;

-- Overload allowing (p_reg_no, p_admission_year, p_duration) parameter order
CREATE OR REPLACE FUNCTION public.calculate_student_level_for_reg(
  p_reg_no TEXT,
  p_admission_year INTEGER DEFAULT NULL,
  p_duration INTEGER DEFAULT 5
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN public.calculate_student_level(p_admission_year, p_duration, p_reg_no);
END;
$$;

-- =============================================================================
-- 6. FULL PROGRESSION METADATA RESOLVER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_academic_progression(
  p_reg_no TEXT,
  p_admission_year INTEGER DEFAULT NULL,
  p_duration INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_current_year INTEGER;
  v_current_session TEXT;
  v_entry_year INTEGER;
  v_level_num INTEGER;
  v_level_display TEXT;
  v_is_graduated BOOLEAN := false;
  v_grad_year INTEGER;
  v_status TEXT := 'active';
  v_prefix_match TEXT;
BEGIN
  -- Resolve Entry Year
  IF p_admission_year IS NOT NULL AND p_admission_year >= 1990 AND p_admission_year <= 2100 THEN
    v_entry_year := p_admission_year;
  ELSIF p_reg_no IS NOT NULL THEN
    v_prefix_match := substring(trim(p_reg_no) FROM '^([0-9]{4})');
    IF v_prefix_match IS NOT NULL AND v_prefix_match ~ '^[0-9]{4}$' THEN
      v_entry_year := v_prefix_match::INTEGER;
    END IF;
  END IF;

  -- Resolve Active Session
  SELECT current_academic_year_start, current_session 
  INTO v_current_year, v_current_session 
  FROM public.academic_settings 
  WHERE id = 'default';

  IF v_current_year IS NULL THEN
    v_current_year := 2026;
    v_current_session := '2026/2027';
  END IF;

  IF v_entry_year IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'unknown',
      'level', 'Level unavailable',
      'academic_session', v_current_session
    );
  END IF;

  v_grad_year := v_entry_year + p_duration;
  v_level_num := v_current_year - v_entry_year + 1;

  IF v_level_num > p_duration THEN
    v_is_graduated := true;
    v_level_display := 'Graduated';
    v_status := 'graduated';
  ELSIF v_level_num <= 0 THEN
    v_level_display := 'Upcoming Cohort';
    v_status := 'incoming';
  ELSE
    v_level_display := (v_level_num * 100)::TEXT || ' Level';
    v_status := 'active';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'entry_year', v_entry_year,
    'current_session', v_current_session,
    'current_year_start', v_current_year,
    'numeric_level', v_level_num,
    'level', v_level_display,
    'is_graduated', v_is_graduated,
    'expected_graduation_year', v_grad_year,
    'class_of', v_grad_year,
    'class_of_display', 'Class of ' || v_grad_year::TEXT,
    'status', v_status
  );
END;
$$;

-- =============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read academic sessions" ON public.academic_sessions;
CREATE POLICY "Public read academic sessions" 
  ON public.academic_sessions 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Public insert academic sessions" ON public.academic_sessions;
CREATE POLICY "Public insert academic sessions" 
  ON public.academic_sessions 
  FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public update academic sessions" ON public.academic_sessions;
CREATE POLICY "Public update academic sessions" 
  ON public.academic_sessions 
  FOR UPDATE 
  USING (true);

DROP POLICY IF EXISTS "Public delete academic sessions" ON public.academic_sessions;
CREATE POLICY "Public delete academic sessions" 
  ON public.academic_sessions 
  FOR DELETE 
  USING (true);

-- Ensure academic_settings has public read policy
DROP POLICY IF EXISTS "Public read academic settings" ON public.academic_settings;
CREATE POLICY "Public read academic settings" 
  ON public.academic_settings 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Public update academic settings" ON public.academic_settings;
CREATE POLICY "Public update academic settings" 
  ON public.academic_settings 
  FOR UPDATE 
  USING (true);

-- =============================================================================
-- 8. VERIFICATION QUERY (FOR SQL EDITOR RESULTS TAB)
-- =============================================================================

SELECT 
  session_name,
  start_year,
  end_year,
  is_current,
  public.calculate_student_level(2022, 5, '2022001') AS cohort_2022_level,
  public.calculate_student_level(2023, 5, '2023001') AS cohort_2023_level,
  public.calculate_student_level(2024, 5, '2024001') AS cohort_2024_level,
  public.calculate_student_level(2025, 5, '2025001') AS cohort_2025_level,
  public.calculate_student_level(2026, 5, '2026001') AS cohort_2026_level
FROM public.academic_sessions
ORDER BY start_year ASC;
