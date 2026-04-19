ALTER TABLE public.apps
  ADD COLUMN IF NOT EXISTS openpay_link TEXT,
  ADD COLUMN IF NOT EXISTS droppay_link TEXT;

ALTER TABLE public.app_drafts
  ADD COLUMN IF NOT EXISTS openpay_link TEXT,
  ADD COLUMN IF NOT EXISTS droppay_link TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_openpay_link TEXT,
  ADD COLUMN IF NOT EXISTS default_droppay_link TEXT;

ALTER TABLE public.app_purchases
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'pi',
  ADD COLUMN IF NOT EXISTS proof_txid TEXT,
  ADD COLUMN IF NOT EXISTS proof_status TEXT NOT NULL DEFAULT 'verified';

-- Allow app owners (developers) to view and update purchases of their apps (for approving proofs)
DROP POLICY IF EXISTS "Developers view purchases of own apps" ON public.app_purchases;
CREATE POLICY "Developers view purchases of own apps"
ON public.app_purchases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.apps
    WHERE apps.id = app_purchases.app_id
      AND apps.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Developers approve purchases of own apps" ON public.app_purchases;
CREATE POLICY "Developers approve purchases of own apps"
ON public.app_purchases
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.apps
    WHERE apps.id = app_purchases.app_id
      AND apps.user_id = auth.uid()
  )
);