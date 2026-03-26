"use client"

import { importSettingsJson } from "@/app/tauri-bridge"
import { MeasurementUnitsModal } from "@/components/settings/MeasurementUnitsModal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSettingsContext } from "@/contexts/SettingsContext"
import { setLocale, useI18n } from "@/i18n"
import { LANGUAGE_OPTIONS } from "@/lib/language"
import type { LanguageCode } from "@/lib/language"
import { CHOICE_IMPERIAL, CHOICE_METRIC, type UnitsMode, inferUnitsModeFromChoice } from "@/lib/units"
import { initDeepLinkListener } from "@/services/deep-link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Info } from "lucide-react"
import { type SettingsData, createUser, exchangeToken, fetchMe, openUrlCmd, saveAuth, saveSettings } from "../tauri-bridge.ts"

export default function OnboardingPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [step, setStep] = useState<"welcome" | "choice" | "username" | "welcome-back" | "settings" | "data-sharing" | "pro-subscription" | "fps-warning">("welcome")
  const [isAccount, setIsAccount] = useState<boolean>(false)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [processingAuth, setProcessingAuth] = useState(false)
  const [welcomeUser, setWelcomeUser] = useState<string | null>(null)
  const [welcomeFade, setWelcomeFade] = useState(false)
  const { settings: globalSettings, persist, reload } = useSettingsContext()
  const [settings, setSettings] = useState<SettingsData>(() => ({
    checkForUpdates: true,
    language: "en",
    measurement_units: CHOICE_METRIC,
    hotkeys: {
      toggle_overlay_edit_mode: "Alt + E",
    },
    connectionSettings: {
      acc: { host: "127.0.0.1", port: 9000, connectionPassword: "", commandPassword: "" },
      iracing: { host: "127.0.0.1", port: 9000, connectionPassword: "", commandPassword: "" },
      lmu: { host: "127.0.0.1", port: 9000, connectionPassword: "", commandPassword: "" },
    },
    dataShareConsent: false,
    proSubscriptionPlan: null,
  }))
  const [unitsMode, setUnitsMode] = useState<UnitsMode>("metric")
  const [unitsModalOpen, setUnitsModalOpen] = useState(false)
  const [proSubscriptionChoice, setProSubscriptionChoice] = useState<"pro" | "free" | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Sync local editable state from global once when entering settings or when provider loads
  useEffect(() => {
    if (step !== "settings") return
    if (!globalSettings) {
      // provider not loaded yet; keep defaults
      return
    }
    const loaded: SettingsData = {
      checkForUpdates: globalSettings.checkForUpdates ?? true,
      language: globalSettings.language || "en",
      measurement_units: globalSettings.measurement_units || CHOICE_METRIC,
      hotkeys: globalSettings.hotkeys || {
        toggle_overlay_edit_mode: "Alt + E",
      },
      connectionSettings: globalSettings.connectionSettings || {
        acc: { host: "127.0.0.1", port: 9000, connectionPassword: "", commandPassword: "" },
        iracing: { host: "127.0.0.1", port: 9000, connectionPassword: "", commandPassword: "" },
        lmu: { host: "127.0.0.1", port: 9000, connectionPassword: "", commandPassword: "" },
      },
      dataShareConsent: globalSettings.dataShareConsent ?? false,
      proSubscriptionPlan: globalSettings.proSubscriptionPlan ?? null,
    }
    setSettings(loaded)
    setUnitsMode(inferUnitsModeFromChoice(loaded.measurement_units))
  }, [step, globalSettings])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (step === "welcome") handleGetStarted()
        else if (step === "choice") handleUseWithoutAccount()
        else if (step === "username") handleConfirm()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [step, name])

  const handleGetStarted = () => setStep("choice")

  // Skip flow first (local account)
  const handleUseWithoutAccount = () => {
    setIsAccount(false)
    setStep("username")
  }

  const handleLoginAccount = async () => {
    setIsAccount(true)
    setAuthOpen(true)
    setAuthError(null)
    try {
      // Use backend command to open via Windows cmd `start` (default browser)
      await openUrlCmd("https://relaydrive.rotationracing.eu/auth")
    } catch (e) {
      console.error("Failed to open auth url via cmd start", e)
      setAuthError("We couldn't open your default browser automatically. Copy the link below and paste it into your browser.")
    }
  }

  // When auth modal is open, start listening for deep link callbacks
  useEffect(() => {
    if (!authOpen) return;
    let unsub: (() => void) | null = null;
    (async () => {
      unsub = await initDeepLinkListener(async ({ parsed, source }) => {
        try {
          // Ignore app-initial links to avoid using stale tokens
          if (source !== "event") return;
          // Expecting relaydrive://callback?auth=JWT
          if (parsed.path !== "callback") return;
          const token = parsed.query.auth;
          if (!token) return;
          if (processingAuth) return;
          setProcessingAuth(true);

          // 1) Exchange short-lived auth token for 30-day token (backend)
          const exchanged = await exchangeToken(token);

          // 2) Persist the 30-day token with expiry in auth.json
          await saveAuth(exchanged.token, exchanged.expiresAt);

          // 3) Fetch user profile using the new token (backend)
          const me = await fetchMe(exchanged.token);

          // 4) Save user.json with extended fields
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

          // 5) Greet and then proceed to settings after 3s
          const displayName = me.username || me.fullName || "there";
          setWelcomeUser(displayName);
          setAuthOpen(false);
          setStep("welcome-back");
          // Trigger fade-out earlier and navigate after it completes
          setWelcomeFade(false);
          setTimeout(() => setWelcomeFade(true), 1500);
          setTimeout(() => {
            setStep("settings");
          }, 3000);
        } catch (err) {
          console.error("auth callback handling failed", err);
          setAuthError("Authentication failed. Please try again.");
        }
      });
    })();
    return () => {
      try { unsub?.(); } catch {}
      setProcessingAuth(false);
    };
  }, [authOpen, router]);

  const handleConfirm = async () => {
    setError(null)
    const trimmed = name.trim()
    const valid = /^[A-Za-z]{3,12}$/.test(trimmed)
    if (!valid) {
      if (trimmed.length < 3) setError("Minimum 3 letters")
      else if (trimmed.length > 12) setError("Maximum 12 letters")
      else setError("Letters A–Z only")
      return
    }
    try {
      setSaving(true)
      await createUser(isAccount, trimmed)
      // After local username, go to settings
      setStep("settings")
    } catch (e: any) {
      console.error(e)
      setError(typeof e === "string" ? e : "Failed to save user")
    } finally {
      setSaving(false)
    }
  }

  const handleContinueFromSettings = async () => {
    try {
      await persist(settings)
      setStep("data-sharing")
    } catch (e) {
      console.error('failed to save settings', e)
    }
  }

  const handleContinueFromDataSharing = async () => {
    const updatedSettings: SettingsData = {
      ...settings,
      dataShareConsent: true,
    }
    setSettings(updatedSettings)
    try {
      await persist(updatedSettings)
    } catch (e) {
      console.error("failed to save data sharing preference", e)
    }
    setStep("pro-subscription")
  }

  const handleProSubscription = async (choice: "pro" | "free") => {
    setProSubscriptionChoice(choice)
    const updatedSettings: SettingsData = {
      ...settings,
      proSubscriptionPlan: choice,
    }
    try {
      await persist(updatedSettings)
    } catch (e) {
      console.error('failed to save pro subscription choice', e)
    }
    setStep("fps-warning")
  }

  const handleFinishOnboarding = async () => {
    router.replace('/launcher')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      {/* Auth waiting modal */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
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
          {authError && (
            <div className="mt-3 text-sm">
              <div className="text-red-accent mb-2">{authError}</div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value="https://relaydrive.rotationracing.eu/auth"
                  className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
                />
                <button
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10"
                  onClick={() => navigator.clipboard.writeText("https://relaydrive.rotationracing.eu/auth")}
                >
                  Copy
                </button>
              </div>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
              onClick={() => setAuthOpen(false)}
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {step === "welcome" && (
        <div className="w-full max-w-xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">Thank you for installing RelayDrive</h2>
          <div className="mt-6 flex justify-center">
            <button
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              onClick={handleGetStarted}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "settings" && (
        <div className="w-full max-w-2xl">
          <h4 className="text-xl md:text-2xl font-semibold text-center">Configure your settings</h4>
          <div className="mt-6 mx-auto w-full max-w-lg">
            {/* Language */}
            <div className="flex items-center gap-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{t("common.language")}</div>
                <div className="text-xs text-muted-foreground">{t("common.choose_language")}</div>
              </div>
              <div className="shrink-0">
                <Select value={settings.language} onValueChange={async (v) => {
                  // Update state immediately
                  setSettings(s => ({ ...s, language: v }))
                  // Switch i18n locale instantly
                  await setLocale(v as LanguageCode)
                  // Do not persist yet; save on Continue to minimize writes
                }}>
                  <SelectTrigger className="w-56 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map(opt => (
                      <SelectItem key={opt.code} value={opt.code}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Measurement Units 3-button toggle */}
            <div className="flex items-center gap-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{t("common.measurement_units")}</div>
                <div className="text-xs text-muted-foreground">{t("common.choose_units")}</div>
              </div>
              <div className="flex rounded-md overflow-hidden border border-white/10 shrink-0">
                <button
                  className={`px-3 py-1.5 text-xs ${unitsMode === "custom" ? "bg-white/10" : "bg-transparent"}`}
                  onClick={() => {
                    setUnitsModalOpen(true)
                  }}
                >
                  {t("common.custom")}
                </button>
                <button
                  className={`px-3 py-1.5 text-xs ${unitsMode === "imperial" ? "bg-white/10" : "bg-transparent"}`}
                  onClick={() => {
                    setUnitsMode("imperial")
                    setSettings(s => ({ ...s, measurement_units: CHOICE_IMPERIAL }))
                  }}
                >
                  {t("common.imperial")}
                </button>
                <button
                  className={`px-3 py-1.5 text-xs ${unitsMode === "metric" ? "bg-white/10" : "bg-transparent"}`}
                  onClick={() => {
                    setUnitsMode("metric")
                    setSettings(s => ({ ...s, measurement_units: CHOICE_METRIC }))
                  }}
                >
                  {t("common.metric")}
                </button>
              </div>
            </div>

            {/* Check for updates */}
            <div className="flex items-center gap-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{t("common.check_for_updates")}</div>
                <div className="text-xs text-muted-foreground">{t("common.check_for_updates_desc")}</div>
              </div>
              <Switch
                checked={settings.checkForUpdates}
                onCheckedChange={(v) => setSettings(s => ({ ...s, checkForUpdates: v }))}
                aria-label="Check for updates"
              />
            </div>
            <div className="mt-6 grid grid-cols-10 gap-3">
              {/* hidden file input for importing settings.json */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  try {
                    const text = await f.text()
                    await importSettingsJson(text)
                    await reload()
                    router.replace('/launcher')
                  } catch (err) {
                    console.error('failed to import settings', err)
                  } finally {
                    // reset input value so selecting the same file again triggers change
                    e.currentTarget.value = ''
                  }
                }}
              />
              <button
                className="col-span-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                onClick={async () => {
                  fileInputRef.current?.click()
                }}
              >
                Import
              </button>
              <button
                className="col-span-7 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                onClick={handleContinueFromSettings}
              >
                Continue
              </button>
            </div>
          </div>
          <MeasurementUnitsModal
            open={unitsModalOpen}
            onOpenChange={setUnitsModalOpen}
            valueChoice={settings.measurement_units}
            onSave={(choice) => {
              setSettings(s => ({ ...s, measurement_units: choice }))
              setUnitsMode("custom")
            }}
          />
        </div>
      )}

      {step === "data-sharing" && (
        <div className="w-full max-w-2xl">
          <h4 className="text-xl md:text-2xl font-semibold text-center mb-2">Help us improve RelayDrive</h4>
          <p className="text-center text-sm text-muted-foreground mb-6">Share usage data to help make RelayDrive better</p>
          <div className="mx-auto w-full max-w-lg">
            <div className="rounded-lg border border-white/10 bg-white/5 p-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h5 className="text-sm font-medium mb-2">Share non-game related data</h5>
                  <p className="text-xs text-muted-foreground mb-3">
                    Help us improve the app by sharing:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                    <li>• System specifications (GPU, CPU, RAM)</li>
                    <li>• Overlay interaction logs (toggle on/off, settings changes)</li>
                    <li>• Anonymous settings preferences</li>
                  </ul>
                  <div className="text-xs text-muted-foreground italic flex items-center gap-2">
                    <span>Even with sharing off, some online features may require limited diagnostics.</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="More information about data sharing"
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Info className="size-4" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" className="max-w-xs text-left leading-relaxed">
                        If you later enable online features of RelayDrive Pro, some required information will still be sent so those services can function correctly.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                onClick={async () => {
                  const updatedSettings: SettingsData = {
                    ...settings,
                    dataShareConsent: false,
                  }
                  setSettings(updatedSettings)
                  try {
                    await persist(updatedSettings)
                  } catch (e) {
                    console.error("failed to save data sharing preference", e)
                  }
                  setStep("pro-subscription")
                }}
              >
                Decline
              </button>
              <button
                className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
                onClick={handleContinueFromDataSharing}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "pro-subscription" && (
        <div className="w-full max-w-2xl">
          <h4 className="text-xl md:text-2xl font-semibold text-center mb-2">Unlock Premium Features</h4>
          <p className="text-center text-sm text-muted-foreground mb-6">Get advanced analysis and cloud features for 5€ per month</p>
          <div className="mx-auto w-full max-w-lg">
            <div className="text-center mb-6">
              <ul className="text-xs text-muted-foreground space-y-2 mt-4 mb-2 text-left">
                <li className="flex items-center gap-2">
                  <span className="text-brand">✓</span> Cloud synchronization
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">✓</span> AI telemetry analysis
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">✓</span> CrewSync Pro
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">✓</span> LeagueStream
                </li>
              </ul>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
                onClick={() => handleProSubscription("pro")}
              >
                Get Pro
              </button>
              <button
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                onClick={() => handleProSubscription("free")}
              >
                Continue with free account
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "fps-warning" && (
        <div className="w-full max-w-2xl">
          <div className="mx-auto w-full max-w-lg">
            <div className="flex items-start gap-3 mb-6">
              <div className="shrink-0 mt-0.5 text-red-500">⚠️</div>
              <div className="flex-1">
                <h5 className="text-base font-semibold mb-2">Limit your in-game FPS for smooth overlays</h5>
                <p className="text-sm text-muted-foreground mb-4">
                  To avoid stutter and lag, cap your in-game FPS slightly below your stable maximum so the overlay has headroom to render.
                </p>
                <div className="rounded-md border border-white/10 bg-black/20 p-4 mb-3">
                  <p className="text-xs font-mono text-muted-foreground mb-1">Example</p>
                  <p className="text-sm">
                    If your game is stable at <span className="font-semibold text-brand">120 FPS</span>, set a limit to{' '}
                    <span className="font-semibold text-brand">100–110 FPS</span>.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  This buffer ensures the overlay doesn't compete with the game for system resources.
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                onClick={() => setStep("pro-subscription")}
              >
                Back
              </button>
              <button
                className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
                onClick={handleFinishOnboarding}
              >
                Finish Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "welcome-back" && (
        <div className={`w-full max-w-xl text-center transition-opacity duration-1000 ease-in-out ${welcomeFade ? "opacity-0" : "opacity-100"}`}>
          <h2 className="text-2xl md:text-3xl font-semibold">Welcome back {welcomeUser}</h2>
        </div>
      )}

      {step === "choice" && (
        <div className="w-full max-w-xl text-center">
          <h3 className="text-xl md:text-2xl font-semibold">Get the best out of RelayDrive</h3>
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              className="w-full max-w-sm rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={handleLoginAccount}
            >
              Login to your account
            </button>
            <button
              className="w-full max-w-sm rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              onClick={handleUseWithoutAccount}
            >
              Continue without account
            </button>
          </div>
        </div>
      )}

      {step === "username" && (
        <div className="w-full max-w-xl text-center">
          <h4 className="text-xl md:text-2xl font-semibold">Choose a username</h4>
          <p className="mt-1 text-sm text-muted-foreground">3–12 letters, A–Z only</p>
          <div className="mt-5 mx-auto w-full max-w-sm text-left">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^A-Za-z]/g, ""))}
              maxLength={12}
              placeholder="Your name"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder-white/40 outline-none focus:border-brand"
            />
            {error && <div className="mt-2 text-xs text-red-accent">{error}</div>}
          </div>
          <div className="mt-5 mx-auto w-full max-w-sm flex gap-2">
            <button
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
              onClick={() => setStep("choice")}
              disabled={saving}
            >
              Back
            </button>
            <button
              className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand disabled:opacity-60"
              onClick={handleConfirm}
              disabled={saving}
            >
              {saving ? "Saving..." : "Confirm"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
