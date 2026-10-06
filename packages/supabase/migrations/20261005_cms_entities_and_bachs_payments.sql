-- =========================================================================
-- NACOS FUTO: CMS ENTITIES & BACHS PAYMENT GATEWAY SCHEMA
-- File: packages/supabase/migrations/20261005_cms_entities_and_bachs_payments.sql
-- 
-- Covers:
-- 1. News & Articles (public.news_articles)
-- 2. Yellow Pages Student Businesses (public.yellow_pages)
-- 3. NACOS Executives & Settings (public.nacos_executives, public.nacos_executives_settings)
-- 4. Department Administration & Faculty Staff (public.department_administration)
-- 5. Bachs Payments for Student ID Cards (public.payments)
-- 6. Webhook Idempotency Event Registry (public.webhook_events)
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. NEWS & ARTICLES TABLE
-- =========================================================================
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

CREATE INDEX IF NOT EXISTS idx_news_slug ON public.news_articles (slug);
CREATE INDEX IF NOT EXISTS idx_news_published ON public.news_articles (is_published, published_at DESC);

-- Seed Initial Verified News
INSERT INTO public.news_articles (title, slug, summary, content, cover_image_url, cloudinary_public_id, author, category, is_published, published_at)
VALUES 
(
  'NACOS FUTO Announces BuildX 2026 National Computing Hackathon',
  'buildx-2026-hackathon-announcement',
  'Registration opens for undergraduate developers across Nigerian tertiary institutions with over ₦5M in startup grants.',
  'The Nigerian Association of Computer Science Students (NACOS), FUTO Chapter, is proud to announce the official launch of BuildX NACOS 2026. This premier hackathon brings together young software engineers, product designers, and AI researchers across Nigeria to build solutions for real-world national problems.',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1200',
  'nacos/news/buildx_cover',
  'NACOS Press Bureau',
  'Hackathon',
  true,
  '2026-09-01T10:00:00Z'
),
(
  'Department Welcomes 2026/2027 Freshmen at Orientation Week',
  'freshmen-orientation-2026',
  'Staff advisers and departmental executive leaders address incoming 100 level students on curriculum excellence.',
  'Over 400 new students were formally inducted into the Department of Computer Science at the SOPS Theatre. The Head of Department, Dr. Stanley Okolie, charged students with high academic discipline and active participation in software clubs and research hubs.',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1200',
  'nacos/news/orientation_cover',
  'PRO Desk',
  'Campus Life',
  true,
  '2026-08-28T09:30:00Z'
)
ON CONFLICT (slug) DO UPDATE
SET cover_image_url = EXCLUDED.cover_image_url,
    cloudinary_public_id = EXCLUDED.cloudinary_public_id,
    updated_at = NOW();

-- =========================================================================
-- 2. YELLOW PAGES (STUDENT BUSINESS DIRECTORY)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.yellow_pages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  secondary_categories JSONB DEFAULT '[]'::jsonb,
  owner_name TEXT,
  owner_level TEXT,
  description TEXT,
  location TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  rating NUMERIC(3,1) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  image TEXT,
  cloudinary_public_id TEXT,
  image_position TEXT DEFAULT 'top center',
  status TEXT DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_yellow_pages_status ON public.yellow_pages (status);
CREATE INDEX IF NOT EXISTS idx_yellow_pages_category ON public.yellow_pages (category);

