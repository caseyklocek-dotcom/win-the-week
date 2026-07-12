import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // V2 renamed the Growth section to Invest (matching the Invest Your Week
    // intensive). Old links — bookmarks, the tour, anything shared — land safely.
    return [
      { source: "/growth", destination: "/invest", permanent: false },
      { source: "/growth/:path*", destination: "/invest/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
