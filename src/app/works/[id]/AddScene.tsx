"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeToWebp } from "@/lib/image";

export default function AddScene({
  workId,
  userId,
}: {
  workId: string;
  userId: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [volume, setVolume] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    setError(null);
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setCaption("");
    setVolume("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onUpload() {
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const sceneId = crypto.randomUUID();
      const path = `${userId}/${workId}/${sceneId}.webp`;
      const blob = await resizeToWebp(file);

      const { error: upErr } = await supabase.storage
        .from("scenes")
        .upload(path, blob, { contentType: "image/webp", upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("scenes").insert({
        id: sceneId,
        user_id: userId,
        work_id: workId,
        storage_path: path,
        caption: caption.trim() || null,
        volume: volume ? Number(volume) : null,
      });
      if (insErr) throw insErr;

      reset();
      router.refresh();
    } catch {
      setError("収蔵に失敗しました。もう一度お試しください。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 border-t border-brass-deep/40 pt-3">
      {!preview ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPick}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border border-brass-deep bg-[#f3ecd9] px-3 py-2.5 text-sm font-bold text-ink"
          >
            ＋ 刺さった頁を収める
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="max-h-64 w-full border border-brass-deep object-contain"
          />
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="なぜ刺さったか（任意）"
            className="field w-full px-3 py-2 text-ink"
          />
          <input
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            inputMode="numeric"
            placeholder="巻（任意）"
            className="field w-28 px-3 py-2 text-ink"
          />
          {error && (
            <p className="text-sm text-[color:var(--color-seal)]">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={reset}
              disabled={pending}
              className="border border-brass-deep px-4 py-2 text-sm text-ink"
            >
              やめる
            </button>
            <button
              onClick={onUpload}
              disabled={pending}
              className="seal flex-1 px-4 py-2 text-sm font-bold disabled:opacity-60"
            >
              {pending ? "収蔵中…" : "収める"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
