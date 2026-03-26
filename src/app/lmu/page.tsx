"use client"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function LMUPage() {
  return (
    <div className="h-full">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">LMU</h1>
          <Link href="/launcher" className="text-sm text-muted-foreground hover:underline">
            Back to Launcher
          </Link>
        </div>
        <Card className="rounded-app">
          <CardHeader>
            <CardTitle>Le Mans Ultimate UI</CardTitle>
            <CardDescription>
              This is a placeholder for the LMU-specific UI. Build out pages and components under this route.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
