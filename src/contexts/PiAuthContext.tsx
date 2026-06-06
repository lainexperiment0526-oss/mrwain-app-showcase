import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  authenticatePi, clearPiAuthSession, initPiSdk, isPiBrowser,
  loadPiAuthSession, savePiAuthSession, waitForPiSdk, type PiAuthSession,
} from "@/lib/piSdk";
import { verifyPiAuth } from "@/lib/piApi";

type PiAuthContextValue = {
  session: PiAuthSession | null;
  sdkReady: boolean;
  inPiBrowser: boolean;
  loading: boolean;
  authError: string | null;
  signIn: () => Promise<PiAuthSession>;
  signOut: () => void;
  refreshSession: () => Promise<void>;
};

const PiAuthContext = createContext<PiAuthContextValue | null>(null);

export function PiAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PiAuthSession | null>(() => loadPiAuthSession());
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const autoLoginAttempted = useRef(false);
  const inPiBrowser = isPiBrowser();

  const refreshSession = useCallback(async () => {
    const stored = loadPiAuthSession();
    if (!stored?.accessToken) { setSession(null); return; }
    try {
      const verified = await verifyPiAuth(stored.accessToken);
      const next: PiAuthSession = { uid: verified.data.uid, username: verified.data.username || stored.username, accessToken: stored.accessToken };
      savePiAuthSession(next); setSession(next); setAuthError(null);
    } catch { clearPiAuthSession(); setSession(null); setAuthError("Session expired"); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ready = await waitForPiSdk();
      if (cancelled) return;
      if (ready) await initPiSdk();
      setSdkReady(ready);
      const stored = loadPiAuthSession();
      if (stored && ready) { try { await refreshSession(); } catch { /* */ } }
      else if (stored) setSession(stored);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshSession]);

  const signIn = useCallback(async () => {
    setAuthError(null); setLoading(true);
    try {
      const auth = await authenticatePi(["username"]);
      const verified = await verifyPiAuth(auth.accessToken);
      const next: PiAuthSession = { uid: verified.data.uid, username: verified.data.username || auth.username, accessToken: auth.accessToken };
      savePiAuthSession(next); setSession(next); return next;
    } finally { setLoading(false); }
  }, []);

  // Auto-trigger Pi authentication on app load whenever SDK is available
  useEffect(() => {
    if (loading || session || !sdkReady || autoLoginAttempted.current) return;
    autoLoginAttempted.current = true;
    void signIn().catch((e) => setAuthError(e instanceof Error ? e.message : "Auto login failed"));
  }, [loading, session, sdkReady, signIn]);

  const signOut = useCallback(() => {
    clearPiAuthSession(); setSession(null); setAuthError(null);
    autoLoginAttempted.current = false;
  }, []);

  const value = useMemo(() => ({ session, sdkReady, inPiBrowser, loading, authError, signIn, signOut, refreshSession }),
    [session, sdkReady, inPiBrowser, loading, authError, signIn, signOut, refreshSession]);

  return <PiAuthContext.Provider value={value}>{children}</PiAuthContext.Provider>;
}

export function usePiAuth() {
  const ctx = useContext(PiAuthContext);
  if (!ctx) throw new Error("usePiAuth must be inside PiAuthProvider");
  return ctx;
}
