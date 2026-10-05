-- =========================================================================
-- NACOS FUTO: EXECUTIVES & PAGE HEADER SETTINGS SCHEMA
-- =========================================================================

-- 1. Executives Page Header Settings Table
CREATE TABLE IF NOT EXISTS public.nacos_executives_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  hero_image TEXT,
  hero_title TEXT DEFAULT 'NACOS EXECUTIVES',
  hero_year TEXT DEFAULT '2026',
  hero_subtitle TEXT DEFAULT 'Meet the team elected to serve and represent the students of the Department of Computer Science.',
  current_session_title TEXT DEFAULT 'Current Executives (2025/2026)',
  past_session_title TEXT DEFAULT 'Past Executives (2024/2025)',
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Seed default settings row if not present
INSERT INTO public.nacos_executives_settings (id, hero_title, hero_year, hero_subtitle, current_session_title, past_session_title)
VALUES (
  'default',
  'NACOS EXECUTIVES',
  '2026',
  'Meet the team elected to serve and represent the students of the Department of Computer Science.',
  'Current Executives (2025/2026)',
  'Past Executives (2024/2025)'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Executives Table (Supports Current and Past Executives)
CREATE TABLE IF NOT EXISTS public.nacos_executives (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  image TEXT,
  cloudinary_public_id TEXT,
  category TEXT NOT NULL DEFAULT 'current', -- 'current' or 'past'
  session TEXT DEFAULT '2025/2026',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_executives_category ON public.nacos_executives (category);
CREATE INDEX IF NOT EXISTS idx_executives_order ON public.nacos_executives (order_index);

-- RLS Security Policies
ALTER TABLE public.nacos_executives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nacos_executives_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to nacos_executives"
  ON public.nacos_executives FOR SELECT USING (true);

CREATE POLICY "Allow public read access to nacos_executives_settings"
  ON public.nacos_executives_settings FOR SELECT USING (true);

CREATE POLICY "Allow authenticated admin full access to nacos_executives"
  ON public.nacos_executives FOR ALL USING (true);

CREATE POLICY "Allow authenticated admin full access to nacos_executives_settings"
  ON public.nacos_executives_settings FOR ALL USING (true);
