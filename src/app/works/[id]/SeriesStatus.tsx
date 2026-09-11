"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { seriesProgress } from "@/lib/format";
import { setSeriesCompletion } from "./actions";

// 連載状態・既刊巻数の表示と変更、および到達巻（reached）から見た追いつき具合。
export default function SeriesStatus({
  workId,
  isComplete,
  totalVolumes,
  reached,
}: {
  workId: string;
  isComplete: boolean;
  totalVolumes: number | null;
  reached: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [complete, setComplete] = useState(isComplete);
  const [total, setTotal] = useState(
    totalVolumes != null ? String(totalVolumes) : "",
  );
  const [pending, setPending] = useState(false);

  const { status, detail, caughtUp } = seriesProgress(
    isComplete,
    totalVolumes,
    reached,
  );

  async function save() {
    setPending(true);
    try {
      await setSeriesCompletion(workId, complete, total ? Number(total) : null);
      setEditing(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="border border-brass-deep px-2 py-0.5 font-sans text-[0.7rem] tracking-wide text-ink-soft">
          {status}
        </span>
        {detail && (
          <span
            className={`font-sans text-[0.7rem] tracking-wide ${
              caughtUp ? "text-brass" : "text-muted-dark"
            }`}
          >
            {detail}
          </span>
        )}
        <button
          onClick={() => {
            setComplete(isComplete);
            setTotal(totalVolumes != null ? String(totalVolumes) : "");
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
          onClick={() => setComplete(false)}
          data-on={!complete}
          className="chip flex-1 px-2 py-2 text-xs"
        >
          連載中
        </button>
        <button
          onClick={() => setComplete(true)}
          data-on={complete}
          className="chip flex-1 px-2 py-2 text-xs"
        >
          完結
        </button>
        <input
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          inputMode="numeric"
          placeholder={complete ? "最終巻" : "既刊"}
          className="field w-24 px-3 py-2 text-ink"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setEditing(false)}
          className="border border-brass-deep px-3 py-1.5 text-xs text-ink transition-colors hover:bg-[#f3ecd9]"
        >
          やめる
        </button>
        <button
          onClick={save}
          disabled={pending}
          className="seal flex-1 px-3 py-1.5 text-xs font-bold disabled:opacity-60"
        >
          {pending ? "改めています…" : "改める"}
        </button>
      </div>
    </div>
  );
}
