import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENPAY_BASE = Deno.env.get("OPENPAY_BASE_URL") || "https://openpay-api.lovable.app/smart-contract-api";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const clientId = Deno.env.get("OPENPAY_CLIENT_ID");
  const apiKey = Deno.env.get("OPENPAY_API_KEY");
  const platformToken = Deno.env.get("OPENPAY_PLATFORM_TOKEN");

  if (!clientId || !apiKey || !platformToken) {
    return new Response(JSON.stringify({ error: "OpenPay not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verify caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  const userId = claims?.claims?.sub;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { action, amount, memo, metadata, invoiceId } = body;

    const headers = {
      "Content-Type": "application/json",
      "X-Client-Id": clientId,
      "X-Api-Key": apiKey,
      "Authorization": `Bearer ${platformToken}`,
    };

    if (action === "create-invoice") {
      // Create an OpenPay invoice for the buyer to pay
      const res = await fetch(`${OPENPAY_BASE}/invoices`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: Number(amount),
          currency: "OUSD",
          memo: memo || "OpenApp purchase",
          metadata: { ...metadata, user_id: userId },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `OpenPay invoice failed (${res.status})`);

      // Track as pending
      await supabase.from("pi_payments").insert({
        user_id: userId,
        payment_id: data.id || data.invoice_id || `op_${Date.now()}`,
        amount: Number(amount),
        memo: memo || "",
        status: "pending",
        provider: "openpay",
        metadata: { ...metadata, openpay_invoice: data },
      });

      return new Response(JSON.stringify({ success: true, invoice: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      // Check invoice status; if paid, mark complete and split earnings
      const res = await fetch(`${OPENPAY_BASE}/invoices/${invoiceId}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `OpenPay verify failed (${res.status})`);

      const status = data.status; // expected: 'paid' | 'pending' | 'cancelled'
      if (status !== "paid") {
        return new Response(JSON.stringify({ success: true, status, invoice: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: payment } = await supabase
        .from("pi_payments")
        .select("id, status, amount, metadata")
        .eq("payment_id", invoiceId)
        .maybeSingle();

      let paymentRecordId = payment?.id || null;
      const meta = (payment?.metadata as any) || {};
      const totalAmount = Number(payment?.amount || data.amount || 0);

      if (payment && payment.status !== "completed") {
        await supabase.from("pi_payments").update({
          status: "completed",
          txid: data.txid || data.tx_hash || null,
        }).eq("id", payment.id);
      }

      // Revenue split for app purchases / subscription renewals
      if ((meta.type === "app_purchase" || meta.type === "app_subscription_renewal") && meta.app_id && meta.developer_id) {
        const developerShare = totalAmount * 0.7;
        const platformFee = totalAmount * 0.3;
        await supabase.from("developer_earnings").insert({
          developer_id: meta.developer_id,
          app_id: meta.app_id,
          payment_id: paymentRecordId,
          total_amount: totalAmount,
          developer_share: developerShare,
          platform_fee: platformFee,
        });
      }

      return new Response(JSON.stringify({ success: true, status: "paid", invoice: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("openpay-payment error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
