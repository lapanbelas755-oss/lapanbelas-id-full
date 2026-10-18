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

-- 4. Enable RLS
ALTER TABLE public.crew_job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_rate_cards ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Public read crew_job_assignments" ON public.crew_job_assignments FOR SELECT USING (true);
CREATE POLICY "Public insert/update crew_job_assignments" ON public.crew_job_assignments FOR ALL USING (true);
CREATE POLICY "Public read crew_rate_cards" ON public.crew_rate_cards FOR SELECT USING (true);
CREATE POLICY "Public insert/update crew_rate_cards" ON public.crew_rate_cards FOR ALL USING (true);
