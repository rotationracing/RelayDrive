import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Make Next output static assets to `out/` so Tauri can bundle them.
  // This makes `next build` produce an `out` folder suitable for
  // a static distribution that Tauri can load as frontendDist.
  output: "export",
  images: {
    // Required for static export when using next/image
    unoptimized: true,
  },
};

export default nextConfig;
