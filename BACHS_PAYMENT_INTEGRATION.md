# NACOS FUTO: Bachs Payment Gateway Integration for Student ID Card

This document provides a comprehensive technical overview and operational guide for the **Bachs (bachs.io)** payment gateway integration built for the **NACOS FUTO Student Portal** ID card issuance system.

---

## 1. Architectural Overview & Security Model

```
+-----------------------------------------------------------------------------------------+
|                                    STUDENT PORTAL                                       |
|                                                                                         |
|  1. Student Profile Check  ----->  2. Click "Pay ₦5,000 with Bachs"                     |
|                                                     |                                   |
|                                                     v                                   |
|                                       POST /api/payments/id-card/create-checkout        |
+-----------------------------------------------------|-----------------------------------+
                                                      |
                                                      v
+-----------------------------------------------------------------------------------------+
|                                  SERVERLESS / BACKEND                                   |
|                                                                                         |
|  • Server calculates authoritative fee: ₦5,000 NGN (NACOS_ID_CARD_AMOUNT)              |
|  • Client amount inputs are strictly ignored / rejected                                 |
|  • Validates institutional student session (matric number & full name)                  |
|  • Checks if student has already completed payment (prevents duplicate charges)         |
|  • Generates internal reference: NACOS-IDCARD-{MATRIC}-{TIMESTAMP}                      |
|  • Inserts pending record into Supabase `payments` table                                |
|  • Calls Bachs API (POST /v1/checkout/sessions) with Bearer token                       |
|  • Returns secure checkout URL to frontend                                              |
+-----------------------------------------------------|-----------------------------------+
                                                      |
                                                      v
+-----------------------------------------------------------------------------------------+
|                                  BACHS PAYMENT GATEWAY                                  |
|                                                                                         |
|  • Student completes card, bank transfer, or USSD payment                              |
|  • Bachs sends authoritative server-to-server webhook:                                  |
|    POST /api/webhooks/bachs with HMAC-SHA256 signature                                 |
+-----------------------------------------------------|-----------------------------------+
                                                      |
                                                      v
+-----------------------------------------------------------------------------------------+
|                                AUTHORITATIVE WEBHOOK                                    |
|                                                                                         |
|  • Verifies HMAC-SHA256 signature using BACHS_WEBHOOK_SECRET                            |
|  • Validates idempotency against `webhook_events` (safe against duplicate retries)      |
|  • Verifies transaction amount >= ₦5,000 and currency === 'NGN'                         |
|  • Updates `payments.status` to 'successful'                                            |
|  • Updates `id_card_applications.payment_status` to 'paid'                              |
|  • Marks webhook event as processed                                                     |
+-----------------------------------------------------|-----------------------------------+
                                                      |
                                                      v
+-----------------------------------------------------------------------------------------+
|                                STUDENT ID CARD LIFECYCLE                                |
|                                                                                         |
|  • Frontend polling verifies payment status via GET /api/payments/id-card/status        |
|  • State 2 (Pending Payment) seamlessly transitions to State 3 (Passport Upload)        |
|  • Student uploads high-resolution front-facing passport photograph                     |
|  • Student submits for Portal Administrator review                                      |
|  • Portal Administrator reviews verified Bachs payment reference and approves           |
|  • Official two-sided CR-80 digital ID card is generated with QR verification code       |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Environment Variables Configuration

Ensure the following variables are configured in your root `.env` (and Vercel environment settings for production):

```env
# -----------------------------------------------------------------------------
# Bachs Payment Gateway (ID Card Issuance)
# -----------------------------------------------------------------------------
BACHS_ENVIRONMENT=sandbox                        # Use 'production' for live payments
BACHS_API_KEY=bachs_test_sample_key_2026         # Private server-side API key (Never expose in frontend)
BACHS_WEBHOOK_SECRET=bachs_whsec_sample_secret   # HMAC-SHA256 secret for webhook verification
BACHS_ID_CARD_PRODUCT_ID=nacos_id_card_2026      # Dedicated product identifier
NACOS_ID_CARD_AMOUNT=5000                        # Authoritative fee in NGN
NACOS_ID_CARD_CURRENCY=NGN                       # Authoritative currency
```

> **Security Guarantee:** Neither `BACHS_API_KEY` nor `BACHS_WEBHOOK_SECRET` are prefixed with `VITE_`. They are only read in backend/serverless environments.

---

## 3. Database Schema (Supabase SQL)

To create the required database tables and security policies, run the following SQL script directly in the **Supabase Dashboard -> SQL Editor**:

```sql
-- ============================================================================
-- NACOS FUTO: Migration Script - Bachs Payment Gateway & CMS Entities
-- ============================================================================

