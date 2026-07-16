-- ============================================================
-- 022_chat_images.sql
-- Add image support to group chat.
-- ============================================================

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS image_url text;

-- Public storage bucket for chat images (5 MB max, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-images');

-- Anyone can view
CREATE POLICY "Chat images are publicly accessible"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-images');
