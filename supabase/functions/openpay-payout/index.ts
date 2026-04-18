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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
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

  // Admin only
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { withdrawalId } = await req.json();
    if (!withdrawalId) throw new Error("withdrawalId required");

    const { data: wr, error: wrErr } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("id", withdrawalId)
      .single();
    if (wrErr || !wr) throw new Error("Withdrawal not found");
    if (wr.status !== "pending") throw new Error(`Already ${wr.status}`);

    // Resolve OpenPay username
    let username = wr.openpay_username as string | null;
    if (!username) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("openpay_username")
        .eq("id", wr.developer_id)
        .maybeSingle();
      username = prof?.openpay_username || null;
    }
    if (!username) throw new Error("Developer has no OpenPay @username on file");

    // Send via OpenPay
    const res = await fetch(`${OPENPAY_BASE}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": clientId,
        "X-Api-Key": apiKey,
        "Authorization": `Bearer ${platformToken}`,
      },
      body: JSON.stringify({
        to: username.startsWith("@") ? username : `@${username}`,
        amount: Number(wr.amount),
        currency: "OUSD",
        memo: `OpenApp payout #${wr.id.slice(0, 8)}`,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      await supabase.from("withdrawal_requests").update({
        status: "failed",
        processed_at: new Date().toISOString(),
      }).eq("id", wr.id);
      throw new Error(data?.error || `OpenPay send failed (${res.status})`);
    }

    await supabase.from("withdrawal_requests").update({
      status: "paid",
      provider: "openpay",
      openpay_username: username,
      txid: data.txid || data.tx_hash || data.id || null,
      processed_at: new Date().toISOString(),
    }).eq("id", wr.id);

    return new Response(JSON.stringify({ success: true, txid: data.txid || data.id, response: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("openpay-payout error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
