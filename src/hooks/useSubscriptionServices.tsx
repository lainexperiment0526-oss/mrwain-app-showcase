import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionService {
  id: string;
  app_id: string;
  developer_id: string;
  name: string;
  description: string | null;
  price: number;
  period_secs: number;
  trial_period_secs: number;
  approve_periods: number;
  is_active: boolean;
  access_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceSubscription {
  id: string;
  service_id: string;
  subscriber_id: string;
  developer_id: string;
  app_id: string;
  price_snapshot: number;
  period_secs: number;
  trial_period_secs: number;
  approve_periods: number;
  trial_end_ts: string | null;
  service_end_ts: string;
  next_charge_ts: string;
  auto_renew: boolean;
  status: 'trialing' | 'active' | 'cancelled' | 'expired';
  used_trial: boolean;
  access_url: string | null;
  last_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export const PERIOD_PRESETS = [
  { label: 'Daily', secs: 86400 },
  { label: 'Weekly', secs: 604800 },
  { label: 'Monthly (30d)', secs: 2592000 },
  { label: 'Quarterly (90d)', secs: 7776000 },
  { label: 'Yearly (365d)', secs: 31536000 },
];

export function useAppServices(appId: string | undefined) {
  return useQuery({
    queryKey: ['subscription-services', appId],
    enabled: !!appId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_services')
        .select('*')
        .eq('app_id', appId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SubscriptionService[];
    },
  });
}

export function useDeveloperServices(developerId: string | undefined) {
  return useQuery({
    queryKey: ['developer-services', developerId],
    enabled: !!developerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_services')
        .select('*, app:apps(id,name,logo_url)')
        .eq('developer_id', developerId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as (SubscriptionService & { app: { id: string; name: string; logo_url: string | null } | null })[];
    },
  });
}

export function useMySubscriptions(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-subscriptions', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_subscriptions')
        .select('*, service:subscription_services(*), app:apps(id,name,logo_url,website_url)')
        .eq('subscriber_id', userId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as (ServiceSubscription & {
        service: SubscriptionService | null;
        app: { id: string; name: string; logo_url: string | null; website_url: string } | null;
      })[];
    },
  });
}

export function useUpsertService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (svc: Partial<SubscriptionService> & { app_id: string; developer_id: string; name: string; price: number; period_secs: number }) => {
      if (svc.id) {
        const { id, ...rest } = svc;
        const { error } = await supabase.from('subscription_services').update(rest).eq('id', id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase.from('subscription_services').insert(svc).select('id').single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-services'] });
      qc.invalidateQueries({ queryKey: ['developer-services'] });
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscription_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-services'] });
      qc.invalidateQueries({ queryKey: ['developer-services'] });
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (subId: string) => {
      const { error } = await supabase
        .from('service_subscriptions')
        .update({ auto_renew: false, status: 'cancelled' })
        .eq('id', subId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-subscriptions'] }),
  });
}

export function useToggleAutoRenew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ subId, autoRenew }: { subId: string; autoRenew: boolean }) => {
      const { error } = await supabase
        .from('service_subscriptions')
        .update({ auto_renew: autoRenew, status: autoRenew ? 'active' : 'cancelled' })
        .eq('id', subId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-subscriptions'] }),
  });
}
