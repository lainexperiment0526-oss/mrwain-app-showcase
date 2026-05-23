import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import ClaimTestPiButton from "@/components/pi/ClaimTestPiButton";
import { usePiAuth } from "@/contexts/PiAuthContext";

export default function TestnetRewardPage() {
  const { session, signIn, inPiBrowser, sdkReady, loading } = usePiAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card className="p-6 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">Claim Test Pi</h1>
            <p className="text-sm text-muted-foreground">
              Help us qualify for Mainnet by receiving a small A2U Test Pi reward.
              Open this page in Pi Browser, sign in, then claim once per Pioneer account.
            </p>
          </div>

          {!inPiBrowser && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              You must open this page inside the <strong>Pi Browser</strong> to claim Test Pi.
            </div>
          )}

          {inPiBrowser && !session && (
            <Button
              onClick={() => void signIn()}
              disabled={loading || !sdkReady}
              className="h-11 w-full rounded-2xl"
              style={{ backgroundColor: "#7B2FF2", color: "white" }}
            >
              Sign in with Pi Network
            </Button>
          )}

          {(session || !inPiBrowser) && <ClaimTestPiButton />}

          {session && (
            <p className="text-center text-xs text-muted-foreground">
              Signed in as @{session.username || session.uid.slice(0, 8)}
            </p>
          )}

          <div className="pt-4 border-t text-center">
            <Link to="/admin/testnet-progress">
              <Button variant="ghost" size="sm">View admin progress</Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
