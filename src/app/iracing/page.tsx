"use client"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppBootstrap } from "@/contexts/AppBootstrapContext"
import Link from "next/link"
import { useEffect } from "react"

export default function IRacingPage() {
  const { setIsLaunching, setLaunchingLabel } = useAppBootstrap()

  useEffect(() => {
    setIsLaunching(false)
    setLaunchingLabel(null)
  }, [setIsLaunching, setLaunchingLabel])

  return (
    <div className="h-full">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">iRacing</h1>
          <Link href="/launcher" className="text-sm text-muted-foreground hover:underline">
            Back to Launcher
          </Link>
        </div>
        <Card className="rounded-app">
          <CardHeader>
            <CardTitle>iRacing UI</CardTitle>
            <CardDescription>
              This is a placeholder for the iRacing-specific UI. Build out pages and components under
              <code className="ml-1">src/components/</code> and this route.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
