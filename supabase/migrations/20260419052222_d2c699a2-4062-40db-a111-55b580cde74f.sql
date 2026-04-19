DROP POLICY IF EXISTS "System inserts rewards" ON public.affiliate_rewards;
CREATE POLICY "Admins insert rewards"
  ON public.affiliate_rewards FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));