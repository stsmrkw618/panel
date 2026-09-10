// PANEL 最小サービスワーカー。
// 目的はインストール可能性（PWA要件）とオフライン時の素朴なフォールバック。
// 認証必須の動的アプリのため、積極的なプリキャッシュはしない。
const CACHE = "panel-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // 同一オリジンのみ扱う（Supabase等の外部は素通し）
  if (url.origin !== self.location.origin) return;

  // ネットワーク優先。成功したら静的アセットのみキャッシュ、失敗時はキャッシュへ。
  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/icons/")) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        throw new Error("offline and not cached");
      }
    })(),
  );
});
