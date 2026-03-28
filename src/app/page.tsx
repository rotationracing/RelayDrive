"use client";

import { type SplashPhase, SplashScreen } from "@/components/splash-screen";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { initDeepLinkListener } from "@/services/deep-link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  createUser,
  ensureDataDir,
  exchangeToken,
  fetchMe,
  finishStartup,
  getAuth,
  getUser,
  openUrlCmd,
  saveAuth,
  userExists,
} from "./tauri-bridge.ts";

export default function Home() {
  const router = useRouter();
  const [reauthOpen, setReauthOpen] = useState(false);
  const [authWaiting, setAuthWaiting] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [splashPhase, setSplashPhase] = useState<SplashPhase>("enter");
  const nextRouteRef = useRef<string | null>(null);
  const openReauthRef = useRef(false);

  useEffect(() => {
    // Animate splash in quickly
    setTimeout(() => setSplashPhase("show"), 50);
    // Keep main window hidden until initialization finishes to ensure correct first route

    const initialize = async () => {
      try {
        await ensureDataDir();
        // Updater is handled in the launcher UI based on settings.
        const hasUser = await userExists();
        if (!hasUser) {
          nextRouteRef.current = "/onboarding";
          return;
        }

        const user = await getUser();
        if (!user) {
          nextRouteRef.current = "/onboarding";
          return;
        }

        // If account mode, validate token and refresh user profile from API
        if ((user as any).account) {
          try {
            const auth = await getAuth();
            if (!auth || !auth.token) throw new Error("no auth");
            const me = await fetchMe(auth.token);
            // Save any updates to user.json if fields changed
            await createUser(
              true,
              me.username || (user as any).name || "Account",
              me.id,
              me.fullName ?? null,
              me.username ?? null,
              me.role ?? null,
              me.email ?? null,
              me.imageUrl ?? null,
              me.locked ?? null,
            );
            nextRouteRef.current = "/launcher";
          } catch (err: any) {
            // If unauthorized/expired (backend returns status code in error message), prompt re-auth
            const msg = String(err ?? "");
            if (
              msg.includes("401") ||
              msg.toLowerCase().includes("unauthorized") ||
              msg.toLowerCase().includes("expired")
            ) {
              openReauthRef.current = true;
              nextRouteRef.current = "/launcher";
            } else {
              // If some other error, continue offline with saved data
              nextRouteRef.current = "/launcher";
            }
          }
        } else {
          // Local/offline user
          nextRouteRef.current = "/launcher";
        }
      } catch (e) {
        console.error("init failed", e);
        nextRouteRef.current = "/onboarding";
      } finally {
        setInitializing(false);
        // Start splash exit and reveal main window, then navigate
        setSplashPhase("exit");
        setTimeout(async () => {
          await finishStartup();
          if (openReauthRef.current) setReauthOpen(true);
          const route = nextRouteRef.current ?? "/launcher";
          router.replace(route);
        }, 500); // match SplashScreen exit duration
      }
    };
    initialize();
  }, [router]);

  const handleContinueOffline = async () => {
    try {
      const existing = await getUser();
      const name = (existing as any)?.name || "Player";
      await createUser(false, name);
    } catch {}
    setReauthOpen(false);
    await finishStartup();
    router.replace("/launcher");
  };

  const handleSignInAgain = async () => {
    setAuthWaiting(true);
    try {
      await openUrlCmd("https://relaydrive.rotationracing.eu/auth");
    } catch (e) {
      console.error("Failed to open auth url via cmd start", e);
    }
    let unsub: (() => void) | null = null;
    unsub = await initDeepLinkListener(async ({ parsed }) => {
      try {
        if (parsed.path !== "callback") return;
        const token = parsed.query.auth;
        if (!token) return;
        const exchanged = await exchangeToken(token);
        await saveAuth(exchanged.token, exchanged.expiresAt);
        const me = await fetchMe(exchanged.token);
        await createUser(
          true,
          me.username || "Account",
          me.id,
          me.fullName ?? null,
          me.username ?? null,
          me.role ?? null,
          me.email ?? null,
          me.imageUrl ?? null,
          me.locked ?? null,
        );
        setAuthWaiting(false);
        setReauthOpen(false);
        await finishStartup();
        router.replace("/launcher");
      } catch (err) {
        console.error("auth callback handling failed", err);
      } finally {
        try {
          unsub?.();
        } catch {}
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Full-screen splash overlay */}
      <SplashScreen phase={splashPhase} />

      {/* Re-auth prompt modal */}
      <Dialog open={reauthOpen} onOpenChange={setReauthOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Sign in required</DialogTitle>
            <DialogDescription>
              Your session has expired. Log in again to continue with your account, or continue
              offline.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
              onClick={handleContinueOffline}
            >
              Continue offline
            </button>
            <button
              className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand"
              onClick={handleSignInAgain}
            >
              Log in
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Waiting for browser auth modal */}
      <Dialog open={authWaiting} onOpenChange={setAuthWaiting}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Continue in your browser</DialogTitle>
            <DialogDescription>
              We opened RelayDrive login in your default browser. Complete the sign-in there and
              keep this window open.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin"
              aria-label="loading"
            />
            <span className="text-sm text-muted-foreground">Waiting for authentication...</span>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
              onClick={() => setAuthWaiting(false)}
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
