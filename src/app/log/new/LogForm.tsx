"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  REVISIT_INTENT_LABELS,
  SINGLE_VOLUME_SOURCES,
  SOURCE_LABELS,
  type RevisitIntent,
  type Source,
  type Work,
} from "@/lib/types";
import {
  createLog,
  getContinueFrom,
  searchBiblioByTitle,
  lookupBiblioByIsbn,
} from "./actions";
import type { Biblio } from "@/lib/bibliography";

// カメラを使うのでクライアント専用で遅延読込
const BarcodeScanner = dynamic(() => import("./BarcodeScanner"), {
  ssr: false,
});

const SOURCE_ICONS: Record<Source, string> = {
  owned: "📚",
  rental: "🔖",
  cafe: "☕",
  ebook: "📱",
  borrowed: "🤝",
  store: "🏬",
};

const SOURCE_ORDER: Source[] = [
  "cafe",
  "owned",
  "ebook",
  "rental",
  "borrowed",
  "store",
];

const REVISIT_ORDER: RevisitIntent[] = [
  "buy",
  "reread",
  "finished",
  "not_for_me",
];

const STEP_TITLES = ["何を紐解いた？", "どこで、幾巻を", "余韻を綴じる"];

function todayStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function LogForm({ works }: { works: Work[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [query, setQuery] = useState("");
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newTotal, setNewTotal] = useState("");
  const [continueFrom, setContinueFrom] = useState<number | null>(null);

  // 外部書誌検索
  const [externalResults, setExternalResults] = useState<Biblio[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [biblio, setBiblio] = useState<Biblio | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [readAt, setReadAt] = useState(todayStr());
  const [source, setSource] = useState<Source | null>(null);
  const [place, setPlace] = useState("");
  const [volFrom, setVolFrom] = useState("");
  const [volTo, setVolTo] = useState("");
  const [volSingle, setVolSingle] = useState("");

  const [revisit, setRevisit] = useState<RevisitIntent | null>(null);
  const [oneLine, setOneLine] = useState("");
  const [bestMoment, setBestMoment] = useState("");
  const [recommendTo, setRecommendTo] = useState("");

  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [saved, setSaved] = useState<null | { workId: string; isBinge: boolean }>(
    null,
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return works.slice(0, 8);
    return works.filter((w) => w.title.includes(q)).slice(0, 8);
  }, [query, works]);

  const isSingle = source ? SINGLE_VOLUME_SOURCES.includes(source) : false;
  const totalVolumes = selectedWork?.total_volumes ?? null;

  async function pickWork(w: Work) {
    setSelectedWork(w);
    setNewTitle("");
    const c = await getContinueFrom(w.id);
    setContinueFrom(c);
    setStep(2);
  }

  function pickNewWork() {
    setSelectedWork(null);
    setBiblio(null);
    setContinueFrom(null);
    setNewTitle(query.trim());
    setNewAuthor("");
    setNewTotal("");
    setStep(2);
  }

  async function runExternalSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setExternalResults(null);
    try {
      const results = await searchBiblioByTitle(q);
      setExternalResults(results);
    } finally {
      setSearching(false);
    }
  }

  function pickBiblio(b: Biblio) {
    setSelectedWork(null);
    setBiblio(b);
    setContinueFrom(null);
    setNewTitle(b.title);
    setNewAuthor(b.author ?? "");
    setNewTotal(b.total_volumes != null ? String(b.total_volumes) : "");
    setStep(2);
  }

  async function handleIsbn(isbn: string) {
    setScannerOpen(false);
    setSearching(true);
    try {
      const b = await lookupBiblioByIsbn(isbn);
      if (b) {
        pickBiblio(b);
      } else {
        // 見つからず：ISBN だけ保持して手入力へ
        setSelectedWork(null);
        setBiblio({
          title: "",
          title_kana: null,
          author: null,
          publisher: null,
          isbn,
          cover_url: null,
          total_volumes: null,
        });
        setContinueFrom(null);
        setNewTitle("");
        setNewAuthor("");
        setNewTotal("");
        setStep(2);
      }
    } finally {
      setSearching(false);
    }
  }

  const workLabel = selectedWork?.title || newTitle || "（未選択）";

  function applyRange(from: number, to: number) {
    setVolFrom(String(from));
    setVolTo(String(to));
  }

  async function onSave() {
    setSaving(true);
    try {
      const from = isSingle
        ? volSingle
          ? Number(volSingle)
          : null
        : volFrom
          ? Number(volFrom)
          : null;
      const to = isSingle
        ? volSingle
          ? Number(volSingle)
          : null
        : volTo
          ? Number(volTo)
          : null;

      const result = await createLog({
        workId: selectedWork?.id,
        newWork: selectedWork
          ? undefined
          : {
              title: newTitle,
              title_kana: biblio?.title_kana ?? null,
              author: newAuthor,
              publisher: biblio?.publisher ?? null,
              isbn: biblio?.isbn ?? null,
              cover_url: biblio?.cover_url ?? null,
              total_volumes: newTotal ? Number(newTotal) : null,
            },
        read_at: readAt,
        volume_from: from,
        volume_to: to,
        source: source!,
        place,
        revisit_intent: revisit,
        one_line: oneLine,
        best_moment: bestMoment,
        recommend_to: recommendTo,
      });

      setClosing(true);
      setTimeout(() => {
        setSaved({ workId: result.workId, isBinge: result.isBinge });
      }, 380);
    } catch {
      setSaving(false);
      alert("納めるのに失敗しました。");
    }
  }

  // ---------- 保存完了画面 ----------
  if (saved) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="tome rise-in w-full max-w-md p-8 text-center">
          <p className="eyebrow">Archived</p>
          <p className="mt-2 text-2xl font-bold text-ink">書庫に納めた。</p>
          {saved.isBinge && (
            <p className="mt-3 text-sm text-ink-soft">
              ひと息に読み切った一巻。刺さった頁は、作品の書架から書き添えられる。
            </p>
          )}
          <hr className="rule-brass my-6" />
          <div className="flex flex-col gap-2">
            <Link
              href={`/works/${saved.workId}`}
              className="border border-brass-deep px-4 py-2.5 text-sm text-ink transition-colors hover:bg-[#f3ecd9]"
            >
              この書を開く
            </Link>
            <Link
              href="/"
              className="border border-brass-deep px-4 py-2.5 text-sm text-ink transition-colors hover:bg-[#f3ecd9]"
            >
              書庫へ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const stepValid = step === 2 ? source !== null : true;

  return (
    <main className="flex-1 px-4 py-8 sm:px-6">
      <div
        className={`mx-auto w-full max-w-lg ${
          closing ? "animate-tome-close" : ""
        }`}
      >
        {/* 進行 */}
        <div className="flex items-center justify-between px-1">
          <p className="eyebrow eyebrow-bright">
            記す · {step} / 3
          </p>
          <Link
            href="/"
            className="text-xs text-parchment/70 underline-offset-2 hover:underline"
          >
            やめる
          </Link>
        </div>
        <h1 className="mt-2 px-1 text-2xl font-bold text-brass">
          {STEP_TITLES[step - 1]}
        </h1>

        <div className="tome rise-in mt-4 p-6">
          {/* STEP 1 */}
          {step === 1 && (
            <>
              <button
                onClick={() => setScannerOpen(true)}
                className="mb-3 flex w-full items-center justify-center gap-2 border border-brass-deep bg-[#f3ecd9] px-3 py-2.5 text-sm font-bold text-ink"
              >
                <span className="text-lg">📷</span> バーコードで読む
              </button>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="書名で探す"
                className="field w-full px-3 py-2.5 text-ink"
              />
              <div className="mt-3 flex flex-col gap-2">
                {filtered.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => pickWork(w)}
                    className="chip px-3 py-2.5 text-left text-sm"
                  >
                    <span className="font-bold">{w.title}</span>
                    {w.author && (
                      <span className="ml-2 text-ink-soft">{w.author}</span>
                    )}
                  </button>
                ))}
                {query.trim() && (
                  <>
                    <button
                      onClick={runExternalSearch}
                      disabled={searching}
                      className="border border-brass-deep bg-[#f3ecd9] px-3 py-2.5 text-left text-sm text-ink disabled:opacity-60"
                    >
                      {searching
                        ? "書誌を照会中…"
                        : `外部の書誌から「${query.trim()}」を探す`}
                    </button>
                    <button
                      onClick={pickNewWork}
                      className="border border-dashed border-brass-deep bg-[#f3ecd9] px-3 py-2.5 text-left text-sm text-ink"
                    >
                      手入力で新たに書庫へ加える
                    </button>
                  </>
                )}
                {!query.trim() && works.length === 0 && (
                  <p className="py-4 text-center text-sm text-ink-soft">
                    まだ一冊もない。名を打ち込むところから。
                  </p>
                )}
              </div>

              {/* 外部書誌の候補 */}
              {externalResults && (
                <div className="mt-4">
                  <p className="eyebrow">見つかった書</p>
                  {externalResults.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-soft">
                      該当なし。手入力で加えられます。
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-2">
                      {externalResults.map((b, idx) => (
                        <button
                          key={`${b.isbn ?? b.title}-${idx}`}
                          onClick={() => pickBiblio(b)}
                          className="chip flex items-center gap-3 px-3 py-2 text-left"
                        >
                          {b.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={b.cover_url}
                              alt=""
                              className="h-14 w-10 shrink-0 border border-brass-deep object-cover"
                            />
                          ) : (
                            <span className="flex h-14 w-10 shrink-0 items-center justify-center border border-brass-deep text-[0.6rem] text-ink-soft">
                              なし
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold">
                              {b.title}
                            </span>
                            <span className="block truncate text-xs text-ink-soft">
                              {[b.author, b.publisher]
                                .filter(Boolean)
                                .join(" ・ ")}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3">
                {biblio?.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={biblio.cover_url}
                    alt=""
                    className="h-16 w-11 shrink-0 border border-brass-deep object-cover"
                  />
                )}
                <p className="text-lg font-bold text-ink">{workLabel}</p>
              </div>

              {!selectedWork && (
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="書名"
                    className="field w-full px-3 py-2.5 text-ink"
                  />
                  <div className="flex gap-2">
                    <input
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                      placeholder="著者（任意）"
                      className="field w-full px-3 py-2.5 text-ink"
                    />
                    <input
                      value={newTotal}
                      onChange={(e) => setNewTotal(e.target.value)}
                      inputMode="numeric"
                      placeholder="全巻数"
                      className="field w-28 px-3 py-2.5 text-ink"
                    />
                  </div>
                </div>
              )}

              <p className="eyebrow mt-5">どこで読んだ</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {SOURCE_ORDER.map((s) => (
                  <button
                    key={s}
                    data-on={source === s}
                    onClick={() => setSource(s)}
                    className="chip flex flex-col items-center gap-1 px-2 py-3 text-xs"
                  >
                    <span className="text-lg">{SOURCE_ICONS[s]}</span>
                    {SOURCE_LABELS[s]}
                  </button>
                ))}
              </div>

              {source && (
                <div className="mt-5">
                  <p className="eyebrow">幾巻を</p>

                  {continueFrom != null && !isSingle && (
                    <button
                      onClick={() => setVolFrom(String(continueFrom + 1))}
                      className="chip mt-2 px-3 py-1.5 text-xs"
                    >
                      前回の続きから（{continueFrom + 1}巻〜）
                    </button>
                  )}

                  {!isSingle && totalVolumes && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[5, 10].map(
                        (n) =>
                          n < totalVolumes && (
                            <button
                              key={n}
                              onClick={() => applyRange(1, n)}
                              className="chip px-3 py-1.5 text-xs"
                            >
                              1〜{n}巻
                            </button>
                          ),
                      )}
                      <button
                        onClick={() => applyRange(1, totalVolumes)}
                        className="chip px-3 py-1.5 text-xs"
                      >
                        完結まで（1〜{totalVolumes}巻）
                      </button>
                    </div>
                  )}

                  {isSingle ? (
                    <input
                      value={volSingle}
                      onChange={(e) => setVolSingle(e.target.value)}
                      inputMode="numeric"
                      placeholder="巻"
                      className="field mt-2 w-28 px-3 py-2.5 text-ink"
                    />
                  ) : (
                    <div className="mt-2 flex items-center gap-2 text-ink">
                      <input
                        value={volFrom}
                        onChange={(e) => setVolFrom(e.target.value)}
                        inputMode="numeric"
                        placeholder="から"
                        className="field w-24 px-3 py-2.5"
                      />
                      <span>〜</span>
                      <input
                        value={volTo}
                        onChange={(e) => setVolTo(e.target.value)}
                        inputMode="numeric"
                        placeholder="まで"
                        className="field w-24 px-3 py-2.5"
                      />
                      <span className="text-sm">巻</span>
                    </div>
                  )}

                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      placeholder="場所（自遊空間◯◯店 など・任意）"
                      className="field w-full px-3 py-2.5 text-ink"
                    />
                    <input
                      type="date"
                      value={readAt}
                      onChange={(e) => setReadAt(e.target.value)}
                      className="field w-full px-3 py-2.5 text-ink"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <p className="eyebrow">また、読みたいか</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {REVISIT_ORDER.map((r) => (
                  <button
                    key={r}
                    data-on={revisit === r}
                    onClick={() => setRevisit(revisit === r ? null : r)}
                    className="chip px-2 py-3 text-xs"
                  >
                    {REVISIT_INTENT_LABELS[r]}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <label className="text-sm text-ink-soft">
                  一言で言うと
                  <textarea
                    value={oneLine}
                    onChange={(e) => setOneLine(e.target.value)}
                    rows={2}
                    className="field mt-1 w-full px-3 py-2 text-ink"
                  />
                </label>
                <label className="text-sm text-ink-soft">
                  一番刺さった瞬間
                  <textarea
                    value={bestMoment}
                    onChange={(e) => setBestMoment(e.target.value)}
                    rows={2}
                    className="field mt-1 w-full px-3 py-2 text-ink"
                  />
                </label>
                <label className="text-sm text-ink-soft">
                  誰に勧める
                  <textarea
                    value={recommendTo}
                    onChange={(e) => setRecommendTo(e.target.value)}
                    rows={2}
                    className="field mt-1 w-full px-3 py-2 text-ink"
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-ink-soft">
                いずれも任意。空のままでも納められる。
              </p>
            </>
          )}
        </div>

        {/* 操作 */}
        <div className="mt-4 flex gap-2">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="border border-brass-dim px-4 py-3 text-sm text-parchment/80 transition-colors hover:text-brass"
            >
              戻る
            </button>
          )}
          {step < 3 && (
            <button
              disabled={!stepValid}
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              className="flex-1 border border-brass px-4 py-3 text-sm font-bold text-brass transition-colors hover:bg-[color:var(--color-vault-2)] disabled:opacity-40"
            >
              次へ
            </button>
          )}
          {step === 3 && (
            <button
              disabled={saving}
              onClick={onSave}
              className="seal flex-1 px-4 py-3 text-sm font-bold disabled:opacity-60"
            >
              {saving ? "納めています…" : "書庫に納める"}
            </button>
          )}
        </div>
      </div>

      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleIsbn}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </main>
  );
}
