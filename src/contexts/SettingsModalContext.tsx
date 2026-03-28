"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface SettingsModalContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SettingsModalContext = createContext<SettingsModalContextType | undefined>(undefined);

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <SettingsModalContext.Provider value={{ open, setOpen }}>
      {children}
    </SettingsModalContext.Provider>
  );
}

export function useSettingsModal() {
  const context = useContext(SettingsModalContext);
  if (context === undefined) {
    // Return a no-op implementation if context is not available (e.g., in overlay windows)
    return { open: false, setOpen: () => {} };
  }
  return context;
}
