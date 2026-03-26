"use client";

import { type UserData, getUser } from "@/app/tauri-bridge";
import { listen } from "@tauri-apps/api/event";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface UserContextValue {
  user: UserData | null | undefined; // undefined: loading, null: not found
  refresh: () => Promise<void>;
}

const Ctx = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const u = await getUser();
      setUser(u ?? null);
    } catch (e) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // initial load
    refresh();

    // Optionally listen to a custom event if other parts of the app emit it when user.json changes
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await listen("user-updated", refresh);
      } catch (e) {
        // ignore if event not emitted anywhere
      }
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, [refresh]);

  const value = useMemo(() => ({ user, refresh }), [user, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
