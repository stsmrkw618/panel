import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data, error } = await supabase.storage.listBuckets();
if (error) {
  console.log("✗ バケット取得失敗:", error.message);
  process.exit(1);
}
const scenes = data.find((b) => b.id === "scenes");
if (!scenes) {
  console.log("✗ 'scenes' バケットが見つかりません。存在:", data.map((b) => b.id));
  process.exit(1);
}
console.log(`✓ 'scenes' バケット存在 (public=${scenes.public})`);
console.log(scenes.public ? "⚠ publicになっています（private推奨）" : "✓ private です");
