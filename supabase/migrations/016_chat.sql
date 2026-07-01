-- ============================================================
-- 016_chat.sql
-- Global chat feature for Farm Cup 2026
-- ============================================================

-- Track when each user last visited /chat (for unread dot on homepage)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_chat_visit_at TIMESTAMPTZ;

-- ---- chat_messages table ----
CREATE TABLE public.chat_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message    TEXT        NOT NULL CHECK (char_length(message) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX chat_messages_created_at_idx ON public.chat_messages(created_at DESC);
CREATE INDEX chat_messages_user_id_idx    ON public.chat_messages(user_id);

-- ---- RLS ----
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Regular users see only non-deleted messages
CREATE POLICY "chat_messages: users read non-deleted"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Admin/dev see everything (permissive policies OR together)
CREATE POLICY "chat_messages: admin read all"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (is_admin());

-- Anyone authenticated can insert their own messages
CREATE POLICY "chat_messages: insert own"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only admin/dev can soft-delete or restore (UPDATE)
CREATE POLICY "chat_messages: admin update"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- No DELETE policy — hard deletes are not permitted

-- ---- Default profanity filter ----
INSERT INTO public.settings (key, value) VALUES
  ('profanity_filter', '["fuck","shit","bitch","cunt","dick","cock","whore","nigger","nigga","joder","coño","puta","mierda","pendejo","cabrón","chingar","culo","carajo","maricón"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---- Enable Supabase Realtime ----
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
