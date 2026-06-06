import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PI_API_BASE = "https://api.minepi.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const piApiKey = Deno.env.get("PI_NETWORK_API_KEY") || Deno.env.get("PI_API_KEY");
  if (!piApiKey) {
    return new Response(JSON.stringify({ error: "PI_NETWORK_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Product catalog — keep frontend + backend consistent
  const PRODUCTS = {
    app_listing: { amount: 25, memo: "App listing fee - OpenApp" },
  } as const;

  try {
    const body = await req.json();
    const { action, paymentId, txid, userId, amount, memo, metadata } = body;

    // Server-side product validation for known product types
    if ((action === "approve" || action === "complete") && metadata?.type && PRODUCTS[metadata.type as keyof typeof PRODUCTS]) {
      const expected = PRODUCTS[metadata.type as keyof typeof PRODUCTS];
      if (Number(amount) !== expected.amount || String(memo) !== expected.memo) {
        return new Response(
          JSON.stringify({ error: `Invalid ${metadata.type} payment: amount/memo mismatch`, expected }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (metadata.type === "app_listing" && !metadata.draft_id) {
        return new Response(
          JSON.stringify({ error: "Missing draft_id for app_listing payment" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (action === "approve") {
      // Approve a payment on Pi server
      const res = await fetch(`${PI_API_BASE}/v2/payments/${paymentId}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Key ${piApiKey}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      console.log("Payment approved:", data);

      // Track payment in database
      if (userId) {
        await supabase.from("pi_payments").insert({
          user_id: userId,
          payment_id: paymentId,
          amount: amount || 0,
          memo: memo || "",
          status: "approved",
          metadata: metadata || {},
        });
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "complete") {
      // Complete a payment on Pi server
      const res = await fetch(`${PI_API_BASE}/v2/payments/${paymentId}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Key ${piApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      });
      const data = await res.json();
      console.log("Payment completed:", data);

      // Ensure payment record exists and is marked completed.
      let paymentRecordId: string | null = null;
      const { data: existingPayment } = await supabase
        .from("pi_payments")
        .select("id")
        .eq("payment_id", paymentId)
        .maybeSingle();

      if (existingPayment?.id) {
        paymentRecordId = existingPayment.id;
        await supabase
          .from("pi_payments")
          .update({ status: "completed", txid, amount: amount || 0, memo: memo || "", metadata: metadata || {} })
          .eq("payment_id", paymentId);
      } else if (userId) {
        const { data: inserted } = await supabase
          .from("pi_payments")
          .insert({
            user_id: userId,
            payment_id: paymentId,
            txid: txid || null,
            amount: amount || 0,
            memo: memo || "",
            status: "completed",
            metadata: metadata || {},
          })
          .select("id")
          .single();
        paymentRecordId = inserted?.id || null;
      }

      // If this is an app listing payment, update draft status
      if (metadata?.type === "app_listing" && metadata?.draft_id) {
        await supabase
          .from("app_drafts")
          .update({ payment_status: "paid", payment_id: paymentId })
          .eq("id", metadata.draft_id);
      }

      // If this is an app purchase payment, record developer earnings (70/30 split)
      if ((metadata?.type === "app_purchase" || metadata?.type === "app_subscription_renewal") && metadata?.app_id && metadata?.developer_id) {
        const totalAmount = amount || 0;
        const developerShare = totalAmount * 0.7;
        const platformFee = totalAmount * 0.3;

        await supabase.from("developer_earnings").insert({
          developer_id: metadata.developer_id,
          app_id: metadata.app_id,
          payment_id: paymentRecordId,
          total_amount: totalAmount,
          developer_share: developerShare,
          platform_fee: platformFee,
        });
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "cancel") {
      // Update payment status
      if (paymentId) {
        await supabase
          .from("pi_payments")
          .update({ status: "cancelled" })
          .eq("payment_id", paymentId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Pi payment error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
