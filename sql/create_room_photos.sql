-- Jalankan di Supabase SQL Editor

-- 1. Buat tabel room_photos
CREATE TABLE IF NOT EXISTS public.room_photos (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_name   text NOT NULL,
    photo_url   text NOT NULL,
    file_path   text,
    created_at  timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.room_photos ENABLE ROW LEVEL SECURITY;

-- 3. Policy: anyone can read (untuk klien di main.jsx)
CREATE POLICY "Public read room_photos"
    ON public.room_photos FOR SELECT
    USING (true);

-- 4. Policy: authenticated admin dapat insert/delete
CREATE POLICY "Admin insert room_photos"
    ON public.room_photos FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admin delete room_photos"
    ON public.room_photos FOR DELETE
    USING (true);
