-- =========================================================================
-- NACOS FUTO: AUTOMATED PAYMENT EMAIL NOTIFICATIONS SCHEMA
-- File: packages/supabase/migrations/20261013_automated_payment_email_notifications.sql
-- 
-- System of Record for:
-- 1. Idempotent payment email notifications across all payment categories
--    (Student ID Card, Departmental Dues, Levies, Event Tickets, Custom)
-- 2. Delivery outcomes tracking (Queued, Sent, Failed)
-- 3. Concurrency-safe unique constraint on (payment_reference, notification_type)
-- 4. Admin monitoring and safe retry tracking
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. PAYMENT NOTIFICATIONS TABLE (SYSTEM OF RECORD FOR TRANSACTION EMAILS)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.payment_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID,
  payment_reference TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL DEFAULT 'PAYMENT_SUCCESS', -- 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_REFUNDED'
  recipient_email TEXT NOT NULL,
  student_name TEXT,
  registration_number VARCHAR(50),
  payment_type VARCHAR(80) NOT NULL DEFAULT 'CUSTOM',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  status VARCHAR(30) NOT NULL DEFAULT 'queued', -- 'queued', 'sent', 'failed'
  provider VARCHAR(50) NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uq_payment_notifications_ref_type UNIQUE (payment_reference, notification_type),
  CONSTRAINT chk_notification_status CHECK (status IN ('queued', 'processing', 'sent', 'failed'))
);

-- Optimization & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_payment_notif_ref ON public.payment_notifications (payment_reference);
CREATE INDEX IF NOT EXISTS idx_payment_notif_status ON public.payment_notifications (status);
CREATE INDEX IF NOT EXISTS idx_payment_notif_reg ON public.payment_notifications (registration_number);
CREATE INDEX IF NOT EXISTS idx_payment_notif_email ON public.payment_notifications (recipient_email);
CREATE INDEX IF NOT EXISTS idx_payment_notif_created ON public.payment_notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_notif_type ON public.payment_notifications (payment_type, notification_type);

-- =========================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  -- Backend Service Role & Serverless Access (Full CRUD)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'payment_notifications' 
      AND policyname = 'Service role and backend payment_notifications access'
  ) THEN
    CREATE POLICY "Service role and backend payment_notifications access" 
      ON public.payment_notifications 
      FOR ALL 
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Authenticated Students can view only their own payment notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'payment_notifications' 
      AND policyname = 'Students can view own payment notifications'
  ) THEN
    CREATE POLICY "Students can view own payment notifications" 
      ON public.payment_notifications 
      FOR SELECT 
      TO authenticated 
      USING (
        registration_number = (auth.jwt() ->> 'registration_number') 
        OR recipient_email = (auth.jwt() ->> 'email')
      );
  END IF;

  -- Admins can view and manage all payment notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'payment_notifications' 
      AND policyname = 'Admins can view and manage all payment notifications'
  ) THEN
    CREATE POLICY "Admins can view and manage all payment notifications" 
      ON public.payment_notifications 
      FOR ALL 
      TO authenticated 
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_scopes 
          WHERE (user_id = auth.uid() OR email = (auth.jwt() ->> 'email'))
          AND is_active = true
        )
      );
  END IF;
END $$;

