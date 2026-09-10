import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { NewWork, Work, WorkStatus } from "@/lib/types";

// user_id は RLS + auth から解決するため、呼び出し側で渡さない。
async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未認証です。");
  return { supabase, userId: user.id };
}

// 更新日時の新しい順に作品一覧を取得
export async function getWorks(): Promise<Work[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("works")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Work[];
}

export async function getWork(id: string): Promise<Work | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("works")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Work | null;
}

// タイトル前方一致で既登録作品をサジェスト（記録フローの作品特定用）
export async function searchWorks(query: string): Promise<Work[]> {
  const q = query.trim();
  if (!q) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("works")
    .select("*")
    .ilike("title", `%${q}%`)
    .order("updated_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data as Work[];
}

export async function findWorkByIsbn(isbn: string): Promise<Work | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("works")
    .select("*")
    .eq("isbn", isbn)
    .maybeSingle();
  if (error) throw error;
  return data as Work | null;
}

export async function createWork(input: NewWork): Promise<Work> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("works")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as Work;
}

export async function updateWork(
  id: string,
  patch: Partial<NewWork>,
): Promise<Work> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("works")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Work;
}

export async function setWorkStatus(
  id: string,
  status: WorkStatus,
): Promise<void> {
  await updateWork(id, { status });
}
