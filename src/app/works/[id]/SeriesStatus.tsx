"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSeriesCompletion } from "./actions";

// 連載状態の表示・変更。total_volumes が入っていれば「完結」、null なら「連載中」。
// 連載中の作品は巻数が随時変わるため、数は完結時のみ持つ（§4 の total_volumes 運用）。
export default function SeriesStatus({
  workId,
  totalVolumes,
}: {
  workId: string;
  totalVolumes: number | null;
}) {
  const router = useRouter();
  const isComplete = totalVolumes != null;
  const [editing, setEditing] = useState(false);
  const [finalVolume, setFinalVolume] = useState(
    totalVolumes != null ? String(totalVolumes) : "",
  );
  const [pending, setPending] = useState(false);

  async function save(volume: number | null) {
    setPending(true);
    try {
      await setSeriesCompletion(workId, volume);
      setEditing(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-3 flex items-center gap-2">
        <span className="font-sans text-[0.7rem] tracking-wide text-muted-dark">
          {isComplete
            ? `完結・全${totalVolumes}巻`
            : "連載中"}
        </span>
        <button
          onClick={() => {
            setFinalVolume(totalVolumes != null ? String(totalVolumes) : "");
            setEditing(true);
          }}
          className="border border-brass-deep px-2 py-0.5 text-[0.7rem] text-ink-soft transition-colors hover:bg-[#f3ecd9]"
        >
          変える
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => save(null)}
          disabled={pending}
          className="chip flex-1 px-2 py-2 text-xs disabled:opacity-60"
          data-on={!isComplete}
        >
          連載中に戻す
        </button>
        <input
          value={finalVolume}
          onChange={(e) => setFinalVolume(e.target.value)}
          inputMode="numeric"
          placeholder="最終巻"
          className="field w-24 px-3 py-2 text-ink"
        />
        <button
          onClick={() => save(finalVolume ? Number(finalVolume) : null)}
          disabled={pending}
          className="seal px-3 py-2 text-xs font-bold disabled:opacity-60"
        >
          完結に
        </button>
      </div>
      <button
        onClick={() => setEditing(false)}
        className="self-start text-[0.7rem] text-ink-soft underline-offset-2 hover:underline"
      >
        やめる
      </button>
    </div>
  );
}
