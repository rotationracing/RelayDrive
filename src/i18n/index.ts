"use client";

// Minimal i18n runtime for the app. Loads JSON locale files dynamically
// and exposes a translation function and hook.

import { useSettingsContext } from "@/contexts/SettingsContext";
import type { LanguageCode } from "@/lib/language";
import { useEffect, useMemo, useState } from "react";

export type Messages = Record<string, any>;

let currentLocale: LanguageCode = "en";
const messagesCache: Record<string, Messages> = {};
const localeListeners = new Set<(lc: LanguageCode) => void>();

export function getLocale() {
  return currentLocale;
}

export async function setLocale(locale: LanguageCode) {
  currentLocale = locale;
  if (!messagesCache[locale]) {
    messagesCache[locale] = await loadMessages(locale);
  }
  // Notify subscribers
  for (const cb of Array.from(localeListeners)) {
    try {
      cb(locale);
    } catch {}
  }
}

export function onLocaleChange(cb: (lc: LanguageCode) => void) {
  localeListeners.add(cb);
  return () => localeListeners.delete(cb);
}

async function loadMessages(locale: LanguageCode): Promise<Messages> {
  switch (locale) {
    case "de":
      return (await import("@/i18n/locales/de.json")).default as Messages;
    case "fr":
      return (await import("@/i18n/locales/fr.json")).default as Messages;
    default:
      return (await import("@/i18n/locales/en.json")).default as Messages;
  }
}

export function translate(path: string, fallback?: string): string {
  const parts = path.split(".");
  let node: any = messagesCache[currentLocale];
  for (const p of parts) {
    if (node && typeof node === "object" && p in node) {
      node = node[p];
    } else {
      return fallback ?? path;
    }
  }
  if (typeof node === "string") return node;
  return fallback ?? path;
}

export function useI18n() {
  const [ready, setReady] = useState(false);
  const [locale, setLocaleState] = useState<LanguageCode>(currentLocale);
  const { settings } = useSettingsContext();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const lc = (settings?.language || "en") as LanguageCode;
      await setLocale(lc);
      if (mounted) {
        setLocaleState(lc);
        setReady(true);
      }
    })();
    const off = onLocaleChange((lc) => {
      if (!mounted) return;
      setLocaleState(lc);
    });
    return () => {
      mounted = false;
    };
  }, [settings?.language]);

  const t = useMemo(
    () => (key: string, fallback?: string) => translate(key, fallback),
    [locale, ready],
  );

  return { t, ready, locale };
}
