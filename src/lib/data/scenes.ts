import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Scene = {
  id: string;
  user_id: string;
  work_id: string;
  session_id: string | null;
  storage_path: string;
  volume: number | null;
  caption: string | null;
  ocr_text: string | null;
  emotion_tags: string[] | null;
  created_at: string;
};

// 作品のシーン画像（新しい順）。画像アップロードは v2、OCR は v3。
export async function getScenesForWork(workId: string): Promise<Scene[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("work_id", workId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Scene[];
}

export type SceneWithUrl = Scene & { url: string | null };

// 表示用：各シーンに有効期限付き署名URL（TTL 60分）を付与する（§5）
export async function getScenesWithUrls(
  workId: string,
): Promise<SceneWithUrl[]> {
  const supabase = await createClient();
  const scenes = await getScenesForWork(workId);
  if (scenes.length === 0) return [];

  const paths = scenes.map((s) => s.storage_path);
  const { data, error } = await supabase.storage
    .from("scenes")
    .createSignedUrls(paths, 60 * 60);
  if (error) {
    return scenes.map((s) => ({ ...s, url: null }));
  }
  const urlByPath = new Map<string, string>();
  data?.forEach((d, i) => {
    if (d.signedUrl) urlByPath.set(paths[i], d.signedUrl);
  });
  return scenes.map((s) => ({
    ...s,
    url: urlByPath.get(s.storage_path) ?? null,
  }));
}