-- 1. PAYMENTS TABLE (Authoritative transaction log)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT,
    registration_number TEXT NOT NULL,
    payment_type TEXT NOT NULL DEFAULT 'ID_CARD', -- 'ID_CARD', 'DUES', 'EVENT'
    provider TEXT NOT NULL DEFAULT 'BACHS',       -- 'BACHS', 'REMITA', 'PAYSTACK'
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    status TEXT NOT NULL DEFAULT 'pending',       -- 'pending', 'successful', 'failed', 'cancelled'
    reference TEXT UNIQUE NOT NULL,
    provider_checkout_id TEXT,
    provider_payment_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_reg_type ON public.payments (registration_number, payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments (reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);

-- 2. WEBHOOK EVENTS TABLE (Idempotency deduplication)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'BACHS',
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uk_provider_event UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_id ON public.webhook_events (provider, event_id);

-- 3. ENSURE ID_CARD_APPLICATIONS HAS PAYMENT LINKAGE COLUMNS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='id_card_applications' AND column_name='payment_status') THEN
        ALTER TABLE public.id_card_applications ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='id_card_applications' AND column_name='payment_reference') THEN
        ALTER TABLE public.id_card_applications ADD COLUMN payment_reference TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='id_card_applications' AND column_name='paid_at') THEN
        ALTER TABLE public.id_card_applications ADD COLUMN paid_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='id_card_applications' AND column_name='amount') THEN
        ALTER TABLE public.id_card_applications ADD COLUMN amount NUMERIC(12, 2) DEFAULT 5000;
    END IF;
END $$;

-- 4. CMS SYNCHRONIZATION TABLES (News, Yellow Pages, Executives, Administration)
CREATE TABLE IF NOT EXISTS public.news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    excerpt TEXT,
    content TEXT,
    image_url TEXT,
    author_name TEXT DEFAULT 'NACOS Press',
    published_at TIMESTAMPTZ DEFAULT now(),
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.yellow_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tagline TEXT,
    category TEXT NOT NULL,
    founder_name TEXT,
    founder_dept TEXT DEFAULT 'Computer Science',
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    instagram TEXT,
    website TEXT,
    image_url TEXT,
    image_position TEXT DEFAULT 'center center',
    badge TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nacos_executives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    role_title TEXT NOT NULL,
    tenure TEXT NOT NULL DEFAULT '2025/2026',
    is_current BOOLEAN DEFAULT true,
    photo_url TEXT,
    bio TEXT,
    department TEXT DEFAULT 'Computer Science',
    phone TEXT,
    email TEXT,
    linkedin_url TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.department_administration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    title TEXT NOT NULL,
    role_category TEXT NOT NULL, -- 'hod', 'dean', 'academic_staff', 'technical_staff'
    degrees TEXT,
    specialization TEXT,
    photo_url TEXT,
    office_location TEXT,
    email TEXT,
    phone TEXT,
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS) Configuration
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yellow_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nacos_executives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_administration ENABLE ROW LEVEL SECURITY;

-- Anonymous and authenticated read policies
CREATE POLICY "Public read for news_articles" ON public.news_articles FOR SELECT USING (true);
CREATE POLICY "Public read for yellow_pages" ON public.yellow_pages FOR SELECT USING (true);
CREATE POLICY "Public read for nacos_executives" ON public.nacos_executives FOR SELECT USING (true);
CREATE POLICY "Public read for department_administration" ON public.department_administration FOR SELECT USING (true);
CREATE POLICY "Allow read on payments for owners" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Service role full access payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Service role full access webhooks" ON public.webhook_events FOR ALL USING (true);
```

---

## 4. Local Sandbox Testing Workflow

1. Start all applications:
   ```bash
   npm run dev:all
   ```
2. Log in as a student in the Student Portal (`http://localhost:5174/login`).
3. Navigate to **ID Card** (`/id-card`).
4. Click **Apply for ID Card** (transitions from State 1 to State 2: Payment Required).
5. State 2 displays:
   - Official Fee: **₦5,000.00**
   - Gateway: **Bachs (bachs.io)**
   - Security Notice: **256-bit encrypted • Authoritative server verification**
6. Click **Pay ₦5,000 with Bachs**:
   - In sandbox mode without live keys, a secure sandbox checkout modal launches immediately.
   - Click **Complete Test Payment (Simulate Webhook)**.
7. The server-side simulation triggers `processBachsWebhook()`:
   - Validates event payload
   - Saves record into `webhook_events` table (idempotency checked)
   - Updates `payments` table status to `successful`
   - Unlocks `id_card_applications.payment_status = 'paid'`
8. The UI immediately transitions to **State 3: Upload Passport Photograph**.
9. The Portal Admin at `http://localhost:5174/admin-hub` can review the student's submission with the verified Bachs payment reference and approve ID generation.

---

## 5. Webhook Signature Verification

All webhook requests received at `POST /api/webhooks/bachs` must contain the header `X-Bachs-Signature`. The signature is computed as:

$$\text{HMAC-SHA256}(\text{rawRequestBody}, \text{BACHS\_WEBHOOK\_SECRET})$$

Timing-safe comparison (`crypto.timingSafeEqual`) prevents timing attacks. Webhook deliveries that fail signature verification are immediately rejected with HTTP 401.