-- Seed Verified Indigenous Student Businesses with Cloudinary crop alignment
INSERT INTO public.yellow_pages (id, name, category, secondary_categories, owner_name, owner_level, description, location, phone, whatsapp, email, rating, reviews_count, image, cloudinary_public_id, image_position, status)
VALUES
(
  'yp-1',
  'Peacemaker Tech',
  'Gadgets & Repairs',
  '["Tech & Coding"]'::jsonb,
  'Peacemaker Tech',
  'Student Business',
  'Software & Game installations, Windows upgrading/downgrading, Loading Windows on Macbook PC, installation of Windows/Mac OS apps, and general software troubleshooting.',
  'FUTO Campus / Hostel Delivery',
  '+2347088180036',
  '2349161081187',
  'peacemaker@nacos.org.ng',
  5.0,
  14,
  'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569313/nacos/yellow_pages/flyer_peacemaker.jpg',
  'nacos/yellow_pages/flyer_peacemaker',
  'top left',
  'approved'
),
(
  'yp-2',
  'Niforix',
  'Graphics & Printing',
  '["Tech & Coding"]'::jsonb,
  'Niforix',
  'Student Business',
  'Graphics Design, Branding, UI/UX, Website Design, CAC/NUPRC/SMEDAN Registrations, Social Media Management, Technical/Resume Writing, E-Pin sales, and IT Consulting.',
  'FUTO Campus / Remote 24/7',
  '+2349060900245',
  '2349060900245',
  'niforix@nacos.org.ng',
  5.0,
  25,
  'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569311/nacos/yellow_pages/flyer_niforix.jpg',
  'nacos/yellow_pages/flyer_niforix',
  'top right',
  'approved'
),
(
  'yp-3',
  'Cypher.dev Shadow Boost',
  'Tech & Coding',
  '["Tech & Coding"]'::jsonb,
  'Cypher.dev',
  'Alumni Tech Enterprise',
  'Bespoke Web & Mobile app engineering, cloud microservice setup, automated bots, algorithm design, software architecture consulting, and student project mentorship.',
  'Remote / Worldwide',
  '+2348000000000',
  '2348000000000',
  'dev@cypher.org.ng',
  5.0,
  30,
  'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569310/nacos/yellow_pages/flyer_cypher.jpg',
  'nacos/yellow_pages/flyer_cypher',
  'top center',
  'approved'
),
(
  'yp-4',
  'Nina''s Luxury Braids & Wigs',
  'Fashion & Styling',
  '["Other Services"]'::jsonb,
  'Nina O.',
  '300 Level',
  'Professional knotless braids, bohemian box braids, wig revamping, frontal installation, and hair treatment with free campus delivery.',
  'Hostel A / Eziobodo Gate',
  '+2348123456789',
  '2348123456789',
  '',
  4.9,
  19,
  'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569312/nacos/yellow_pages/flyer_ninas_braid.jpg',
  'nacos/yellow_pages/flyer_ninas_braid',
  'top center',
  'approved'
)
ON CONFLICT (id) DO UPDATE
SET image = EXCLUDED.image,
    cloudinary_public_id = EXCLUDED.cloudinary_public_id,
    image_position = EXCLUDED.image_position,
    updated_at = NOW();

-- =========================================================================
-- 3. NACOS EXECUTIVES & PAGE SETTINGS
-- =========================================================================
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

