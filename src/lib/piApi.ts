import { supabase } from "@/integrations/supabase/client";
import type { PiAuthSession } from "@/lib/piSdk";

async function invokePiA2U<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("pi-a2u", { body });
  if (error) {
    let msg = error.message || "Request failed";
    const ctx: any = (error as any).context;
    try { if (ctx && typeof ctx.json === "function") { const j = await ctx.json(); if (j?.error) msg = j.error; } } catch { /* ignore */ }
    throw new Error(msg);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export async function verifyPiAuth(accessToken: string) {
  return invokePiA2U<{ success: boolean; data: { uid: string; username: string } }>({ action: "auth_verify", accessToken });
}

export type WalletProgress = { unique_wallets: number; target: number; progress_label: string; completed: boolean };

export async function fetchWalletProgress(): Promise<WalletProgress> {
  const r = await invokePiA2U<{ success: boolean; data: WalletProgress }>({ action: "progress" });
  return r.data;
}

export async function claimTestnetPi(session: PiAuthSession, body?: { amount?: number; memo?: string }) {
  return invokePiA2U<{ success: boolean; data: { payment_id: string; txid: string; wallet_address: string; amount: number; memo: string; progress: WalletProgress; wallet_added: boolean } }>({
    action: "claim", accessToken: session.accessToken, amount: body?.amount, memo: body?.memo,
  });
}

export async function fetchAdminDashboard() {
  return invokePiA2U<{ success: boolean; data: any }>({ action: "admin_dashboard" });
}
