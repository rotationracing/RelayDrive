// Use environment-configured protocol in dev; fall back to 'relaydrive' in prod
export const DEEP_LINK_PROTOCOL =
  (process.env.NEXT_PUBLIC_DEEP_LINK_PROTOCOL || "relaydrive") as
    | "relaydrive"
    | "relaydrive-dev";

// In dev we want to accept both schemes so you can test either
export const DEEP_LINK_ALLOWED_PROTOCOLS = [
  "relaydrive",
  "relaydrive-dev",
] as const;

export const DeepLinkEvents = {
  OpenUrl: "deep-link://open-url",
} as const;
