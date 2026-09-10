"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeToWebp } from "@/lib/image";
import { setCoverPath } from "./actions";

// 書影の追加・差し替え。private バケットへ置き、works.cover_url にパスを保存する。
export default function CoverUpload({
  workId,
  userId,
  hasCover,
}: {
  workId: string;
  userId: string;
  hasCover: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      // 書影はパス固定（cover.webp）。差し替えは upsert で上書き。
      const path = `${userId}/${workId}/cover.webp`;
      const blob = await resizeToWebp(file, 1200, 0.85);
      const { error: upErr } = await supabase.storage
        .from("scenes")
        .upload(path, blob, { contentType: "image/webp", upsert: true });
      if (upErr) throw upErr;
      await setCoverPath(workId, path);
      router.refresh();
    } catch {
      setError("書影の登録に失敗しました。");
    } finally {
      setPending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={pending}
        className="mt-2 border border-brass-deep bg-[#f3ecd9] px-2.5 py-1 text-xs text-ink disabled:opacity-60"
      >
        {pending ? "登録中…" : hasCover ? "書影を変える" : "書影を選ぶ"}
      </button>
      {error && (
        <p className="mt-1 text-xs text-[color:var(--color-seal)]">{error}</p>
      )}
    </>
  );
}
