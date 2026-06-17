-- Persist each user's preferred UI language for the i18n system.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language text;
