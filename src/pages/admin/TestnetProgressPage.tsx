import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAdminDashboard } from "@/lib/piApi";

export default function TestnetProgressPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try { const r = await fetchAdminDashboard(); if (!cancelled) setData(r.data); }
      catch (e) { if (!cancelled) setErr(e instanceof Error ? e.message : "Failed"); }
    };
    void load();
    const t = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">Testnet A2U Progress</h1>
        {err && <Card className="p-4 text-destructive">{err}</Card>}
        {!data ? (
          <Card className="p-4 text-muted-foreground">Loading…</Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">Unique wallets</div>
                <div className="text-3xl font-bold">{data.unique_wallets_count} / {data.progress?.target ?? 10}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">Successful A2U</div>
                <div className="text-3xl font-bold">{data.total_successful_a2u}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="text-lg font-semibold">{data.progress?.completed ? "Goal reached 🎉" : "In progress"}</div>
              </Card>
            </div>

            <Card className="p-4">
              <h2 className="font-semibold mb-2">Unique wallet addresses</h2>
              <div className="space-y-1 text-xs font-mono">
                {(data.wallet_addresses || []).map((w: string) => <div key={w} className="break-all">{w}</div>)}
                {(!data.wallet_addresses || data.wallet_addresses.length === 0) && (
                  <div className="text-muted-foreground font-sans">No wallets yet.</div>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="font-semibold mb-2">Transactions</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>TXID</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.transactions || []).slice(0, 50).map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell><Badge variant={t.status === "success" ? "default" : t.status === "failed" ? "destructive" : "secondary"}>{t.status}</Badge></TableCell>
                      <TableCell className="text-xs">{t.username || t.uid?.slice(0, 8)}</TableCell>
                      <TableCell>{t.amount}</TableCell>
                      <TableCell className="text-xs font-mono break-all max-w-[180px]">{t.wallet_address || "—"}</TableCell>
                      <TableCell className="text-xs font-mono break-all max-w-[180px]">{t.txid || "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(t.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <Card className="p-4">
              <h2 className="font-semibold mb-2">Recent logs</h2>
              <div className="space-y-1 text-xs font-mono max-h-96 overflow-auto">
                {(data.logs || []).slice(0, 100).map((l: any, i: number) => (
                  <div key={i} className={l.level === "error" ? "text-destructive" : l.level === "warn" ? "text-yellow-600" : "text-muted-foreground"}>
                    [{new Date(l.timestamp).toLocaleTimeString()}] [{l.level}] {l.message}
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
