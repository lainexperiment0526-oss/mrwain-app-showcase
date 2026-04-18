-- Add provider tracking to pi_payments (legacy table name kept; now multi-provider)
ALTER TABLE public.pi_payments
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'pi';

-- Add provider + openpay username to withdrawal requests
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'pi',
  ADD COLUMN IF NOT EXISTS openpay_username text;

-- Add openpay username to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS openpay_username text;

-- Index for provider lookups
CREATE INDEX IF NOT EXISTS idx_pi_payments_provider ON public.pi_payments(provider);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_provider ON public.withdrawal_requests(provider);