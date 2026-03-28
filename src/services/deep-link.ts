"use client";

import {
  DEEP_LINK_ALLOWED_PROTOCOLS,
  DEEP_LINK_PROTOCOL,
  DeepLinkEvents,
} from "@/config/constants";
import { type ParsedDeepLink, parseDeepLink } from "@/lib/deeplink";
import { type UnlistenFn, listen as listenEvent } from "@tauri-apps/api/event";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";

export type DeepLinkHandler = (payload: {
  url: string;
  parsed: ParsedDeepLink;
  source: "initial" | "event";
}) => void;

let unsubscribe: (() => void) | null = null;

export async function initDeepLinkListener(cb: DeepLinkHandler) {
  // Listen for runtime deep links
  unsubscribe?.();
  const unlistenFns: UnlistenFn[] = [];

  try {
    unsubscribe = await onOpenUrl(async (urls: string[]) => {
      for (const url of urls) {
        if (!url || typeof url !== "string") continue;
        try {
          const parsed = parseDeepLink(url);
          // In dev, accept both relaydrive and relaydrive-dev; in prod, this array still includes only prod+dev
          if (!DEEP_LINK_ALLOWED_PROTOCOLS.includes(parsed.protocol as any)) {
            // Ignore unrelated schemes for safety
            continue;
          }
          console.log("[deep-link:event]", { url, parsed });
          cb({ url, parsed, source: "event" });
        } catch (err) {
          console.warn("[deep-link:event] parse error", err);
        }
      }
    });
  } catch (err) {
    console.debug("[deep-link] onOpenUrl unavailable", err);
  }

  // Fallback: listen to core event forwarded by single-instance plugin (Rust emits array of URLs)
  try {
    const unlistenCore = await listenEvent<string[] | string>(DeepLinkEvents.OpenUrl, (event) => {
      const payload = event.payload;
      const urls = Array.isArray(payload) ? payload : [payload];
      for (const url of urls) {
        if (!url || typeof url !== "string") continue;
        try {
          const parsed = parseDeepLink(url);
          if (!DEEP_LINK_ALLOWED_PROTOCOLS.includes(parsed.protocol as any)) continue;
          console.log("[deep-link:event:core]", { url, parsed });
          cb({ url, parsed, source: "event" });
        } catch (err) {
          console.warn("[deep-link:event:core] parse error", err);
        }
      }
    });
    unlistenFns.push(unlistenCore);
  } catch (err) {
    console.debug("[deep-link] core event listen unavailable", err);
  }

  // Handle initial deep link (app opened via URL)
  try {
    const current = await getCurrent();
    if (current && current.length > 0) {
      for (const url of current) {
        try {
          const parsed = parseDeepLink(url);
          if (!DEEP_LINK_ALLOWED_PROTOCOLS.includes(parsed.protocol as any)) continue;
          console.log("[deep-link:initial]", { url, parsed });
          cb({ url, parsed, source: "initial" });
        } catch (err) {
          console.warn("[deep-link:initial] parse error", err);
        }
      }
    }
  } catch (err) {
    // getCurrent may throw if plugin not available (e.g., in web-only env)
    console.debug("[deep-link] getCurrent unavailable", err);
  }

  return () => {
    try {
      unsubscribe?.();
    } catch {}
    unsubscribe = null;
    for (const off of unlistenFns) {
      try {
        off();
      } catch {}
    }
  };
}
