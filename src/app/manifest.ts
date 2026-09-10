import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PANEL",
    short_name: "PANEL",
    description: "読んだマンガを、後から思い出せるようにする。",
    // ホーム画面から1タップで記録画面に入れること（§3）
    start_url: "/log/new",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#16110B", // vault（書庫の闇）
    theme_color: "#16110B",
    lang: "ja",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
