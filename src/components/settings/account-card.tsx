"use client";

import {
  clearAuth,
  createUser,
  exchangeToken,
  fetchMe,
  getAuth,
  openUrlCmd,
  saveAuth,
} from "@/app/tauri-bridge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { initDeepLinkListener } from "@/services/deep-link";
import { LogIn, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function AccountCard() {
  const { user, refresh } = useUser();
  const router = useRouter();
  const [hasAuth, setHasAuth] = useState<boolean | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    getAuth()
      .then((auth) => setHasAuth(!!auth?.token))
      .catch(() => setHasAuth(false));
  }, [user]);

  if (user === undefined) return null;

  const isAccount = user?.account ?? false;
  const isSignedIn = isAccount && hasAuth === true;
  const displayName = user?.username || user?.name || "Player";
  const avatarUrl = user?.imageUrl || undefined;
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const accountLabel = (() => {
    const role = user?.role ?? "free";
    switch (role.toLowerCase()) {
      case "admin":
        return "Admin";
      case "pro":
      case "premium":
        return "Pro";
      default:
        return "Free";
    }
  })();

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await openUrlCmd("https://relaydrive.rotationracing.eu/auth");
    } catch {
      toast.error("Failed to open browser");
      setSigningIn(false);
      return;
    }

    let unsub: (() => void) | null = null;
    unsub = await initDeepLinkListener(async ({ parsed, source }) => {
      try {
        if (source !== "event") return;
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
        setHasAuth(true);
        await refresh();
        toast.success("Signed in successfully");
      } catch (err) {
        console.error("Sign-in callback failed", err);
        toast.error("Sign in failed");
      } finally {
        setSigningIn(false);
        try {
          unsub?.();
        } catch {}
      }
    });
  };

  const handleSignOut = async () => {
    try {
      await clearAuth();
      setHasAuth(false);
      toast.success("Signed out", { description: "Authentication token removed" });
      window.location.href = "/";
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <section className="space-y-3">
      <div className="space-y-1 px-1">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Account
        </div>
      </div>
      <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card">
        <div className="flex items-center gap-4 px-4 py-5 md:px-6">
          <Avatar className="size-10">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                {accountLabel}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {isAccount
                ? isSignedIn
                  ? "Signed in"
                  : "Not signed in"
                : "No account"}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isAccount && isSignedIn && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-[var(--radius-lg)]"
                onClick={handleSignOut}
              >
                <LogOut className="size-3.5" />
                Sign out
              </Button>
            )}
            {(!isAccount || !isSignedIn) && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-[var(--radius-lg)]"
                onClick={handleSignIn}
                disabled={signingIn}
              >
                <LogIn className="size-3.5" />
                {signingIn ? "Waiting…" : "Sign in"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
