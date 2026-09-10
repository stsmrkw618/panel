import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// サーバ（Server Component / Route Handler / Server Action）用の Supabase クライアント。
// Cookie を介してセッションを引き継ぎ、RLS が効いた状態で auth.uid() を解決する。
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component から呼ばれた場合は set 不可。middleware 側で更新するため無視。
          }
        },
      },
    },
  );
}
