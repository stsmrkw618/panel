import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorks } from "@/lib/data/works";
import LogForm from "./LogForm";

// 記録フロー（最重要画面）。30秒で終わらせる。
export default async function NewLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 既登録作品を優先サジェストするため一覧を渡す（本人1名なので件数は小さい）
  const works = await getWorks();

  return <LogForm works={works} />;
}
