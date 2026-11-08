-- ==============================================================================
-- 18STUDIO - CREW PORTAL & PAYROLL SYSTEM SQL MIGRATION
-- Run this in Supabase SQL Editor if you want dedicated database tables.
-- The backend system has an automatic fallback to the settings table,
-- so the portal is functional immediately even before running this SQL.
-- ==============================================================================

-- 1. Table: crew_job_assignments
CREATE TABLE IF NOT EXISTS public.crew_job_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id TEXT NOT NULL,
    crew_id UUID REFERENCES public.crew_members(id) ON DELETE SET NULL,
    crew_name TEXT NOT NULL,
    crew_phone TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Fotografer',
    job_category TEXT DEFAULT 'Wedding',
    fee_amount NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL', 
    -- Status values: 'PENDING_APPROVAL', 'ACCEPTED', 'REJECTED', 'READY_ON_SITE', 'FILES_SUBMITTED', 'FILES_VERIFIED', 'PAYOUT_REQUESTED', 'PAID'
    rejection_reason TEXT,
    event_date DATE,
    h1_notified BOOLEAN DEFAULT FALSE,
    h1_notified_at TIMESTAMPTZ,
    
    -- Check-in / Presence fields
    checkin_photo_url TEXT,
    checkin_lat NUMERIC,
    checkin_lng NUMERIC,
    checkin_address TEXT,
    checkin_at TIMESTAMPTZ,
    
    -- File Submission fields
    submission_type TEXT, -- 'drive' or 'kantor'
    submission_link TEXT,
    submission_notes TEXT,
    submitted_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    
    -- Salary / Payout fields
    payout_bank TEXT,
    payout_account_number TEXT,
    payout_account_name TEXT,
    payout_requested_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payout_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for fast queries
CREATE INDEX IF NOT EXISTS idx_crew_assignments_phone ON public.crew_job_assignments(crew_phone);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_appt ON public.crew_job_assignments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_status ON public.crew_job_assignments(status);

-- 2. Table: crew_rate_cards
CREATE TABLE IF NOT EXISTS public.crew_rate_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL, -- 'Wedding', 'Prewedding', 'Studio Lapanbelas', 'Wisuda', 'Event / Corporate', etc.
    role TEXT NOT NULL,     -- 'Lead Fotografer (Solo)', 'Backup / Second Fotografer', 'Lead Videografer', 'Backup / Second Videografer', 'Asisten Crew'
    standard_fee NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(category, role)
);

-- 3. Initial Default Rate Cards
INSERT INTO public.crew_rate_cards (category, role, standard_fee, description)
VALUES 
    ('Wedding', 'Lead Fotografer (Solo)', 750000, 'Fotografer utama acara wedding'),
    ('Wedding', 'Backup / Second Fotografer', 450000, 'Second shooter / candid fotografer'),
    ('Wedding', 'Lead Videografer', 750000, 'Videografer utama acara wedding'),
    ('Wedding', 'Backup / Second Videografer', 450000, 'Second videografer'),
    ('Wedding', 'Asisten Crew', 200000, 'Asisten lighting dan perlengkapan'),
    ('Prewedding', 'Lead Fotografer (Solo)', 500000, 'Fotografer sesi prewedding'),
    ('Prewedding', 'Lead Videografer', 500000, 'Videografer cinematic prewedding'),
    ('Studio Lapanbelas', 'Lead Fotografer (Solo)', 250000, 'Sesi studio photoshoot'),
    ('Wisuda', 'Lead Fotografer (Solo)', 350000, 'Dokumentasi wisuda outdoor/indoor'),
    ('Event / Corporate', 'Lead Fotografer (Solo)', 600000, 'Dokumentasi acara korporat / seminar'),
    ('Event / Corporate', 'Lead Videografer', 600000, 'Videografi acara korporat / seminar')
ON CONFLICT (category, role) DO NOTHING;

-- 4. Table: crew_contracts (Legal E-Contract & Digital Signature)
CREATE TABLE IF NOT EXISTS public.crew_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    crew_id UUID REFERENCES public.crew_members(id) ON DELETE SET NULL,
    crew_name TEXT NOT NULL,
    crew_phone TEXT NOT NULL,
    contract_type TEXT NOT NULL DEFAULT 'lapanbelas.id', -- 'studio' (1 tahun) or 'lapanbelas.id' (2-3 tahun)
    duration_years INT NOT NULL DEFAULT 2,              -- 1, 2, or 3
    nik TEXT,
    signature_url TEXT,
    signed BOOLEAN NOT NULL DEFAULT FALSE,
    signed_at TIMESTAMPTZ,
    start_date DATE,
    end_date DATE,
    ip_address TEXT,
    user_agent TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(crew_phone)
);

-- 5. Table: push_subscriptions (Web Push VAPID untuk Notifikasi Layar Kunci HP Kru & Admin)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_type TEXT NOT NULL DEFAULT 'guest', -- 'admin', 'crew', 'client', 'guest'
    user_id TEXT, -- crew phone or admin id
    device_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions (user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON public.push_subscriptions (endpoint);

-- 6. Enable RLS
ALTER TABLE public.crew_job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 7. Policies (Idempotent: Drop first if already exists to avoid 42710 error)
DROP POLICY IF EXISTS "Public read crew_job_assignments" ON public.crew_job_assignments;
CREATE POLICY "Public read crew_job_assignments" ON public.crew_job_assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert/update crew_job_assignments" ON public.crew_job_assignments;
CREATE POLICY "Public insert/update crew_job_assignments" ON public.crew_job_assignments FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read crew_rate_cards" ON public.crew_rate_cards;
CREATE POLICY "Public read crew_rate_cards" ON public.crew_rate_cards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert/update crew_rate_cards" ON public.crew_rate_cards;
CREATE POLICY "Public insert/update crew_rate_cards" ON public.crew_rate_cards FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read crew_contracts" ON public.crew_contracts;
CREATE POLICY "Public read crew_contracts" ON public.crew_contracts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert/update crew_contracts" ON public.crew_contracts;
CREATE POLICY "Public insert/update crew_contracts" ON public.crew_contracts FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Public read push_subscriptions" ON public.push_subscriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert/update push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Public insert/update push_subscriptions" ON public.push_subscriptions FOR ALL USING (true);