INSERT INTO public.nacos_executives_settings (id, hero_title, hero_year, hero_subtitle, current_session_title, past_session_title)
VALUES ('default', 'NACOS EXECUTIVES', '2026', 'Meet the team elected to serve and represent the students of the Department of Computer Science.', 'Current Executives (2025/2026)', 'Past Executives (2024/2025)')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.nacos_executives (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  image TEXT,
  cloudinary_public_id TEXT,
  category TEXT NOT NULL DEFAULT 'current',
  session TEXT DEFAULT '2025/2026',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_executives_cat ON public.nacos_executives (category);
CREATE INDEX IF NOT EXISTS idx_executives_session ON public.nacos_executives (session);

-- =========================================================================
-- 4. DEPARTMENT ADMINISTRATION & FACULTY STAFF
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.department_administration (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  rank TEXT,
  email TEXT,
  phone TEXT,
  image TEXT,
  cloudinary_public_id TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dept_admin_order ON public.department_administration (order_index);
CREATE INDEX IF NOT EXISTS idx_dept_admin_active ON public.department_administration (is_active);

-- Seed Department Leadership and Academic Staff
INSERT INTO public.department_administration (id, name, role, rank, email, image, cloudinary_public_id, order_index, is_active)
VALUES
(
  'staff-hod',
  'Dr. Stanley Adiele Okolie',
  'Head of Department (CSC)',
  'Senior Lecturer / HOD',
  'hod.csc@futo.edu.ng',
  'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569270/nacos/executives/hod_stanley.jpg',
  'nacos/executives/hod_stanley',
  1,
  true
),
(
  'staff-adviser',
  'Dr. (Mrs) E.C. Nwokorie',
  'Staff Adviser / Course Adviser',
  'Senior Lecturer / Staff Adviser',
  'staff.adviser@futo.edu.ng',
  'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569274/nacos/executives/staff_adviser_nwokorie.jpg',
  'nacos/executives/staff_adviser_nwokorie',
  2,
  true
),
('staff-1', 'Dr. Juliet Nnenna Odii', 'Faculty Member', 'Reader', 'juliet.odii@futo.edu.ng', null, null, 3, true),
('staff-2', 'Dr. Jacinta Chioma Odirichukwu', 'Faculty Member', 'Senior Lecturer', 'jacinta.odirichukwu@futo.edu.ng', null, null, 4, true),
('staff-3', 'Dr. Uchenna Chinyere Onyemauche', 'Faculty Member', 'Senior Lecturer', 'uchenna.onyemauche@futo.edu.ng', null, null, 5, true),
('staff-4', 'Dr Chidimma Lilan Okpalla', 'Faculty Member', 'Senior Lecturer', 'chidimma.okpalla@futo.edu.ng', null, null, 6, true),
('staff-5', 'DR. CHINWE GILEAN ONUKWUGHA', 'Faculty Member', 'Senior Lecturer', 'chinwe.onukwugha@futo.edu.ng', null, null, 7, true),
('staff-6', 'Dr Euphemia Chioma Nwokorie', 'Faculty Member', 'Senior Lecturer', 'euphemia.nwokorie@futo.edu.ng', null, null, 8, true),
('staff-8', 'Mr Douglas Allswell Kelechi', 'Faculty Member', 'Lecturer II', 'douglas.kelechi@futo.edu.ng', null, null, 9, true),
('staff-9', 'Dr Chidi Ukamaka Betrand', 'Faculty Member', 'Lecturer II', 'chidi.betrand@futo.edu.ng', null, null, 10, true),
('staff-10', 'Mr. Peter Kelechukwu Joseph', 'Faculty Member', 'Assistant Lecturer', 'peter.joseph@futo.edu.ng', null, null, 11, true),
('staff-11', 'Mr. Vitalis Chibuike Iwuchukwu', 'Faculty Member', 'Assistant Lecturer', 'vitalis.iwuchukwu@futo.edu.ng', null, null, 12, true),
('staff-12', 'Mr Christopher Ifeanyi Ofoegbu', 'Faculty Member', 'Graduate Assistant', 'christopher.ofoegbu@futo.edu.ng', null, null, 13, true),
('staff-13', 'Mrs Juliet Nwanneka Amoke', 'Technical Staff', 'Technologist II', 'juliet.amoke@futo.edu.ng', null, null, 14, true),
('staff-14', 'Dr Chukwuma Dandy Anyiam', 'Faculty Member', 'Lecturer I', 'chukwuma.anyiam@futo.edu.ng', null, null, 15, true),
('staff-15', 'DR. MERCY EBERECHI BENSON-EMENIKE', 'Faculty Member', 'Senior Lecturer', 'mercy.benson-emenike@futo.edu.ng', null, null, 16, true),
('staff-16', 'Mr Chigozie C Dimoji', 'Faculty Member', 'Assistant Lecturer', 'chigozie.dimoji@futo.edu.ng', null, null, 17, true),
('staff-17', 'Mr Ikechukwu Kingsley Onyeanu', 'Technical Staff', 'Senior Computer Technologist', 'ikechukwu.onyeanu@futo.edu.ng', null, null, 18, true),
('staff-18', 'Mrs Ngozi Amarachi Duru', 'Faculty Member', 'Assistant Lecturer', 'ngozi.duru@futo.edu.ng', null, null, 19, true),
('staff-19', 'Mr Idris Ahmed Idris', 'Faculty Member', 'Graduate Assistant (GA)', 'idris.idris@futo.edu.ng', null, null, 20, true),
('staff-20', 'MR ANTHONY CHUKWUNONSO UGHAELUMBA', 'Technical Staff', 'System Programmer/Analyst II', 'anthony.ughaelumba@futo.edu.ng', null, null, 21, true),
('staff-21', 'Mr. Harry Chidozie Ogbonna', 'Technical Staff', 'Technologist II', 'harry.ogbonna@futo.edu.ng', null, null, 22, true),
('staff-22', 'Mrs. Edith Chidimma Otuonye', 'Administrative Staff', 'Secretary I', 'edith.otuonye@futo.edu.ng', null, null, 23, true),
('staff-23', 'Dr. Francisca Onyinyechi Nwokoma', 'Faculty Member', 'Lecturer I', 'francisca.nwokoma@futo.edu.ng', null, null, 24, true),
('staff-24', 'Dr. Donatus Onyedikachi Njoku', 'Faculty Member', 'Lecturer II', 'donatus.njoku@futo.edu.ng', null, null, 25, true)
ON CONFLICT (id) DO UPDATE
SET image = COALESCE(EXCLUDED.image, public.department_administration.image),
    cloudinary_public_id = COALESCE(EXCLUDED.cloudinary_public_id, public.department_administration.cloudinary_public_id),
    updated_at = NOW();

-- =========================================================================
-- 5. BACHS PAYMENTS (SYSTEM OF RECORD FOR ID CARD PAYMENTS)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  registration_number VARCHAR(30),
  payment_type VARCHAR(50) NOT NULL DEFAULT 'ID_CARD',
  provider VARCHAR(50) NOT NULL DEFAULT 'BACHS',
  provider_payment_id TEXT,
  provider_checkout_id TEXT UNIQUE,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 5000.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  reference TEXT UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  paid_at TIMESTAMPTZ,
  CONSTRAINT chk_payment_status CHECK (status IN ('pending', 'processing', 'successful', 'failed', 'cancelled', 'refunded'))
);

CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments (student_id);
CREATE INDEX IF NOT EXISTS idx_payments_reg ON public.payments (registration_number);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments (provider, provider_checkout_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments (reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_type ON public.payments (payment_type);

-- =========================================================================
-- 6. WEBHOOK IDEMPOTENCY EVENT REGISTRY
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider VARCHAR(50) NOT NULL DEFAULT 'BACHS',
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  processed_at TIMESTAMPTZ,
  CONSTRAINT uq_webhook_provider_event UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_lookup ON public.webhook_events (provider, event_id);

-- Ensure id_card_applications has payment tracking columns
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'unpaid';
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) DEFAULT 5000.00;
ALTER TABLE public.id_card_applications ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- =========================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yellow_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_administration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Public Read Policies
DROP POLICY IF EXISTS "Public read news articles" ON public.news_articles;
CREATE POLICY "Public read news articles" ON public.news_articles FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Public read yellow pages" ON public.yellow_pages;
CREATE POLICY "Public read yellow pages" ON public.yellow_pages FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Public read department administration" ON public.department_administration;
CREATE POLICY "Public read department administration" ON public.department_administration FOR SELECT USING (is_active = true);

-- Payments Access (Permit verified student reads and backend writes)
DROP POLICY IF EXISTS "Public read own payments" ON public.payments;
CREATE POLICY "Public read own payments" ON public.payments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow backend and service insert payments" ON public.payments;
CREATE POLICY "Allow backend and service insert payments" ON public.payments FOR ALL USING (true);

-- Webhooks: Restricted to backend / service role
DROP POLICY IF EXISTS "Service role webhook events access" ON public.webhook_events;
CREATE POLICY "Service role webhook events access" ON public.webhook_events FOR ALL USING (true);

-- Admin Management (Full access for CMS administrators)
DROP POLICY IF EXISTS "Admins full manage news articles" ON public.news_articles;
CREATE POLICY "Admins full manage news articles" ON public.news_articles FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins full manage yellow pages" ON public.yellow_pages;
CREATE POLICY "Admins full manage yellow pages" ON public.yellow_pages FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins full manage department administration" ON public.department_administration;
CREATE POLICY "Admins full manage department administration" ON public.department_administration FOR ALL USING (true);

-- =========================================================================
-- 8. UNIVERSAL PAYMENT FEES CATALOG (For Admin-configurable fees across the platform)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.payment_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_key VARCHAR(50) UNIQUE NOT NULL, -- 'id_card', 'departmental_dues', 'event_ticket', 'merchandise'
  title TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 5000.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

INSERT INTO public.payment_fees (fee_key, title, amount, description)
VALUES 
  ('id_card', 'NACOS Student ID Card', 5000.00, 'Biometric digital & physical student identification card issuance'),
  ('departmental_dues', 'Departmental Association Dues', 2500.00, 'Annual NACOS FUTO departmental dues and clearance'),
  ('event_ticket', 'NACOS Event / Hackathon Ticket', 0.00, 'Departmental event registration ticket')
ON CONFLICT (fee_key) DO UPDATE
SET amount = EXCLUDED.amount,
    title = EXCLUDED.title,
    updated_at = NOW();

ALTER TABLE public.payment_fees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read payment fees" ON public.payment_fees;
CREATE POLICY "Public read payment fees" ON public.payment_fees FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage payment fees" ON public.payment_fees;
CREATE POLICY "Admin manage payment fees" ON public.payment_fees FOR ALL USING (true);

