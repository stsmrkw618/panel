import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecentSessions, getReachedByWork } from "@/lib/data/sessions";
import { SOURCE_LABELS } from "@/lib/types";
import { formatDate, sessionVolumeLabel, seriesProgress } from "@/lib/format";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sessions = await getRecentSessions(30);

  // 作品ごとの到達巻（追いつき判定用）
  const workIds = Array.from(new Set(sessions.map((s) => s.work_id)));
  const reachedByWork = await getReachedByWork(workIds);

  // 書影URLの解決：外部URLはそのまま、アップロード分（storageパス）はまとめて署名URL化
  const coverByWork = new Map<string, string>();
  const storagePaths = Array.from(
    new Set(
      sessions
        .map((s) => s.work?.cover_url)
        .filter(
          (c): c is string => !!c && !/^https?:\/\//.test(c),
        ),
    ),
  );
  if (storagePaths.length > 0) {
    const { data } = await supabase.storage
      .from("scenes")
      .createSignedUrls(storagePaths, 60 * 60);
    data?.forEach((d, i) => {
      if (d.signedUrl) coverByWork.set(storagePaths[i], d.signedUrl);
    });
  }
  const coverUrlOf = (cover: string | null | undefined): string | null => {
    if (!cover) return null;
    if (/^https?:\/\//.test(cover)) return cover;
    return coverByWork.get(cover) ?? null;
  };

  return (
    <main className="flex-1 px-4 pb-28 pt-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* 書庫の入口（マストヘッド） */}
        <header className="rise-in">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow eyebrow-bright">The Secret Archive</p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-brass">
                PANEL
              </h1>
              <p className="mt-1 text-sm text-muted">
                秘密の書庫 · {user.email}
              </p>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="border border-brass-dim px-3 py-1 text-xs text-parchment/80 transition-colors hover:text-brass"
              >
                閉じる
              </button>
            </form>
          </div>
          <hr className="rule-brass mt-5" />
          <p className="eyebrow mt-5 eyebrow-bright">近ごろ紐解いた頁</p>
        </header>

        {/* 蔵書（読書セッション） */}
        {sessions.length === 0 ? (
          <section className="tome rise-in mt-4 px-6 py-12 text-center">
            <p className="text-lg text-ink">まだ、書庫は静かだ。</p>
            <p className="mt-1 text-sm text-ink-soft">
              読んだ本を1冊、ここに納めてみる。
            </p>
            <Link
              href="/log/new"
              className="seal mt-6 inline-block px-6 py-3 text-sm font-bold"
            >
              最初の1冊を記す
            </Link>
          </section>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {sessions.map((s, i) => {
              const cover = coverUrlOf(s.work?.cover_url);
              const prog = s.work
                ? seriesProgress(
                    s.work.is_complete,
                    s.work.total_volumes,
                    reachedByWork.get(s.work_id) ?? 0,
                  )
                : null;
              return (
                <Link
                  key={s.id}
                  href={`/works/${s.work_id}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                  className="tome rise-in flex gap-4 p-5"
                >
                  {/* 背表紙のように書影を添える */}
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt=""
                      className="h-24 w-16 shrink-0 border border-brass-deep object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-24 w-16 shrink-0 items-center justify-center border border-brass-deep bg-parchment-2 text-[0.6rem] text-muted-dark">
                      書影なし
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <p className="truncate text-lg font-bold leading-snug text-ink">
                        {s.work?.title ?? "（不明な書）"}
                      </p>
                      {prog && (
                        <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="border border-brass-deep px-1.5 py-0.5 font-sans text-[0.65rem] tracking-wide text-ink-soft">
                            {prog.status}
                          </span>
                          {prog.detail && (
                            <span
                              className={`font-sans text-[0.65rem] tracking-wide ${
                                prog.caughtUp ? "text-brass" : "text-muted-dark"
                              }`}
                            >
                              {prog.detail}
                            </span>
                          )}
                        </p>
                      )}
                      {s.one_line && (
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                          {s.one_line}
                        </p>
                      )}
                    </div>
                    <p className="mt-3 font-sans text-[0.7rem] tracking-wide text-muted-dark">
                      {[
                        sessionVolumeLabel(s),
                        SOURCE_LABELS[s.source],
                        s.place,
                        formatDate(s.read_at),
                      ]
                        .filter(Boolean)
                        .join(" ・ ")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 封蝋の印（記録FAB）。書庫にそっと栞を挟むように。 */}
      <Link
        href="/log/new"
        aria-label="記録する"
        className="seal fixed bottom-6 right-6 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
      >
        記
      </Link>
    </main>
  );
}
