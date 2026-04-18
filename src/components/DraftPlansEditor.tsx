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
import { PERIOD_PRESETS } from '@/hooks/useSubscriptionServices';

export interface DraftPlan {
  name: string;
  description: string;
  price: number;
  period_secs: number;
  trial_period_secs: number;
  approve_periods: number;
  is_active: boolean;
  access_url: string;
}

interface Props {
  plans: DraftPlan[];
  onChange: (plans: DraftPlan[]) => void;
}

const empty: DraftPlan = {
  name: '',
  description: '',
  price: 1,
  period_secs: 2592000,
  trial_period_secs: 0,
  approve_periods: 12,
  is_active: true,
  access_url: '',
};

const periodLabel = (s: number) => PERIOD_PRESETS.find((p) => p.secs === s)?.label || `${Math.round(s / 86400)}d`;

export function DraftPlansEditor({ plans, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DraftPlan>(empty);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const reset = () => { setForm(empty); setEditingIndex(null); };

  const submit = () => {
    if (!form.name.trim() || form.price <= 0 || form.period_secs <= 0) {
      toast.error('Name, price and billing period are required');
      return;
    }
    const next = [...plans];
    if (editingIndex !== null) next[editingIndex] = form;
    else next.push(form);
    onChange(next);
    toast.success(editingIndex !== null ? 'Plan updated' : 'Plan added');
    setOpen(false);
    reset();
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground">Subscription Plans</h3>
          <p className="text-xs text-muted-foreground">Recurring Pi subscriptions powered by the Pi Network subscription model. Plans become active once your app is approved.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button type="button" size="sm"><Plus className="h-4 w-4 mr-1" /> New plan</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingIndex !== null ? 'Edit plan' : 'New subscription plan'}</DialogTitle>
              <DialogDescription className="sr-only">Configure a recurring Pi subscription plan</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Plan name</Label>
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
              <div>
                <Label>Access URL (optional)</Label>
                <Input type="url" value={form.access_url} onChange={(e) => setForm({ ...form, access_url: e.target.value })} placeholder="https://yourapp.com/pro-portal" />
                <p className="text-[11px] text-muted-foreground mt-1">Subscribers go here after a successful payment. Falls back to the app website.</p>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
              <Button type="button" className="w-full" onClick={submit}>
                {editingIndex !== null ? 'Save changes' : 'Add plan'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No plans yet. Add one to offer recurring subscriptions.</p>
      ) : (
        <div className="space-y-2">
          {plans.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground truncate">{p.name}</p>
                  <Badge variant={p.is_active ? 'secondary' : 'outline'}>{p.is_active ? 'Active' : 'Paused'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {Number(p.price)} Pi / {periodLabel(p.period_secs)} · {p.trial_period_secs > 0 ? `${Math.round(p.trial_period_secs / 86400)}d trial` : 'no trial'}
                  {p.access_url ? ' · access link set' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" size="icon" variant="ghost" onClick={() => { setForm(p); setEditingIndex(i); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => onChange(plans.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
