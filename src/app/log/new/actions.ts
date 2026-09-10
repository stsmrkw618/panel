"use server";

import { revalidatePath } from "next/cache";
import { createWork } from "@/lib/data/works";
import {
  createSession,
  getLastSessionForWork,
} from "@/lib/data/sessions";
import {
  fetchByIsbn,
  searchExternal,
  type Biblio,
} from "@/lib/bibliography";
import type { RevisitIntent, Source } from "@/lib/types";

export type CreateLogInput = {
  // 既存作品を選んだ場合は workId、新規なら newWork
  workId?: string;
  newWork?: {
    title: string;
    title_kana?: string | null;
    author?: string | null;
    publisher?: string | null;
    isbn?: string | null;
    cover_url?: string | null;
    total_volumes?: number | null;
  };
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

export type CreateLogResult = {
  workId: string;
  sessionId: string;
  // 一気読み（5巻以上の範囲）検出 → シーン登録導線のフラグ（§6）
  isBinge: boolean;
};

export async function createLog(
  input: CreateLogInput,
): Promise<CreateLogResult> {
  // 1. 作品を確定する
  let workId = input.workId;
  if (!workId) {
    if (!input.newWork?.title?.trim()) {
      throw new Error("作品名が必要です。");
    }
    const work = await createWork({
      title: input.newWork.title.trim(),
      title_kana: input.newWork.title_kana ?? null,
      author: input.newWork.author?.trim() || null,
      publisher: input.newWork.publisher ?? null,
      isbn: input.newWork.isbn ?? null,
      cover_url: input.newWork.cover_url ?? null,
      total_volumes: input.newWork.total_volumes ?? null,
    });
    workId = work.id;
  }

  // 2. セッションを保存（status 自動読了は createSession 内で処理）
  const session = await createSession({
    work_id: workId,
    read_at: input.read_at,
    volume_from: input.volume_from ?? null,
    volume_to: input.volume_to ?? null,
    source: input.source,
    place: input.place?.trim() || null,
    revisit_intent: input.revisit_intent ?? null,
    one_line: input.one_line?.trim() || null,
    best_moment: input.best_moment?.trim() || null,
    recommend_to: input.recommend_to?.trim() || null,
  });

  // 一気読み判定：範囲が5巻以上
  const from = input.volume_from ?? null;
  const to = input.volume_to ?? null;
  const isBinge = from != null && to != null && to - from + 1 >= 5;

  revalidatePath("/");
  revalidatePath(`/works/${workId}`);

  return { workId, sessionId: session.id, isBinge };
}

// 「前回の続きから」用：選んだ既存作品の最新到達巻を返す
export async function getContinueFrom(
  workId: string,
): Promise<number | null> {
  const last = await getLastSessionForWork(workId);
  if (!last) return null;
  return last.volume_to ?? last.volume_from ?? null;
}

// 書誌の外部検索（タイトル）
export async function searchBiblioByTitle(query: string): Promise<Biblio[]> {
  return searchExternal(query);
}

// 書誌の外部取得（ISBN）
export async function lookupBiblioByIsbn(
  isbn: string,
): Promise<Biblio | null> {
  return fetchByIsbn(isbn);
}
