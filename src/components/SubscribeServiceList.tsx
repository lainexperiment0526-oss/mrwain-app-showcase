import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePiNetwork } from '@/hooks/usePiNetwork';
import { supabase } from '@/integrations/supabase/client';
import { PERIOD_PRESETS, SubscriptionService, useAppServices } from '@/hooks/useSubscriptionServices';

interface Props {
  appId: string;
  developerId: string | null;
}

const periodLabel = (s: number) => PERIOD_PRESETS.find((p) => p.secs === s)?.label || `${Math.round(s / 86400)}d`;

export function SubscribeServiceList({ appId, developerId }: Props) {
  const { user } = useAuth();
  const { piUser, authenticateWithPi, createPiPayment } = usePiNetwork();
  const qc = useQueryClient();
  const { data: services = [] } = useAppServices(appId);
  const [picked, setPicked] = useState<SubscriptionService | null>(null);
  const [autoRenew, setAutoRenew] = useState(true);
  const [busy, setBusy] = useState(false);

  if (!services.length) return null;

  const subscribe = async () => {
    if (!picked || !user) return;
    if (!developerId) { toast.error('Developer payout account missing'); return; }

    setBusy(true);
    try {
      const trialSecs = Number(picked.trial_period_secs || 0);
      const periodSecs = Number(picked.period_secs);
      const now = Date.now();
      const trialEnd = trialSecs > 0 ? new Date(now + trialSecs * 1000) : null;
      const firstChargeFromMs = trialSecs > 0 ? now + trialSecs * 1000 : now + periodSecs * 1000;
      const serviceEnd = new Date(trialSecs > 0 ? trialEnd!.getTime() : now + periodSecs * 1000);

      // Charge immediately if no trial
      if (trialSecs === 0) {
        let active = piUser || (await authenticateWithPi());
        if (!active) { toast.error('Pi authentication required'); setBusy(false); return; }
        await createPiPayment(Number(picked.price), `Subscribe: ${picked.name}`, {
          type: 'app_purchase',
          app_id: appId,
          developer_id: developerId,
          purchase_type: 'monthly',
          service_id: picked.id,
        });
      }

      const { error } = await supabase.from('service_subscriptions').insert({
        service_id: picked.id,
        subscriber_id: user.id,
        developer_id: developerId,
        app_id: appId,
        price_snapshot: picked.price,
        period_secs: periodSecs,
        trial_period_secs: trialSecs,
        approve_periods: picked.approve_periods,
        trial_end_ts: trialEnd?.toISOString() || null,
        service_end_ts: serviceEnd.toISOString(),
        next_charge_ts: new Date(firstChargeFromMs).toISOString(),
        auto_renew: autoRenew,
        status: trialSecs > 0 ? 'trialing' : 'active',
        used_trial: trialSecs > 0,
        access_url: picked.access_url || null,
      });
      if (error) throw error;

      toast.success(trialSecs > 0 ? 'Trial started!' : 'Subscribed!');
      qc.invalidateQueries({ queryKey: ['my-subscriptions', user.id] });
      const accessUrl = picked.access_url?.trim();
      setPicked(null);
      if (accessUrl) {
        setTimeout(() => window.location.assign(accessUrl), 400);
      }
    } catch (e: any) {
      if (e?.message === 'Payment cancelled') toast.info('Subscription cancelled');
      else toast.error(e?.message || 'Failed to subscribe');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-foreground">Subscription plans</h3>
        <p className="text-xs text-muted-foreground">Recurring Pi subscriptions powered by the Pi Network subscription model.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {services.map((s) => (
          <div key={s.id} className="rounded-xl border border-border p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-foreground">{s.name}</p>
              {s.trial_period_secs > 0 && <Badge variant="secondary">{Math.round(s.trial_period_secs / 86400)}d trial</Badge>}
            </div>
            {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
            <p className="text-sm text-foreground">{Number(s.price)} Pi <span className="text-muted-foreground">/ {periodLabel(s.period_secs)}</span></p>
            <Button size="sm" onClick={() => { setPicked(s); setAutoRenew(true); }}>
              {s.trial_period_secs > 0 ? 'Start trial' : 'Subscribe'}
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm subscription</DialogTitle>
            <DialogDescription className="sr-only">
              Confirm your subscription to this service
            </DialogDescription>
          </DialogHeader>
          {picked && (
            <div className="space-y-3">
              <p className="text-sm text-foreground"><strong>{picked.name}</strong> — {Number(picked.price)} Pi / {periodLabel(picked.period_secs)}</p>
              {picked.trial_period_secs > 0 && (
                <p className="text-xs text-muted-foreground">Free for {Math.round(picked.trial_period_secs / 86400)} days, then {Number(picked.price)} Pi per cycle.</p>
              )}
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label className="text-sm">Auto-renew</Label>
                  <p className="text-xs text-muted-foreground">{autoRenew ? 'Charged automatically each cycle' : 'You confirm each renewal manually'}</p>
                </div>
                <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
              </div>
              <Button className="w-full" onClick={subscribe} disabled={busy}>
                {busy ? 'Processing...' : picked.trial_period_secs > 0 ? 'Start trial' : `Pay ${Number(picked.price)} Pi`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
