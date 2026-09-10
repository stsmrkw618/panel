import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { NewSession, Session, Work } from "@/lib/types";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未認証です。");
  return { supabase, userId: user.id };
}

// ホーム用：直近の読書セッションを作品情報付きで取得
export type SessionWithWork = Session & { work: Work };

export async function getRecentSessions(
  limit = 20,
): Promise<SessionWithWork[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*, work:works(*)")
    .order("read_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SessionWithWork[];
}

// 作品詳細用：その作品のセッションを時系列（新しい順）で取得
export async function getSessionsForWork(
  workId: string,
): Promise<Session[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("work_id", workId)
    .order("read_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Session[];
}

// 「前回の続きから」用：その作品の最新セッションを1件取得
export async function getLastSessionForWork(
  workId: string,
): Promise<Session | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("work_id", workId)
    .order("read_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Session | null;
}

export async function createSession(input: NewSession): Promise<Session> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("sessions")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  const session = data as Session;

  // §6：範囲が最終巻に達したら works.status を completed に自動更新する
  await maybeCompleteWork(input.work_id, input.volume_to ?? null);

  return session;
}

// 記録済みセッションの編集（感想3項目・再読意思・巻数・source・場所・日付）
export async function updateSession(
  sessionId: string,
  patch: Partial<
    Pick<
      Session,
      | "read_at"
      | "source"
      | "place"
      | "volume_from"
      | "volume_to"
      | "revisit_intent"
      | "one_line"
      | "best_moment"
      | "recommend_to"
    >
  >,
): Promise<Session> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .update(patch)
    .eq("id", sessionId)
    .select("*")
    .single();
  if (error) throw error;
  const session = data as Session;

  // 巻数を編集した場合も §6 の自動読了を評価する
  if (patch.volume_to !== undefined) {
    await maybeCompleteWork(session.work_id, session.volume_to ?? null);
  }
  return session;
}

// 追記欄（§6）：記録フローには出さず、作品詳細からだけ書ける
export async function updateSessionNote(
  sessionId: string,
  note: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ note })
    .eq("id", sessionId);
  if (error) throw error;
}

async function maybeCompleteWork(
  workId: string,
  volumeTo: number | null,
): Promise<void> {
  if (volumeTo == null) return;
  const supabase = await createClient();
  const { data: work } = await supabase
    .from("works")
    .select("total_volumes, status")
    .eq("id", workId)
    .maybeSingle();
  if (!work?.total_volumes) return;
  if (volumeTo >= work.total_volumes && work.status !== "completed") {
    await supabase
      .from("works")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", workId);
  }
}
