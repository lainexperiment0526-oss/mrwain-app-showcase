CREATE TABLE IF NOT EXISTS public.pi_a2u_transactions (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL,
  username TEXT,
  payment_id TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0.01,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  txid TEXT,
  wallet_address TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pi_a2u_wallets (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL,
  username TEXT,
  wallet_address TEXT NOT NULL,
  payment_id TEXT,
  txid TEXT,
  amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pi_a2u_wallets_address
  ON public.pi_a2u_wallets(wallet_address);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pi_a2u_wallets_payment_id
  ON public.pi_a2u_wallets(payment_id)
  WHERE payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pi_a2u_tx_success_uid
  ON public.pi_a2u_transactions(uid)
  WHERE status = 'success';

ALTER TABLE public.pi_a2u_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_a2u_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view A2U wallet progress"
ON public.pi_a2u_wallets FOR SELECT USING (true);

CREATE POLICY "Anyone can view A2U transaction history"
ON public.pi_a2u_transactions FOR SELECT USING (true);

CREATE POLICY "Admins can manage A2U wallets"
ON public.pi_a2u_wallets FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage A2U transactions"
ON public.pi_a2u_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));