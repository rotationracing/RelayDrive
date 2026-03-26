"use client"

import { Sidebar } from "@/components/sidebar"
import { useState } from "react"

export type Page = "home" | "overlay" | "console" | "profile" | "settings" | "setup"

interface MainAppProps {
  onboarding?: boolean;
}

const MainApp = ({ onboarding }: MainAppProps) => {
  const [currentPage, setCurrentPage] = useState<Page>("home")

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <div className="p-6">Home</div>
      case "overlay":
        return <div className="p-6">Overlay</div>
      case "console":
        return <div className="p-6">Console</div>
      default:
        return <div className="p-6">Home</div>
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} onboarding={onboarding} />
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">{renderPage()}</div>
      </main>
    </div>
  )
}

export default MainApp
