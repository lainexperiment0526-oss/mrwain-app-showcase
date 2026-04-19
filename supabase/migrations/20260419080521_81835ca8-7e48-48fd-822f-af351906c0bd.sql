ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS download_url TEXT;
ALTER TABLE public.app_drafts ADD COLUMN IF NOT EXISTS download_url TEXT;