import { createBrowserClient } from "@supabase/ssr";

// ブラウザ（Client Component）用の Supabase クライアント。
// anon key のみを使用し、アクセス制御は RLS に委ねる。
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
