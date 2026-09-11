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

// 連載状態の変更：完結なら最終巻(finalVolume)を保持、連載中なら null に戻す。
// total_volumes が「完結かどうか」を兼ねる（連載中は都度変わるので数を持たない）。
export async function setSeriesCompletion(
  workId: string,
  finalVolume: number | null,
): Promise<void> {
  await updateWork(workId, { total_volumes: finalVolume });
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
