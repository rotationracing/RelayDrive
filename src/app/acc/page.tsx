"use client";

import { useAppBootstrap } from "@/contexts/AppBootstrapContext";
import { Hammer } from "lucide-react";
import { useEffect } from "react";

export default function ACCHomeRoute() {
  const { setIsLaunching, setLaunchingLabel } = useAppBootstrap();

  useEffect(() => {
    setIsLaunching(false);
    setLaunchingLabel(null);
  }, [setIsLaunching, setLaunchingLabel]);

  return (
    <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-6">
      <Hammer className="w-12 h-12 mb-4 opacity-30" />
      <h1 className="text-2xl font-bold text-foreground mb-2">this page is in work in progress</h1>
      <p className="text-sm">We are currently building this dashboard. Please check back later.</p>
    </div>
  );
}
