import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// .env.local を素朴に読む
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

const tables = ["works", "sessions", "scenes", "recalls"];
let ok = true;
for (const t of tables) {
  const { error, count } = await supabase
    .from(t)
    .select("*", { count: "exact", head: true });
  if (error) {
    ok = false;
    console.log(`✗ ${t}: ${error.message}`);
  } else {
    console.log(`✓ ${t}: OK (rows=${count})`);
  }
}
console.log(ok ? "\n=== 全テーブル到達OK ===" : "\n=== 未達のテーブルあり ===");
process.exit(ok ? 0 : 1);
