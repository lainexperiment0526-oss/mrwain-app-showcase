const PI_AUTH_STORAGE_KEY = "openapp_pi_auth";

export type PiAuthSession = { uid: string; username: string; accessToken: string };

// Window.Pi global type is declared in src/hooks/usePiNetwork.tsx

export function isPiSandbox(): boolean {
  const env = String(import.meta.env.VITE_PI_SANDBOX ?? "").trim().toLowerCase();
  if (env.length > 0) return env === "true";
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  if (host.includes("testnet")) return true;
  if (import.meta.env.PROD) return false;
  return host === "localhost" || host === "127.0.0.1";
}

export function isPiBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return /PiBrowser/i.test(navigator.userAgent) || Boolean(window.Pi);
}

let initPromise: Promise<boolean> | null = null;
export function initPiSdk(): Promise<boolean> {
  if (!window.Pi) return Promise.resolve(false);
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const res = window.Pi.init({ version: "2.0", sandbox: isPiSandbox() });
      // Pi.init may return a Promise — await if thenable
      if (res && typeof (res as Promise<unknown>).then === "function") {
        await res;
      }
      return true;
    } catch (e) {
      console.warn("Pi SDK init failed", e);
      initPromise = null;
      return false;
    }
  })();
  return initPromise;
}

export function loadPiAuthSession(): PiAuthSession | null {
  try {
    const raw = localStorage.getItem(PI_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PiAuthSession;
    if (!parsed?.uid || !parsed?.accessToken) return null;
    return parsed;
  } catch { return null; }
}
export function savePiAuthSession(s: PiAuthSession): void { localStorage.setItem(PI_AUTH_STORAGE_KEY, JSON.stringify(s)); }
export function clearPiAuthSession(): void { localStorage.removeItem(PI_AUTH_STORAGE_KEY); }

export async function waitForPiSdk(timeoutMs = 12000): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.Pi) return true;
  return new Promise((resolve) => {
    const start = Date.now();
    const interval = window.setInterval(() => {
      if (window.Pi) { window.clearInterval(interval); resolve(true); }
      else if (Date.now() - start > timeoutMs) { window.clearInterval(interval); resolve(false); }
    }, 200);
  });
}

export async function authenticatePi(scopes: string[] = ["username", "payments", "wallet_address"]): Promise<PiAuthSession> {
  if (!window.Pi) throw new Error("Pi SDK unavailable. Open this app in Pi Browser.");
  initPiSdk();
  const auth = await window.Pi.authenticate(scopes, () => {});
  const session: PiAuthSession = { uid: auth.user.uid, username: auth.user.username || "", accessToken: auth.accessToken };
  savePiAuthSession(session);
  return session;
}
