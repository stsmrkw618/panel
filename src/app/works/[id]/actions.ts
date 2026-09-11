"use server";

import { revalidatePath } from "next/cache";
import { updateSession } from "@/lib/data/sessions";
import { updateWork } from "@/lib/data/works";
import type { RevisitIntent, Source } from "@/lib/types";

// 書影の差し替え：private バケットに置いたパスを works.cover_url に保存する
export async function setCoverPath(
  workId: string,
  path: string,
): Promise<void> {
  await updateWork(workId, { cover_url: path });
  revalidatePath(`/works/${workId}`);
  revalidatePath("/");
}

// 連載状態の変更：完結フラグと既刊巻数（連載中は最新巻、完結は最終巻）を保存する。
export async function setSeriesCompletion(
  workId: string,
  isComplete: boolean,
  totalVolumes: number | null,
): Promise<void> {
  await updateWork(workId, {
    is_complete: isComplete,
    total_volumes: totalVolumes,
  });
  revalidatePath(`/works/${workId}`);
  revalidatePath("/");
}

export type EditSessionInput = {
  read_at: string;
  source: Source;
  place: string | null;
  volume_from: number | null;
  volume_to: number | null;
  revisit_intent: RevisitIntent | null;
  one_line: string | null;
  best_moment: string | null;
  recommend_to: string | null;
};

// 記録済みセッションの編集を保存
export async function editSession(
  workId: string,
  sessionId: string,
  input: EditSessionInput,
): Promise<void> {
  await updateSession(sessionId, {
    read_at: input.read_at,
    source: input.source,
    place: input.place?.trim() || null,
    volume_from: input.volume_from,
    volume_to: input.volume_to,
    revisit_intent: input.revisit_intent,
    one_line: input.one_line?.trim() || null,
    best_moment: input.best_moment?.trim() || null,
    recommend_to: input.recommend_to?.trim() || null,
  });
  revalidatePath(`/works/${workId}`);
  revalidatePath("/");
}
