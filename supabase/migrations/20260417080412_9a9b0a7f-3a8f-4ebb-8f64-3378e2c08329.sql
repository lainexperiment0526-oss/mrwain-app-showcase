
-- Subscription services (registered by developers, mirrors the contract's Service)
CREATE TABLE public.subscription_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  developer_id uuid NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text,
  price numeric NOT NULL CHECK (price > 0),
  period_secs bigint NOT NULL CHECK (period_secs > 0),
  trial_period_secs bigint NOT NULL DEFAULT 0 CHECK (trial_period_secs >= 0),
  approve_periods integer NOT NULL DEFAULT 1 CHECK (approve_periods > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_services_app ON public.subscription_services(app_id);
CREATE INDEX idx_sub_services_dev ON public.subscription_services(developer_id);

ALTER TABLE public.subscription_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active services"
  ON public.subscription_services FOR SELECT USING (is_active = true);

CREATE POLICY "Developers and admins can view all their services"
  ON public.subscription_services FOR SELECT
  USING (auth.uid() = developer_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Developers create services for own apps"
  ON public.subscription_services FOR INSERT
  WITH CHECK (
    auth.uid() = developer_id
    AND EXISTS (SELECT 1 FROM public.apps WHERE apps.id = app_id AND apps.user_id = auth.uid())
  );

CREATE POLICY "Developers update own services"
  ON public.subscription_services FOR UPDATE
  USING (auth.uid() = developer_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Developers delete own services"
  ON public.subscription_services FOR DELETE
  USING (auth.uid() = developer_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_sub_services_updated
  BEFORE UPDATE ON public.subscription_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Subscriber relationships (mirrors the contract's Subscription)
CREATE TABLE public.service_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.subscription_services(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL,
  developer_id uuid NOT NULL,
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  price_snapshot numeric NOT NULL,
  period_secs bigint NOT NULL,
  trial_period_secs bigint NOT NULL DEFAULT 0,
  approve_periods integer NOT NULL DEFAULT 1,
  trial_end_ts timestamptz,
  service_end_ts timestamptz NOT NULL,
  next_charge_ts timestamptz NOT NULL,
  auto_renew boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('trialing','active','cancelled','expired')),
  used_trial boolean NOT NULL DEFAULT false,
  last_payment_id uuid REFERENCES public.pi_payments(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate active subscriptions to the same service (matches contract dedup)
CREATE UNIQUE INDEX uniq_active_sub_per_service
  ON public.service_subscriptions(service_id, subscriber_id)
  WHERE status IN ('trialing','active');

CREATE INDEX idx_service_subs_subscriber ON public.service_subscriptions(subscriber_id);
CREATE INDEX idx_service_subs_developer ON public.service_subscriptions(developer_id);
CREATE INDEX idx_service_subs_due ON public.service_subscriptions(next_charge_ts) WHERE auto_renew = true AND status = 'active';

ALTER TABLE public.service_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscriber can view own subscriptions"
  ON public.service_subscriptions FOR SELECT
  USING (auth.uid() = subscriber_id OR auth.uid() = developer_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Subscriber creates own subscription"
  ON public.service_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "Subscriber updates own subscription"
  ON public.service_subscriptions FOR UPDATE
  USING (auth.uid() = subscriber_id OR auth.uid() = developer_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Subscriber deletes own subscription"
  ON public.service_subscriptions FOR DELETE
  USING (auth.uid() = subscriber_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_service_subs_updated
  BEFORE UPDATE ON public.service_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Charge history (mirrors process() outcomes)
CREATE TABLE public.subscription_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.service_subscriptions(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.subscription_services(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL,
  developer_id uuid NOT NULL,
  amount numeric NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('charged','failed','skipped')),
  payment_id uuid REFERENCES public.pi_payments(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_charges_sub ON public.subscription_charges(subscription_id);
CREATE INDEX idx_charges_developer ON public.subscription_charges(developer_id);

ALTER TABLE public.subscription_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Charges visible to subscriber developer admin"
  ON public.subscription_charges FOR SELECT
  USING (auth.uid() = subscriber_id OR auth.uid() = developer_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System inserts charges"
  ON public.subscription_charges FOR INSERT
  WITH CHECK (auth.uid() = subscriber_id OR auth.uid() = developer_id OR has_role(auth.uid(), 'admin'::app_role));
