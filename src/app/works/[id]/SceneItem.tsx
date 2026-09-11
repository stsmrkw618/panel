"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 収蔵済みのシーン画像1枚。閲覧と、栞を外す（削除）操作を担う。
export default function SceneItem({
  id,
  storagePath,
  url,
  caption,
}: {
  id: string;
  storagePath: string;
  url: string | null;
  caption: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm("この頁を書庫から外しますか？")) return;
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      // 先に実体を消し、続けて記録行を消す（どちらも本人限定のRLS下）
      const { error: rmErr } = await supabase.storage
        .from("scenes")
        .remove([storagePath]);
      if (rmErr) throw rmErr;

      const { error: delErr } = await supabase
        .from("scenes")
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;

      router.refresh();
    } catch {
      setError("外せませんでした。もう一度お試しください。");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="group relative aspect-[3/4] overflow-hidden border border-brass-deep bg-[#f3ecd9]">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={caption ?? ""}
            className="h-full w-full object-cover"
          />
        )}
        <button
          onClick={onDelete}
          disabled={pending}
          aria-label="この頁を外す"
          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center border border-brass-deep bg-vault/80 text-sm text-parchment opacity-0 transition-opacity hover:bg-[color:var(--color-seal)] focus:opacity-100 group-hover:opacity-100 disabled:opacity-60"
        >
          {pending ? "…" : "×"}
        </button>
      </div>
      {caption && (
        <p className="text-[0.7rem] leading-snug text-ink-soft">{caption}</p>
      )}
      {error && (
        <p className="text-[0.7rem] text-[color:var(--color-seal)]">{error}</p>
      )}
    </div>
  );
}
