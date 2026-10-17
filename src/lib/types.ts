// PANEL ドメイン型（CLAUDE.md §4 に対応）

export type WorkStatus = "reading" | "completed" | "paused" | "want_to_read";

export type Source =
  | "owned" // 所有
  | "rental" // レンタル
  | "cafe" // マンガ喫茶
  | "ebook" // 電子
  | "borrowed" // 借りた
  | "store"; // 立ち読み

export type RevisitIntent =
  | "buy" // また買ってでも読む
  | "reread" // また読みたい
  | "finished" // 読み切って満足（肯定的な完了）
  | "not_for_me"; // 合わなかった

export type Work = {
  id: string;
  user_id: string;
  title: string;
  title_kana: string | null;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
  cover_url: string | null;
  total_volumes: number | null; // 既刊巻数（連載中は最新巻、完結は最終巻）
  is_complete: boolean; // 連載が完結しているか
  rating: number | null; // 評価 ★1〜5（未評価は null）
  status: WorkStatus;
  created_at: string;
  updated_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  work_id: string;
  read_at: string; // date (YYYY-MM-DD)
  volume_from: number | null;
  volume_to: number | null;
  source: Source;
  place: string | null;
  revisit_intent: RevisitIntent | null;
  one_line: string | null;
  best_moment: string | null;
  recommend_to: string | null;
  note: string | null;
  created_at: string;
};

// 作成・更新の入力型（user_id はサーバ側で auth から補完）
export type NewWork = {
  title: string;
  title_kana?: string | null;
  author?: string | null;
  publisher?: string | null;
  isbn?: string | null;
  cover_url?: string | null;
  total_volumes?: number | null;
  is_complete?: boolean;
  rating?: number | null;
  status?: WorkStatus;
};

export type NewSession = {
  work_id: string;
  read_at?: string;
  volume_from?: number | null;
  volume_to?: number | null;
  source: Source;
  place?: string | null;
  revisit_intent?: RevisitIntent | null;
  one_line?: string | null;
  best_moment?: string | null;
  recommend_to?: string | null;
};

// 表示用ラベル
export const SOURCE_LABELS: Record<Source, string> = {
  owned: "所有",
  rental: "レンタル",
  cafe: "マンガ喫茶",
  ebook: "電子",
  borrowed: "借りた",
  store: "立ち読み",
};

export const REVISIT_INTENT_LABELS: Record<RevisitIntent, string> = {
  buy: "また買ってでも読む",
  reread: "また読みたい",
  finished: "読み切って満足",
  not_for_me: "合わなかった",
};

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  reading: "読書中",
  completed: "読了",
  paused: "中断",
  want_to_read: "積読",
};

// source ごとの巻数入力の既定（§6：所有/立ち読みは単巻、他は範囲）
export const SINGLE_VOLUME_SOURCES: Source[] = ["owned", "store"];
