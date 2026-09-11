import type { Session } from "@/lib/types";

// 巻数の表示："3巻" / "1〜5巻" / ""（不明）
export function volumeLabel(
  from: number | null,
  to: number | null,
): string {
  if (from == null && to == null) return "";
  if (from != null && to != null) {
    return from === to ? `${from}巻` : `${from}〜${to}巻`;
  }
  const v = from ?? to;
  return v != null ? `${v}巻` : "";
}

export function sessionVolumeLabel(s: Session): string {
  return volumeLabel(s.volume_from, s.volume_to);
}

// 連載状態＋読了進捗のラベル化。
//   status  … 「完結」/「連載中」
//   detail  … 「全12巻・読破」「既刊8巻・5巻まで」など（巻数不明なら null）
//   caughtUp… 既刊/最終巻まで追いついているか
export function seriesProgress(
  isComplete: boolean,
  total: number | null,
  reached: number,
): { status: string; detail: string | null; caughtUp: boolean } {
  const status = isComplete ? "完結" : "連載中";
  if (total == null) {
    return {
      status,
      detail: reached > 0 ? `${reached}巻まで` : null,
      caughtUp: false,
    };
  }
  const unit = isComplete ? `全${total}巻` : `既刊${total}巻`;
  if (reached >= total) {
    return {
      status,
      detail: isComplete ? `${unit}・読破` : `${unit}・最新まで`,
      caughtUp: true,
    };
  }
  return { status, detail: `${unit}・${reached}巻まで`, caughtUp: false };
}

// 日付："2026年9月10日"
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
