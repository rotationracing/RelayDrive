"use client"

import { usePathname } from "next/navigation"
import DeepLinkListener from "@/components/deep-link-listener"
import { ThemeProvider } from "@/components/theme-provider"
import TitleBar from "@/components/titlebar"
import { Toaster } from "@/components/ui/sonner"
import { SettingsModal } from "@/components/settings/settings-modal"
import { GlobalHotkeyListener } from "@/components/global-hotkey-listener"
import { OverlayWindowSync } from "@/components/overlay-window-sync"
import { HotkeyActionRegistrar } from "@/components/hotkey-action-registrar"
import { AccPhysicsProvider } from "@/contexts/AccPhysicsContext"
import { AccGraphicsProvider } from "@/contexts/AccGraphicsContext"
import { AccBroadcastProvider } from "@/contexts/AccBroadcastContext"
import { AppBootstrapProvider } from "@/contexts/AppBootstrapContext"
import { ProcessProvider } from "@/contexts/ProcessContext"
import { SettingsModalProvider } from "@/contexts/SettingsModalContext"
import { SettingsProvider } from "@/contexts/SettingsContext"
import { UserProvider } from "@/contexts/UserContext"
import type React from "react"

export function MainAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isOverlayWindow = pathname?.startsWith("/overlay/")

  if (isOverlayWindow) {
    // Lightweight layout for overlay windows - minimal providers for telemetry access
    return (
      <ProcessProvider>
        <AccPhysicsProvider>
          <AccGraphicsProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <div className="bg-transparent text-foreground overflow-hidden" style={{ backgroundColor: "transparent" }}>
                {children}
                <Toaster position="bottom-right" richColors closeButton />
              </div>
            </ThemeProvider>
          </AccGraphicsProvider>
        </AccPhysicsProvider>
      </ProcessProvider>
    )
  }

  // Full app layout with all providers
  return (
    <ProcessProvider>
      <AccPhysicsProvider>
        <AccGraphicsProvider>
          <AccBroadcastProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <SettingsProvider>
                <SettingsModalProvider>
                  <AppBootstrapProvider>
                    <UserProvider>
                    <HotkeyActionRegistrar />
                    <GlobalHotkeyListener />
                    <OverlayWindowSync />
                    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
                      <TitleBar />
                      <div className="flex-1 overflow-auto">
                        <div className="h-full">
                          <DeepLinkListener />
                          {children}
                        </div>
                      </div>
                      <Toaster position="bottom-right" richColors closeButton />
                      <SettingsModal />
                    </div>
                    </UserProvider>
                  </AppBootstrapProvider>
                </SettingsModalProvider>
              </SettingsProvider>
            </ThemeProvider>
          </AccBroadcastProvider>
        </AccGraphicsProvider>
      </AccPhysicsProvider>
    </ProcessProvider>
  )
}

