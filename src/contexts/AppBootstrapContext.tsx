"use client";

import { type UpdateMetadata, fetchUpdate } from "@/app/tauri-bridge";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { getVersion } from "@tauri-apps/api/app";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface AppBootstrapContextValue {
  updateInfo: UpdateMetadata | null;
  checkingUpdate: boolean;
  checkedAt: number | null;
  ensureUpdateCheck: (force?: boolean) => Promise<void> | void;
  refreshUpdateCheck: () => Promise<void> | void;
  isLaunching: boolean;
  setIsLaunching: (value: boolean) => void;
  launchingLabel: string | null;
  setLaunchingLabel: (value: string | null) => void;
  appVersion: string;
}

const AppBootstrapContext = createContext<AppBootstrapContextValue | undefined>(undefined);

export function AppBootstrapProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettingsContext();
  const [updateInfo, setUpdateInfo] = useState<UpdateMetadata | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [appVersion, setAppVersion] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchingLabel, setLaunchingLabel] = useState<string | null>(null);
  const hasCheckedRef = useRef(false);
  const checkingPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let active = true;
    const loadVersion = async () => {
      try {
        const version = await getVersion();
        if (active) setAppVersion(version);
      } catch {}
    };
    void loadVersion();
    return () => {
      active = false;
    };
  }, []);

  const runUpdateCheck = useCallback(async () => {
    try {
      console.log("[updater] checking for updates…");
      const info = await fetchUpdate();
      setUpdateInfo(info);
      if (info) {
        console.log("[updater] update available", info);
      } else {
        console.log("[updater] up to date");
      }
    } catch (err) {
      console.error("[updater] failed to load settings/update", err);
    }
  }, []);

  const ensureUpdateCheck = useCallback(
    async (force = false) => {
      if (!settings) return;
      if (!force && hasCheckedRef.current) return;
      if (checkingPromiseRef.current) return checkingPromiseRef.current;
      hasCheckedRef.current = true;
      if (!settings.checkForUpdates) {
        setUpdateInfo(null);
        setCheckingUpdate(false);
        setCheckedAt(Date.now());
        checkingPromiseRef.current = null;
        return;
      }
      setCheckingUpdate(true);
      const task = (async () => {
        try {
          await runUpdateCheck();
        } finally {
          setCheckingUpdate(false);
          setCheckedAt(Date.now());
          checkingPromiseRef.current = null;
        }
      })();
      checkingPromiseRef.current = task;
      return task;
    },
    [runUpdateCheck, settings],
  );

  const refreshUpdateCheck = useCallback(async () => {
    hasCheckedRef.current = false;
    await ensureUpdateCheck(true);
  }, [ensureUpdateCheck]);

  useEffect(() => {
    if (settings) {
      void ensureUpdateCheck();
    }
  }, [settings, ensureUpdateCheck]);

  const value = useMemo(
    () => ({
      updateInfo,
      checkingUpdate,
      checkedAt,
      ensureUpdateCheck,
      refreshUpdateCheck,
      isLaunching,
      setIsLaunching,
      launchingLabel,
      setLaunchingLabel,
      appVersion,
    }),
    [
      updateInfo,
      checkingUpdate,
      checkedAt,
      ensureUpdateCheck,
      refreshUpdateCheck,
      isLaunching,
      launchingLabel,
      appVersion,
    ],
  );

  return <AppBootstrapContext.Provider value={value}>{children}</AppBootstrapContext.Provider>;
}

export function useAppBootstrap() {
  const context = useContext(AppBootstrapContext);
  if (!context) throw new Error("useAppBootstrap must be used within AppBootstrapProvider");
  return context;
}
