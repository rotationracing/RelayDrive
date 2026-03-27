"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { carNameMap } from "@/config/carNameMap"
import { useAppBootstrap } from "@/contexts/AppBootstrapContext"
import { useProcess } from "@/contexts/ProcessContext";
import { invoke } from "@tauri-apps/api/core"
import { type UnlistenFn, listen } from "@tauri-apps/api/event"
import { Activity, Car, Gauge, Loader2, MapPin, User, Wifi, WifiOff } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

function HomePage() {
  const [accStatus, setAccStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [sessionInfo, setSessionInfo] = useState({
    track: "--",
    driver: "--",
    car_model: "--",
  });
  const { isRunning, isLoading, error } = useProcess();
  const { setIsLaunching, setLaunchingLabel } = useAppBootstrap()
  const staticsFetchedRef = useRef(false);

  const fetchStatics = useCallback(async () => {
    try {
      const res: any = await invoke("get_acc_statics");
      if (!res) return;
      const driver = buildDriverName(res.playerName, res.playerSurname, res.playerNick);
      setSessionInfo({
        track: res.track ?? "--",
        driver,
        car_model: res.carModel ?? "--",
      });
      staticsFetchedRef.current = true;
    } catch (e) {
      console.debug("get_acc_statics failed", e);
    }
  }, []);

  useEffect(() => {
    setIsLaunching(false)
    setLaunchingLabel(null)
  }, [setIsLaunching, setLaunchingLabel])

  useEffect(() => {
    if (isLoading) return;
    setAccStatus(isRunning ? 'connected' : 'disconnected');
    if (!isRunning) {
      staticsFetchedRef.current = false;
      setSessionInfo({
        track: "--",
        driver: "--",
        car_model: "--",
      });
    }
  }, [isRunning, isLoading]);

  useEffect(() => {
    if (accStatus === 'connected') {
      staticsFetchedRef.current = false;
      fetchStatics();
    }
  }, [accStatus, fetchStatics]);

  useEffect(() => {
    if (accStatus !== 'connected') {
      return;
    }

    let unlisten: UnlistenFn | null = null;
    let mounted = true;

    const subscribe = async () => {
      try {
        unlisten = await listen("acc://physics", (event) => {
          if (!mounted) return;
          const status = (event.payload as any)?.status;

          if (status === "ok") {
            if (!staticsFetchedRef.current) {
              fetchStatics();
            }
            return;
          }

          if (status === "waiting") {
            staticsFetchedRef.current = false;
            return;
          }

          if (status === "error") {
            staticsFetchedRef.current = false;
            setSessionInfo({
              track: "--",
              driver: "--",
              car_model: "--",
            });
          }
        });
      } catch (error) {
        console.warn("Failed to subscribe to physics stream", error);
      }
    };

    subscribe();

    return () => {
      mounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, [accStatus, fetchStatics]);

  const currentSession = useMemo(
    () => ({
      track: sessionInfo.track,
      driver: sessionInfo.driver,
      car: sessionInfo.car_model,
      isActive: accStatus === 'connected',
    }),
    [sessionInfo, accStatus]
  );

  const carLabel = useMemo(() => prettifyCarName(currentSession.car), [currentSession.car]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6 md:px-8 md:py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back to RelayDrive. Here's your system status and session overview.
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                Game
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {accStatus === 'connecting' ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      <span>Launching...</span>
                    </>
                  ) : accStatus === 'connected' ? (
                    <Badge variant="default" className="rounded-control bg-status-online">
                      Running
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="rounded-control bg-status-offline">
                      Offline
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Live</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Wifi className="w-4 h-4 mr-2" />
                Server
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="rounded-control bg-status-online">
                  Online
                </Badge>
                <div className="text-xs text-muted-foreground">Sync</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <WifiOff className="w-4 h-4 mr-2" />
                Voice
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="rounded-control bg-status-offline">
                  Offline
                </Badge>
                <div className="text-xs text-muted-foreground">--</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-app">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Gauge className="w-4 h-4 mr-2" />
                AI
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="rounded-control bg-status-offline">
                  Offline
                </Badge>
                <div className="text-xs text-muted-foreground">--</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Session & Changelog Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Session */}
          <Card className="rounded-app">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Car className="w-5 h-5 mr-2" />
                Current Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentSession.isActive ? (
                <>
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{currentSession.track}</div>
                      <div className="text-xs text-muted-foreground">Track</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{currentSession.driver}</div>
                      <div className="text-xs text-muted-foreground">Driver</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Car className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{carLabel}</div>
                      <div className="text-xs text-muted-foreground">Vehicle</div>
                    </div>
                  </div>

                  <Badge variant="default" className="rounded-control bg-status-online w-fit">
                    Session Active
                  </Badge>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No active session</p>
                  <p className="text-sm">Launch ACC to begin</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Changelog */}
          <Card className="rounded-panel lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Activity className="w-5 h-5 mr-2" />
                What's New
              </CardTitle>
              <CardDescription>Latest updates and improvements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="border-l-2 border-red-accent pl-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">v0.0.2</div>
                    <Badge variant="outline" className="rounded-control text-xs">
                      Latest
                    </Badge>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• New settings page design</li>
                    <li>• Preparing design rework of the app</li>
                  </ul>
                </div>

                <div className="border-l-2 border-muted pl-4">
                  <div className="font-medium mb-1">v0.0.1</div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Very early alpha release</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  )
}

export default function ACCHomeRoute() {
  return <HomePage />
}

function buildDriverName(first?: string, last?: string, nick?: string): string {
  const safeFirst = first?.trim();
  const safeLast = last?.trim();

  if (safeFirst && safeLast) {
    return `${safeFirst} ${safeLast}`;
  }

  if (safeFirst) return safeFirst;
  if (safeLast) return safeLast;
  if (nick) return nick;
  return "--";
}

function prettifyCarName(model: string): string {
  if (!model) return "--";
  const key = model.toLowerCase();
  const mapped = carNameMap[key];
  if (mapped) return mapped;

  const words = key.split("_").map((w) => {
    switch (w) {
      case "gt3":
      case "gt4":
      case "gt2":
      case "g3":
      case "rs":
      case "r":
      case "v8":
      case "v12":
      case "ii":
      case "amg":
      case "lm":
      case "lms":
        return w.toUpperCase();
      case "xbow":
        return "X-Bow";
      default:
        return w.charAt(0).toUpperCase() + w.slice(1);
    }
  });

  return words.join(" ");
}
