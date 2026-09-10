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

// 日付："2026年9月10日"
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
