import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "product-images.tcgplayer.com", pathname: "/**" },
      { protocol: "https", hostname: "tcgplayer-cdn.tcgplayer.com", pathname: "/**" },
      { protocol: "https", hostname: "images.tcgplayer.com", pathname: "/**" },
      { protocol: "https", hostname: "s3.tcgplayer.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
