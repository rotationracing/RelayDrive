"use client"

import type { Page } from "@/components/main-app"
import { Sidebar } from "@/components/sidebar"
import { usePathname } from "next/navigation"
import type React from "react"
import { useMemo } from "react"

export const dynamic = "force-dynamic"

export default function ACCLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const currentPage: Page = useMemo(() => {
    if (!pathname) return "home"
    if (pathname.startsWith("/acc/overlay")) return "overlay"
    if (pathname.startsWith("/acc/console")) return "console"
    if (pathname.startsWith("/acc/settings")) return "settings"
    if (pathname.startsWith("/acc/profile")) return "profile"
    return "home"
  }, [pathname])

  return (
    <div className="flex h-full min-h-0 bg-background overflow-hidden">
      <Sidebar currentPage={currentPage} onPageChange={() => {}} onboarding={false} basePath="/acc" />
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full min-h-0 overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}
