import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OpenPayMetadata {
  type: 'app_purchase' | 'app_subscription_renewal' | 'app_listing';
  app_id?: string;
  developer_id?: string;
  purchase_type?: 'onetime' | 'monthly';
  draft_id?: string;
  service_id?: string;
}

export function useOpenPay() {
  const [isProcessing, setIsProcessing] = useState(false);

  const createOpenPayPayment = useCallback(
    async (amount: number, memo: string, metadata: OpenPayMetadata) => {
      setIsProcessing(true);
      try {
        // 1. Create invoice
        const { data: invRes, error: invErr } = await supabase.functions.invoke('openpay-payment', {
          body: { action: 'create-invoice', amount, memo, metadata },
        });
        if (invErr || !invRes?.success) throw new Error(invRes?.error || invErr?.message || 'Invoice failed');
        const invoice = invRes.invoice;
        const checkoutUrl = invoice.checkout_url || invoice.payment_url || invoice.url;
        const invoiceId = invoice.id || invoice.invoice_id;

        if (!invoiceId) throw new Error('No invoice ID returned');

        // 2. Open checkout in a popup
        if (checkoutUrl) {
          window.open(checkoutUrl, 'openpay_checkout', 'width=480,height=720');
        }

        // 3. Poll for completion (up to ~3 min)
        const start = Date.now();
        while (Date.now() - start < 180_000) {
          await new Promise((r) => setTimeout(r, 4000));
          const { data: vRes } = await supabase.functions.invoke('openpay-payment', {
            body: { action: 'verify', invoiceId },
          });
          if (vRes?.status === 'paid') return { success: true, invoiceId };
          if (vRes?.status === 'cancelled') throw new Error('Payment cancelled');
        }
        throw new Error('Payment timeout — check History later');
      } catch (e: any) {
        if (e?.message !== 'Payment cancelled') toast.error(e?.message || 'OpenPay payment failed');
        throw e;
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  return { createOpenPayPayment, isProcessing };
}
