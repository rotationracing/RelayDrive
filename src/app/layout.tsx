import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next"
import type React from "react"
import "./globals.css"
import { MainAppLayout } from "@/components/main-app-layout"

export const metadata: Metadata = {
  title: "RelayDrive",
  description: "Advanced telemetry and AI race engineering for Assetto Corsa Competizione",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>
        <MainAppLayout>{children}</MainAppLayout>
      </body>
    </html>
  )
}
