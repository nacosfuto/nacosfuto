-- =============================================================================
-- NACOS FUTO: Global Semester Selection & Academic Settings Synchronization
-- Enables administrators to configure active academic session and semester,
-- persists global settings in public.academic_settings and public.id_card_settings,
-- and synchronizes student course eligibility in real time.
-- =============================================================================

-- 1. Ensure public.academic_settings has current_semester column
CREATE TABLE IF NOT EXISTS public.academic_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  current_academic_year_start INTEGER NOT NULL DEFAULT 2026,
  current_session TEXT NOT NULL DEFAULT '2026/2027',
  current_semester TEXT NOT NULL DEFAULT 'First Semester',
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DO $$
BEGIN
  ALTER TABLE public.academic_settings ADD COLUMN IF NOT EXISTS current_semester TEXT DEFAULT 'First Semester';
  UPDATE public.academic_settings 
  SET current_semester = 'First Semester' 
  WHERE current_semester IS NULL OR trim(current_semester) = '';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Ensure public.id_card_settings has academic_semester column
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'id_card_settings') THEN
    ALTER TABLE public.id_card_settings ADD COLUMN IF NOT EXISTS academic_semester VARCHAR(50) DEFAULT 'First Semester';
    UPDATE public.id_card_settings 
    SET academic_semester = 'First Semester' 
    WHERE academic_semester IS NULL OR trim(academic_semester) = '';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Ensure student records support individual student semester tracking if needed
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'verified_students') THEN
    ALTER TABLE public.verified_students ADD COLUMN IF NOT EXISTS current_semester TEXT DEFAULT NULL;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_semester TEXT DEFAULT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Atomic Database Stored Procedure for Global Semester Switch
CREATE OR REPLACE FUNCTION public.set_active_academic_semester(p_semester TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_semester TEXT;
  v_session TEXT;
  v_year INTEGER;
BEGIN
  -- Validate semester
  IF p_semester ILIKE '%second%' THEN
    v_semester := 'Second Semester';
  ELSE
    v_semester := 'First Semester';
  END IF;

  -- 1. Update academic_settings singleton
  INSERT INTO public.academic_settings (id, current_academic_year_start, current_session, current_semester, updated_at)
  VALUES ('default', 2026, '2026/2027', v_semester, NOW())
  ON CONFLICT (id) DO UPDATE 
  SET current_semester = v_semester,
      updated_at = NOW()
  RETURNING current_session, current_academic_year_start INTO v_session, v_year;

  -- 2. Synchronize id_card_settings if table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'id_card_settings') THEN
    UPDATE public.id_card_settings 
    SET academic_semester = v_semester, updated_at = NOW()
    WHERE id IN ('default', 'dues');

    UPDATE public.id_card_settings
    SET payload = jsonb_set(
      COALESCE(payload, '{}'::jsonb),
      '{active_semester}',
      to_jsonb(v_semester)
    ),
    academic_semester = v_semester,
    updated_at = NOW()
    WHERE id = 'store_academic_session_config';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'semester', v_semester,
    'session', v_session,
    'message', 'Active semester successfully switched to ' || v_semester
  );
END;
$$;

-- 5. Atomic Global Academic Context Switcher (Session and Semester together)
CREATE OR REPLACE FUNCTION public.set_global_academic_context(p_session_name TEXT, p_semester TEXT DEFAULT 'First Semester')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_semester TEXT;
  v_session RECORD;
  v_result JSONB;
BEGIN
  -- Validate semester
  IF p_semester ILIKE '%second%' THEN
    v_semester := 'Second Semester';
  ELSE
    v_semester := 'First Semester';
  END IF;

  -- Check if session exists in registry if academic_sessions table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'academic_sessions') THEN
    UPDATE public.academic_sessions 
    SET is_current = false, updated_at = NOW() 
    WHERE is_current = true;

    UPDATE public.academic_sessions 
    SET is_current = true, updated_at = NOW() 
    WHERE session_name = p_session_name;
  END IF;

  -- Synchronize academic_settings
  INSERT INTO public.academic_settings (id, current_academic_year_start, current_session, current_semester, updated_at)
  VALUES ('default', 2026, p_session_name, v_semester, NOW())
  ON CONFLICT (id) DO UPDATE 
  SET current_session = p_session_name,
      current_semester = v_semester,
      updated_at = NOW();

  -- Synchronize id_card_settings
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'id_card_settings') THEN
    UPDATE public.id_card_settings 
    SET current_session = p_session_name,
        academic_session = p_session_name,
        academic_semester = v_semester,
        updated_at = NOW()
    WHERE id IN ('default', 'dues');

    UPDATE public.id_card_settings
    SET academic_session = p_session_name,
        academic_semester = v_semester,
        payload = jsonb_set(
          jsonb_set(COALESCE(payload, '{}'::jsonb), '{active_session}', to_jsonb(p_session_name)),
          '{active_semester}',
          to_jsonb(v_semester)
        ),
        updated_at = NOW()
    WHERE id = 'store_academic_session_config';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'session_name', p_session_name,
    'semester', v_semester,
    'message', 'Global academic context updated to ' || p_session_name || ' (' || v_semester || ')'
  );
END;
$$;

-- 6. Row Level Security for academic_settings
ALTER TABLE public.academic_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read academic settings" ON public.academic_settings;
CREATE POLICY "Public read academic settings" ON public.academic_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage academic settings" ON public.academic_settings;
CREATE POLICY "Admins manage academic settings" ON public.academic_settings FOR ALL USING (true);

-- 7. Grant execute permissions on stored procedures to authenticated users & service role
GRANT EXECUTE ON FUNCTION public.set_active_academic_semester(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_global_academic_context(TEXT, TEXT) TO authenticated, service_role;

-- 8. Add academic_settings to Supabase Realtime publication if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.academic_settings;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

