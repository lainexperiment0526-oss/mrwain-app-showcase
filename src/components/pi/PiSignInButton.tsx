import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePiAuth } from "@/contexts/PiAuthContext";

export function PiSignInButton({ className }: { className?: string }) {
  const { session, signIn, signOut, loading, sdkReady } = usePiAuth();

  const handleClick = async () => {
    if (session) { signOut(); return; }
    try {
      await signIn();
      toast.success("Signed in with Pi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pi sign-in failed");
    }
  };

  return (
    <Button
      onClick={() => void handleClick()}
      disabled={loading || (!session && !sdkReady)}
      size="sm"
      className={className}
      style={{ backgroundColor: session ? undefined : "#7B2FF2", color: session ? undefined : "white" }}
      variant={session ? "outline" : "default"}
    >
      {loading ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Pi…</>
      ) : session ? (
        <><LogOut className="mr-2 h-4 w-4" />{session.username || "Pi"}</>
      ) : (
        <>Sign in with Pi</>
      )}
    </Button>
  );
}
