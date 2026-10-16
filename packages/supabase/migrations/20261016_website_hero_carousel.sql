-- =========================================================================
-- NACOS FUTO: HOMEPAGE HERO CAROUSEL SCHEMA & POLICIES
-- File: packages/supabase/migrations/20261016_website_hero_carousel.sql
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. WEBSITE HERO SLIDES TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.website_hero_slides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  title TEXT,
  heading TEXT,
  subtext TEXT,
  cta_text TEXT,
  cta_link TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  image_position TEXT DEFAULT 'center 35%',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indices for rapid query and ordering
CREATE INDEX IF NOT EXISTS idx_hero_slides_order 
  ON public.website_hero_slides (display_order ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_hero_slides_published_order 
  ON public.website_hero_slides (is_published, display_order ASC, created_at ASC);

-- =========================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.website_hero_slides ENABLE ROW LEVEL SECURITY;

-- Public can read all published hero slides
DROP POLICY IF EXISTS "Public read published hero slides" ON public.website_hero_slides;
CREATE POLICY "Public read published hero slides" 
  ON public.website_hero_slides 
  FOR SELECT 
  USING (true);

-- Admins have full access to manage hero slides
DROP POLICY IF EXISTS "Admins manage hero slides" ON public.website_hero_slides;
CREATE POLICY "Admins manage hero slides" 
  ON public.website_hero_slides 
  FOR ALL 
  USING (true);

-- Ensure id_card_settings key for store_hero_slides is ready
INSERT INTO public.id_card_settings (id, academic_session, updated_at)
VALUES ('store_hero_slides', '[]', NOW())
ON CONFLICT (id) DO NOTHING;
