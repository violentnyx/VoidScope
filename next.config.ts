import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/Casamento-Wishlist",
        destination: "/Casamento-Wishlist/index.html",
      },
      {
        source: "/Casamento-Wishlist/admin",
        destination: "/Casamento-Wishlist/admin.html",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/admin.html",
        destination: "/Casamento-Wishlist/admin",
        permanent: true,
      },
      {
        source: "/Casamento-Wishlist/admin.html",
        destination: "/Casamento-Wishlist/admin",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
