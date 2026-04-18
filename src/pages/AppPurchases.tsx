import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { AppIcon } from '@/components/AppIcon';
import { useAuth } from '@/hooks/useAuth';
import { usePiNetwork } from '@/hooks/usePiNetwork';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { PageLoader } from '@/components/PageLoader';

type PurchaseRow = {
  id: string;
  app_id: string;
  user_id: string;
  purchase_type: 'onetime' | 'monthly';
  status: 'active' | 'expired' | 'cancelled';
  paid_at: string;
  expires_at: string | null;
  app: {
    id: string;
    name: string;
    logo_url: string | null;
    website_url: string;
    price_amount: number | null;
    payment_type: string | null;
    user_id: string | null;
  } | null;
};

const normalizeUrl = (url: string) => {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed}`;
};

export default function AppPurchases() {
  const { user, loading } = useAuth();
  const { piUser, authenticateWithPi, createPiPayment } = usePiNetwork();
  const queryClient = useQueryClient();

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['app-purchases', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_purchases')
        .select('id, app_id, user_id, purchase_type, status, paid_at, expires_at, app:apps(id, name, logo_url, website_url, price_amount, payment_type, user_id)')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PurchaseRow[];
    },
  });

  const items = useMemo(() => {
    return (purchases || []).map((row) => {
      const expired = row.purchase_type === 'monthly' && (!!row.expires_at && new Date(row.expires_at).getTime() <= Date.now());
      return { ...row, expired };
    });
  }, [purchases]);

  const handleOpenApp = (websiteUrl: string) => {
    const url = normalizeUrl(websiteUrl);
    if (!url) {
      toast.error('No app link available');
      return;
    }
    window.location.assign(url);
  };

  const handleRenew = async (item: PurchaseRow) => {
    if (!user || !item.app) return;
    const amount = Number(item.app.price_amount || 0);
    if (amount <= 0) {
      toast.error('Invalid subscription price');
      return;
    }
    if (!item.app.user_id) {
      toast.error('Developer payout account is missing for this app');
      return;
    }

    let activePiUser = piUser;
    if (!activePiUser) {
      activePiUser = await authenticateWithPi();
    }
    if (!activePiUser) {
      toast.error('Pi authentication required');
      return;
    }

    try {
      await createPiPayment(amount, `Subscription renewal for ${item.app.name}`, {
        type: 'app_purchase',
        app_id: item.app.id,
        developer_id: item.app.user_id,
        purchase_id: item.id,
        purchase_type: 'monthly',
      });

      const base = item.expires_at && new Date(item.expires_at).getTime() > Date.now() ? new Date(item.expires_at) : new Date();
      const next = new Date(base);
      next.setMonth(next.getMonth() + 1);

      const { error } = await supabase
        .from('app_purchases')
        .update({
          status: 'active',
          paid_at: new Date().toISOString(),
          expires_at: next.toISOString(),
        })
        .eq('id', item.id)
        .eq('user_id', user.id);
      if (error) throw error;

      toast.success('Subscription renewed');
      queryClient.invalidateQueries({ queryKey: ['app-purchases', user.id] });
    } catch (error: any) {
      if (error?.message === 'Payment cancelled') {
        toast.info('Renewal cancelled');
      } else {
        toast.error(error?.message || 'Failed to renew subscription');
      }
    }
  };

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Sign in Required</h1>
          <p className="text-muted-foreground mb-6">Please sign in to view your purchases.</p>
          <Link to="/auth"><Button>Sign In</Button></Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">App Purchases</h1>
          <p className="text-muted-foreground">Manage paid apps and subscription renewals</p>
        </div>

        {isLoading ? (
          <PageLoader label="Loading purchases..." fullscreen={false} />
        ) : items.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-card border border-border">
            <p className="text-foreground font-medium">No purchases yet</p>
            <p className="text-muted-foreground text-sm mt-1">Paid apps and subscriptions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl bg-card border border-border p-4">
                <div className="flex items-center gap-3">
                  <AppIcon src={item.app?.logo_url || null} name={item.app?.name || 'App'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{item.app?.name || 'Unknown App'}</p>
                    <p className="text-xs text-muted-foreground">
                      Plan: {item.purchase_type === 'onetime' ? 'One-time purchase' : 'Monthly subscription'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Purchased: {new Date(item.paid_at).toLocaleDateString()}
                    </p>
                    {item.purchase_type === 'monthly' && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : 'N/A'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.expired ? 'destructive' : 'secondary'}>
                      {item.expired ? 'Expired' : 'Active'}
                    </Badge>
                    {item.purchase_type === 'monthly' && item.expired && (
                      <Button size="sm" onClick={() => handleRenew(item)}>
                        Renew
                      </Button>
                    )}
                    {item.app?.website_url && (!item.expired || item.purchase_type === 'onetime') && (
                      <Button size="sm" variant="outline" onClick={() => handleOpenApp(item.app!.website_url)}>
                        Open App
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <ServiceSubscriptionsList />
      </main>
    </div>
  );
}

import { useMySubscriptions, useCancelSubscription, useToggleAutoRenew, PERIOD_PRESETS } from '@/hooks/useSubscriptionServices';
import { Switch } from '@/components/ui/switch';

function ServiceSubscriptionsList() {
  const { user } = useAuth();
  const { data: subs = [], isLoading } = useMySubscriptions(user?.id);
  const cancel = useCancelSubscription();
  const toggle = useToggleAutoRenew();
  const periodLabel = (s: number) => PERIOD_PRESETS.find((p) => p.secs === s)?.label || `${Math.round(s / 86400)}d`;

  if (!user) return null;
  if (isLoading) return null;
  if (!subs.length) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-foreground mb-3">Subscription Plans</h2>
      <div className="space-y-3">
        {subs.map((s) => {
          const expired = new Date(s.service_end_ts).getTime() <= Date.now() && !s.auto_renew;
          const accessUrl = (s.access_url || s.service?.access_url || s.app?.website_url || '').trim();
          const canOpen = !expired && s.status !== 'cancelled' && !!accessUrl;
          return (
            <div key={s.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{s.app?.name} — {s.service?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {Number(s.price_snapshot)} Pi / {periodLabel(s.period_secs)} · {s.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.status === 'trialing' && s.trial_end_ts ? `Trial ends ${new Date(s.trial_end_ts).toLocaleDateString()}` : `Renews ${new Date(s.next_charge_ts).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Auto-renew</span>
                    <Switch checked={s.auto_renew} disabled={expired} onCheckedChange={(v) => toggle.mutate({ subId: s.id, autoRenew: v })} />
                  </div>
                  {canOpen && (
                    <Button size="sm" variant="outline" onClick={() => window.location.assign(normalizeUrl(accessUrl))}>
                      Open Plan
                    </Button>
                  )}
                  {s.status !== 'cancelled' && (
                    <Button size="sm" variant="outline" onClick={() => cancel.mutate(s.id)}>Cancel</Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
