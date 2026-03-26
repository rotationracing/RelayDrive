import { DEEP_LINK_PROTOCOL } from "@/config/constants";

export type ParsedDeepLink = {
  protocol: string;
  path: string; // without leading slash
  query: Record<string, string>;
  raw: string;
};

export function parseDeepLink(url: string): ParsedDeepLink {
  try {
    // Normalize URL: ensure it has two slashes after the scheme.
    const normalized = url.replace(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/?/, "$1://");
    const u = new URL(normalized);

    // Remove leading slash from pathname
    let path = u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
    // Some OSes/launchers provide URLs like scheme://callback/?test where 'callback' is parsed as hostname
    // If path is empty but we have a hostname, treat hostname as the path segment
    if (!path && u.hostname) {
      path = u.hostname;
    }

    const query: Record<string, string> = {};
    u.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    return {
      protocol: u.protocol.replace(":", ""),
      path,
      query,
      raw: url,
    };
  } catch (e) {
    // Fallback: best-effort parse
    const [, proto, rest] = url.match(/^([^:]+):\/?\/?(.*)$/) || [];
    const [p, q] = (rest || "").split("?");
    const query: Record<string, string> = {};
    if (q) {
      for (const pair of q.split("&")) {
        const [k, v] = pair.split("=");
        if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || "");
      }
    }
    return {
      protocol: proto || DEEP_LINK_PROTOCOL,
      path: p || "",
      query,
      raw: url,
    };
  }
}
