import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Supabase Storage の署名URL経由の画像を next/image で扱えるように（§5）
    remotePatterns: [
      {
        protocol: "https",
        hostname: "aerddxpytogfyixryags.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      // 書影：openBD
      { protocol: "https", hostname: "cover.openbd.jp" },
      // 書影：Google Books
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
