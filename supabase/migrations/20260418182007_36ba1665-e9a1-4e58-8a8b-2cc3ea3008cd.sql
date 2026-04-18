-- Add access_url to subscription services and snapshot it on subscriptions
ALTER TABLE public.subscription_services
  ADD COLUMN IF NOT EXISTS access_url text;

ALTER TABLE public.service_subscriptions
  ADD COLUMN IF NOT EXISTS access_url text;

-- Allow developers to define subscription plans while drafting an app
ALTER TABLE public.app_drafts
  ADD COLUMN IF NOT EXISTS subscription_plans jsonb NOT NULL DEFAULT '[]'::jsonb;