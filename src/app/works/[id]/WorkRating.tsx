"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StarRating from "@/components/StarRating";
import { setWorkRating } from "./actions";

// 作品詳細の評価。星をタップした瞬間に保存する（保存ボタンは置かない）。
export default function WorkRating({
  workId,
  rating,
}: {
  workId: string;
  rating: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(rating);
  const [pending, setPending] = useState(false);

  async function change(v: number | null) {
    const prev = value;
    setValue(v);
    setPending(true);
    try {
      await setWorkRating(workId, v);
      router.refresh();
    } catch {
      setValue(prev);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3">
      <StarRating value={value} onChange={change} disabled={pending} />
    </div>
  );
}
