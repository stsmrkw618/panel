"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 本人1名専用。サインアップUIは持たず、ダッシュボードで作成した1ユーザーで入る。
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError("鍵が合いません。もう一度。");
      setPending(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="tome rise-in w-full max-w-sm p-8"
      >
        <p className="eyebrow">The Secret Archive</p>
        <h1 className="mt-2 text-5xl font-extrabold tracking-tight text-ink">
          PANEL
        </h1>
        <p className="mt-1 text-sm text-ink-soft">秘密の書庫</p>

        <hr className="rule-brass my-6" />

        <label className="block text-sm text-ink-soft">
          しるべ（メール）
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field mt-1 w-full px-3 py-2 text-ink"
          />
        </label>

        <label className="mt-4 block text-sm text-ink-soft">
          あいことば（パスワード）
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field mt-1 w-full px-3 py-2 text-ink"
          />
        </label>

        {error && <p className="mt-4 text-sm text-[color:var(--color-seal)]">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="seal mt-7 w-full py-3 text-base font-bold tracking-wide disabled:opacity-60"
        >
          {pending ? "解錠中…" : "書庫を開く"}
        </button>
      </form>
    </main>
  );
}
