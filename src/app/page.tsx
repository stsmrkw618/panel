import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecentSessions, getReachedByWork } from "@/lib/data/sessions";
import { SOURCE_LABELS } from "@/lib/types";
import { formatDate, sessionVolumeLabel, seriesProgress } from "@/lib/format";
import SeriesBadge from "@/components/SeriesBadge";
import StarRating from "@/components/StarRating";
import Bookshelf from "./Bookshelf";

// 書庫の並べ方
const SORTS = {
  recent: "最近読んだ順",
  rating: "評価の高い順",
  title: "書名順",
} as const;
type SortKey = keyof typeof SORTS;

// 書庫の見せ方：書棚（書影を棚に並べる）／目録（感想つきの一覧）
const VIEWS = {
  shelf: "書棚",
  list: "目録",
} as const;
type ViewKey = keyof typeof VIEWS;

function homeHref(sort: SortKey, view: ViewKey): string {
  const q = new URLSearchParams();
  if (sort !== "recent") q.set("sort", sort);
  if (view !== "shelf") q.set("view", view);
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; view?: string }>;
}) {
  const { sort: sortParam, view: viewParam } = await searchParams;
  const sort: SortKey =
    sortParam && sortParam in SORTS ? (sortParam as SortKey) : "recent";
  const view: ViewKey =
    viewParam && viewParam in VIEWS ? (viewParam as ViewKey) : "shelf";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1作品1枚：作品ごとに最も新しく読んだセッションを代表として並べる
  const allSessions = await getRecentSessions(500);
  const seen = new Set<string>();
  const sessions = allSessions.filter((s) => {
    if (seen.has(s.work_id)) return false;
    seen.add(s.work_id);
    return true;
  });
  // getRecentSessions は読んだ日の新しい順。安定ソートなので同点は新しい順のまま残る
  if (sort === "rating") {
    sessions.sort(
      (a, b) => (b.work?.rating ?? 0) - (a.work?.rating ?? 0),
    );
  } else if (sort === "title") {
    sessions.sort((a, b) =>
      (a.work?.title_kana || a.work?.title || "").localeCompare(
        b.work?.title_kana || b.work?.title || "",
        "ja",
      ),
    );
  }

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
      <div
        className={`mx-auto ${view === "shelf" ? "max-w-5xl" : "max-w-2xl"}`}
      >
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
          <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
            {sessions.length > 0 ? (
              // 見せ方の切り替え（書棚／目録）
              <nav aria-label="表示の切り替え" className="flex">
                {(Object.keys(VIEWS) as ViewKey[]).map((v) => (
                  <Link
                    key={v}
                    href={homeHref(sort, v)}
                    aria-current={view === v ? "page" : undefined}
                    className={`flex items-center gap-1.5 border-b px-3 pb-1.5 text-sm tracking-wider transition-colors ${
                      view === v
                        ? "border-brass text-brass"
                        : "border-brass-deep/50 text-muted hover:text-parchment"
                    }`}
                  >
                    <ViewIcon view={v} />
                    {VIEWS[v]}
                  </Link>
                ))}
              </nav>
            ) : (
              <p className="eyebrow eyebrow-bright">近ごろ紐解いた頁</p>
            )}
            {sessions.length > 1 && (
              <nav aria-label="並び替え" className="flex gap-1">
                {(Object.keys(SORTS) as SortKey[]).map((k) => (
                  <Link
                    key={k}
                    href={homeHref(k, view)}
                    aria-current={sort === k ? "true" : undefined}
                    className={`border px-2 py-1 font-sans text-[0.68rem] tracking-wide transition-colors ${
                      sort === k
                        ? "border-brass bg-brass/15 text-brass"
                        : "border-brass-deep text-muted hover:text-parchment"
                    }`}
                  >
                    {SORTS[k]}
                  </Link>
                ))}
              </nav>
            )}
          </div>
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
        ) : view === "shelf" ? (
          <Bookshelf
            books={sessions.map((s) => ({
              workId: s.work_id,
              title: s.work?.title ?? "（不明な書）",
              cover: coverUrlOf(s.work?.cover_url),
              rating: s.work?.rating ?? null,
              isComplete: s.work?.is_complete ?? false,
            }))}
          />
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
                      {s.work?.rating != null && (
                        <p className="mt-1">
                          <StarRating value={s.work.rating} size="sm" />
                        </p>
                      )}
                      {prog && s.work && (
                        <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <SeriesBadge isComplete={s.work.is_complete} />
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
        className="seal fixed bottom-6 right-6 flex h-16 w-16 items-center justify-center rounded-full"
      >
        {/* 羽ペン */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z" />
          <path d="M16 8 2 22" />
          <path d="M17.5 15H9" />
        </svg>
      </Link>
    </main>
  );
}

// 切り替えの小さな印：書棚は棚に立つ本、目録は罫の並び
function ViewIcon({ view }: { view: ViewKey }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden
    >
      {view === "shelf" ? (
        <>
          <rect x="2" y="3" width="3" height="9" />
          <rect x="6.5" y="2" width="3" height="10" />
          <path d="M11 4.2l2.6-.7 2 8.3-2.6.7z" transform="translate(-1.6 0)" />
          <path d="M1 14h14" />
        </>
      ) : (
        <path d="M2 3.5h12M2 8h12M2 12.5h12" />
      )}
    </svg>
  );
}
