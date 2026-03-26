"use client"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useAppBootstrap } from "@/contexts/AppBootstrapContext"
import { useProcess } from "@/contexts/ProcessContext"
import { useSettingsContext } from "@/contexts/SettingsContext"
import { useUser } from "@/contexts/UserContext"
import { initDeepLinkListener } from "@/services/deep-link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createUser, exchangeToken, fetchMe, getAuth, installUpdate, isAuthExpired, openUrlCmd, saveAuth } from "../tauri-bridge"

type GameDefinition = {
  key: string
  label: string
  image: string
  route: string
  description: string
  wip?: boolean
}

const games: GameDefinition[] = [
  { key: "iRacing", label: "iRacing", image: "/launcher/iracing.webp", route: "/iracing", description: "iRacing Integration", wip: true },
  { key: "LMU", label: "LMU", image: "/launcher/lmu.webp", route: "/lmu", description: "Le Mans Ultimate Integration", wip: true },
  { key: "ACC", label: "ACC", image: "/launcher/acc.webp", route: "/acc", description: "Assetto Corsa Competizione Integration" },
]

export default function LauncherPage() {
  const router = useRouter()
  const [reauthOpen, setReauthOpen] = useState(false)
  const [authWaiting, setAuthWaiting] = useState(false)
  const { user, refresh: refreshUser } = useUser()
  const { settings } = useSettingsContext()
  const { updateInfo, checkingUpdate, appVersion, ensureUpdateCheck, isLaunching, setIsLaunching, launchingLabel, setLaunchingLabel } = useAppBootstrap()
  const [updating, setUpdating] = useState(false)
  const [downloadedBytes, setDownloadedBytes] = useState(0)
  const [contentLength, setContentLength] = useState<number | null>(null)
  const [wipGame, setWipGame] = useState<GameDefinition | null>(null)
  const [lastWipLabel, setLastWipLabel] = useState<string | null>(null)
  const { monitorGame, stopMonitoring } = useProcess()

  const handleSelect = async (game: GameDefinition) => {
    if (game.wip) {
      setWipGame(game)
      setLastWipLabel(game.label)
      return
    }

    try {
      setLaunchingLabel(game.label)
      setIsLaunching(true)
      await monitorGame(game.key)
      router.push(game.route)
    } catch (e) {
      console.error("Failed to set active game", e)
      setIsLaunching(false)
      setLaunchingLabel(null)
      router.push(game.route) // still allow navigation
    }
  }

  // Check token validity on entry (use in-memory user)
  useEffect(() => {
    (async () => {
      try {
        if (!user || !user.account) return; // local account -> nothing to do
        const auth = await getAuth();
        const expiredBySavedAt = auth ? isAuthExpired(auth.saved_at_ms) : true;
        const expiredByExpiresAt = auth?.expiresAt ? new Date(auth.expiresAt) <= new Date() : true;
        if (!auth || expiredBySavedAt || expiredByExpiresAt) {
          setReauthOpen(true);
        }
      } catch (err) {
        console.debug("auth check failed", err);
      }
    })();
  }, [user])

  useEffect(() => {
    if (wipGame?.label) {
      setLastWipLabel(wipGame.label)
      return
    }

    const timeout = lastWipLabel ? setTimeout(() => setLastWipLabel(null), 240) : null
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [wipGame, lastWipLabel])

  useEffect(() => {
    void ensureUpdateCheck()
  }, [ensureUpdateCheck])

  useEffect(() => {
    stopMonitoring()
  }, [stopMonitoring])

  const handleInstallUpdate = async () => {
    try {
      setUpdating(true);
      setDownloadedBytes(0);
      setContentLength(null);
      await installUpdate((ev) => {
        if (ev.event === 'Started') {
          setContentLength(ev.data?.contentLength ?? null);
        } else if (ev.event === 'Progress') {
          setDownloadedBytes(prev => prev + ev.data.chunkLength);
        }
      });
    } catch (e) {
      console.error('failed to install update', e);
      setUpdating(false);
    }
  }


  const handleContinueWithout = async () => {
    try {
      const name = user?.name || "Player";
      await createUser(false, name);
      await refreshUser();
      setReauthOpen(false);
    } catch (err) {
      console.error("failed to switch to local account", err);
    }
  }

  const handleLogin = async () => {
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
        // Exchange token and persist new token + expiry
        const exchanged = await exchangeToken(token);
        await saveAuth(exchanged.token, exchanged.expiresAt);

        // Fetch user and persist extended fields
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
      } catch (err) {
        console.error("auth callback handling failed", err);
      } finally {
        try { unsub?.(); } catch {}
      }
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Re-auth prompt modal */}
      <Dialog open={reauthOpen} onOpenChange={setReauthOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Sign in required</DialogTitle>
            <DialogDescription>
              Your session has expired. Log in again to continue with your account, or continue without an account.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
              onClick={handleContinueWithout}
            >
              Continue without account
            </button>
            <button
              className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand"
              onClick={handleLogin}
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
              We opened RelayDrive login in your default browser. Complete the sign-in there and keep this window open.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <div className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-label="loading" />
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
      <div className="flex flex-1 items-center justify-center px-6 py-16 pb-28">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-6">
          {games.map((g) => (
            <button
              key={g.key}
              onClick={() => handleSelect(g)}
              className="group relative w-56 overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-60 md:w-64 lg:w-72"
              aria-label={`Open ${g.label}`}
            >
              <Image
                src={g.image}
                alt={g.description}
                width={600}
                height={900}
                className="h-auto w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                priority
              />
            </button>
          ))}
        </div>
      </div>
      <Dialog open={!!wipGame} onOpenChange={(open) => {
        if (!open) {
          setWipGame(null)
        }
      }}>
        {(wipGame || lastWipLabel) && (
          <DialogContent showCloseButton={false} className="sm:max-w-sm border-none bg-transparent p-0 shadow-none">
            <Card className="rounded-lg border-white/10 bg-background/95 text-center shadow-lg backdrop-blur">
              <CardHeader className="space-y-2 text-center">
                <DialogTitle asChild>
                  <CardTitle className="text-xl sm:text-2xl">
                    {(wipGame?.label ?? lastWipLabel) ?? "Integration"} integration in development
                  </CardTitle>
                </DialogTitle>
                <DialogDescription asChild>
                  <CardDescription className="mx-auto max-w-xs">
                    We&apos;re still building the {(wipGame?.label ?? lastWipLabel) ?? ""} experience. Join the community for updates or read the RelayDrive blog.
                  </CardDescription>
                </DialogDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  <a href="https://discord.gg/nWQCFd9m4V" target="_blank" rel="noreferrer">
                    Join the Discord
                  </a>
                </Button>
                <Button
                  asChild
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  <a href="https://relaydrive.rotationracing.eu/blog" target="_blank" rel="noreferrer">
                    View the Blog
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </DialogContent>
        )}
      </Dialog>
      {/* Sticky footer updates bar (only when setting enabled) */}
      {settings?.checkForUpdates && (
        <div
          className={
            `fixed bottom-0 left-0 right-0 z-20 border-t ${updateInfo ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-100" : "bg-white/5 border-white/10"}`
          }
        >
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 min-h-7">
              {checkingUpdate ? (
                <>
                  <div className="size-3 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-label="checking" />
                  <span className="opacity-80">Checking for updates…</span>
                </>
              ) : updateInfo ? (
                <>
                  <span className="opacity-80">Update available</span>
                  <span className="font-medium">{updateInfo.version}</span>
                  <span className="opacity-40">(current {(updateInfo.currentVersion || appVersion || '—')})</span>
                </>
              ) : (
                <>
                  <span className="opacity-80">Up to date</span>
                  {appVersion && (
                    <span className="opacity-60"> — version {appVersion}</span>
                  )}
                </>
              )}
            </div>
            {/* Right control area with fixed height/width to avoid bar size changes */}
            <div className="flex items-center justify-end" style={{ minHeight: '1.75rem', minWidth: '92px' }}>
              {updateInfo ? (
                updating ? (
                  <div className="flex items-center gap-2 text-xs opacity-80">
                    <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-label="downloading" />
                    <span>
                      {contentLength ? `${Math.min(100, Math.floor((downloadedBytes / contentLength) * 100))}%` : 'Downloading…'}
                    </span>
                  </div>
                ) : (
                  <button
                    className={
                      `rounded-md px-3 py-1.5 text-xs ${updateInfo ? "bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-100" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`
                    }
                    onClick={handleInstallUpdate}
                  >
                    Update
                  </button>
                )
              ) : (
                // Placeholder to keep size consistent when no update
                <div style={{ width: 92, height: 28 }} />
              )}
            </div>
          </div>
        </div>
      )}
      {isLaunching && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Spinner className="size-8" />
            <div className="text-sm text-muted-foreground">
              Loading…
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
