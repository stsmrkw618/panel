import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWork } from "@/lib/data/works";
import { getSessionsForWork } from "@/lib/data/sessions";
import { getScenesWithUrls } from "@/lib/data/scenes";
import { WORK_STATUS_LABELS } from "@/lib/types";
import SessionCard from "./SessionCard";
import AddScene from "./AddScene";
import SceneItem from "./SceneItem";
import CoverUpload from "./CoverUpload";
import SeriesStatus from "./SeriesStatus";

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const work = await getWork(id);
  if (!work) notFound();

  const [sessions, scenes] = await Promise.all([
    getSessionsForWork(id),
    getScenesWithUrls(id),
  ]);

  // 書影の表示URLを解決：外部URLはそのまま、アップロード分は署名URL（TTL60分）
  let coverUrl: string | null = null;
  if (work.cover_url) {
    if (/^https?:\/\//.test(work.cover_url)) {
      coverUrl = work.cover_url;
    } else {
      const { data } = await supabase.storage
        .from("scenes")
        .createSignedUrl(work.cover_url, 60 * 60);
      coverUrl = data?.signedUrl ?? null;
    }
  }

  return (
    <main className="flex-1 px-4 pb-16 pt-6 sm:px-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link
          href="/"
          className="text-xs text-parchment/70 underline-offset-2 hover:underline"
        >
          ← 書庫へ戻る
        </Link>

        {/* 書物の扉（ヘッダ） */}
        <section className="tome rise-in flex gap-5 p-6">
          <div className="shrink-0">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt={work.title}
                className="h-[148px] w-[104px] border border-brass-deep object-cover shadow-md"
              />
            ) : (
              <div className="flex h-[148px] w-[104px] items-center justify-center border border-brass-deep bg-[#f3ecd9] text-xs text-ink-soft">
                書影なし
              </div>
            )}
            <CoverUpload
              workId={work.id}
              userId={user.id}
              hasCover={Boolean(coverUrl)}
            />
          </div>
          <div>
            <p className="eyebrow">Volume</p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight text-ink">
              {work.title}
            </h1>
            {work.author && (
              <p className="mt-1 text-sm text-ink-soft">{work.author}</p>
            )}
            <p className="mt-3 font-sans text-[0.7rem] tracking-wide text-muted-dark">
              {[WORK_STATUS_LABELS[work.status], work.publisher]
                .filter(Boolean)
                .join(" ・ ")}
            </p>
            <SeriesStatus
              workId={work.id}
              totalVolumes={work.total_volumes}
            />
          </div>
        </section>

        {/* 名シーン（画像収蔵。OCR は v3） */}
        <section className="tome rise-in p-6">
          <p className="eyebrow">刺さった頁</p>
          {scenes.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              まだ栞は挟まれていない。
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {scenes.map((sc) => (
                <SceneItem
                  key={sc.id}
                  id={sc.id}
                  storagePath={sc.storage_path}
                  url={sc.url}
                  caption={sc.caption}
                />
              ))}
            </div>
          )}
          <AddScene workId={work.id} userId={user.id} />
        </section>

        {/* 読書の記録 */}
        <section className="flex flex-col gap-3">
          <p className="eyebrow eyebrow-bright px-1">読みし日々</p>
          {sessions.map((s) => (
            <SessionCard key={s.id} workId={work.id} session={s} />
          ))}
        </section>
      </div>
    </main>
  );
}
