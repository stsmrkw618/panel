"use client";

import { useEffect } from "react";

// サービスワーカーを登録する（本番のみ）。
export default function ServiceWorker() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 登録失敗は致命的ではないので握りつぶす
      });
    }
  }, []);
  return null;
}
