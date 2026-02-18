-- RUN THIS IN THE SUPABASE SQL EDITOR TO FIX IMAGE UPLOADS

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to read images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'images' );

-- 3. Allow authenticated users to upload images
-- Adjust 'authenticated' to 'anon' if you haven't set up auth yet, 
-- but 'authenticated' is safer for production.
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK ( 
  bucket_id = 'images' 
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon') 
);

-- 4. Allow users to update/delete their own uploads (optional but recommended)
CREATE POLICY "Manage own uploads"
ON storage.objects FOR ALL
USING ( bucket_id = 'images' )
WITH CHECK ( bucket_id = 'images' );
