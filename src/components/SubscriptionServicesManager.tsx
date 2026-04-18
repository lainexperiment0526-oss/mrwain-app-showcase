import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  PERIOD_PRESETS,
  SubscriptionService,
  useAppServices,
  useDeleteService,
  useUpsertService,
} from '@/hooks/useSubscriptionServices';

interface Props {
  appId: string;
  developerId: string;
}

const empty = {
  id: undefined as string | undefined,
  name: '',
  description: '',
  price: 1,
  period_secs: 2592000,
  trial_period_secs: 0,
  approve_periods: 12,
  is_active: true,
  access_url: '',
};

export function SubscriptionServicesManager({ appId, developerId }: Props) {
  const { data: services = [], isLoading } = useAppServices(appId);
  const upsert = useUpsertService();
  const remove = useDeleteService();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const editService = (svc: SubscriptionService) => {
    setForm({
      id: svc.id,
      name: svc.name,
      description: svc.description || '',
      price: Number(svc.price),
      period_secs: svc.period_secs,
      trial_period_secs: svc.trial_period_secs,
      approve_periods: svc.approve_periods,
      is_active: svc.is_active,
      access_url: svc.access_url || '',
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim() || form.price <= 0 || form.period_secs <= 0) {
      toast.error('Name, price and billing period are required');
      return;
    }
    try {
      await upsert.mutateAsync({
        ...form,
        app_id: appId,
        developer_id: developerId,
        description: form.description || null,
        access_url: form.access_url?.trim() || null,
      } as any);
      toast.success(form.id ? 'Service updated' : 'Service created');
      setOpen(false);
      setForm(empty);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    }
  };

  const periodLabel = (s: number) => PERIOD_PRESETS.find((p) => p.secs === s)?.label || `${Math.round(s / 86400)}d`;
  const trialLabel = (s: number) => (s > 0 ? `${Math.round(s / 86400)}d trial` : 'No trial');

  return (
    <div className="rounded-2xl bg-card border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Subscription Services</h3>
          <p className="text-xs text-muted-foreground">Recurring Pi billing — based on Pi Network's subscription smart contract model.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Edit Service' : 'New Subscription Service'}</DialogTitle>
              <DialogDescription className="sr-only">
                {form.id ? 'Edit existing subscription service details' : 'Create a new subscription service'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Service name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pro plan" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Price (Pi)</Label>
                  <Input type="number" min={0.01} step={0.01} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Billing period</Label>
                  <Select value={String(form.period_secs)} onValueChange={(v) => setForm({ ...form, period_secs: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERIOD_PRESETS.map((p) => <SelectItem key={p.secs} value={String(p.secs)}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Trial (days)</Label>
                  <Input type="number" min={0} value={Math.round(form.trial_period_secs / 86400)} onChange={(e) => setForm({ ...form, trial_period_secs: Math.max(0, Number(e.target.value)) * 86400 })} />
                </div>
                <div>
                  <Label>Approve periods</Label>
                  <Input type="number" min={1} value={form.approve_periods} onChange={(e) => setForm({ ...form, approve_periods: Math.max(1, Number(e.target.value)) })} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
              <Button className="w-full" onClick={submit} disabled={upsert.isPending}>
                {upsert.isPending ? 'Saving...' : form.id ? 'Save changes' : 'Create service'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : services.length === 0 ? (
        <p className="text-sm text-muted-foreground">No services yet. Create one to offer recurring subscriptions.</p>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground truncate">{s.name}</p>
                  <Badge variant={s.is_active ? 'secondary' : 'outline'}>{s.is_active ? 'Active' : 'Paused'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{Number(s.price)} Pi / {periodLabel(s.period_secs)} · {trialLabel(s.trial_period_secs)} · approve {s.approve_periods}×</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => editService(s)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={async () => {
                  if (!confirm('Delete this service? Existing subscribers will lose access.')) return;
                  try { await remove.mutateAsync(s.id); toast.success('Deleted'); } catch (e: any) { toast.error(e?.message || 'Failed'); }
                }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
