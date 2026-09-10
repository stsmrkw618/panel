"use client";

import { useState, useTransition } from "react";
import {
  REVISIT_INTENT_LABELS,
  SINGLE_VOLUME_SOURCES,
  SOURCE_LABELS,
  type RevisitIntent,
  type Session,
  type Source,
} from "@/lib/types";
import { formatDate, sessionVolumeLabel } from "@/lib/format";
import { editSession } from "./actions";

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

export default function SessionCard({
  workId,
  session,
}: {
  workId: string;
  session: Session;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <article className="tome rise-in p-6">
      {editing ? (
        <EditForm
          workId={workId}
          session={session}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <p className="font-sans text-[0.7rem] tracking-wide text-muted-dark">
              {[
                formatDate(session.read_at),
                sessionVolumeLabel(session),
                SOURCE_LABELS[session.source],
                session.place,
              ]
                .filter(Boolean)
                .join(" ・ ")}
            </p>
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 border border-brass-deep px-2.5 py-0.5 text-xs text-ink transition-colors hover:bg-[#f3ecd9]"
            >
              書き直す
            </button>
          </div>

          {session.revisit_intent && (
            <p className="mt-3 inline-block border border-brass-deep px-2.5 py-0.5 text-xs text-ink">
              {REVISIT_INTENT_LABELS[session.revisit_intent]}
            </p>
          )}

          {(session.one_line ||
            session.best_moment ||
            session.recommend_to) && (
            <dl className="mt-4 flex flex-col gap-3">
              {session.one_line && (
                <div>
                  <dt className="eyebrow">一言で言うと</dt>
                  <dd className="mt-0.5 text-base leading-relaxed text-ink">
                    {session.one_line}
                  </dd>
                </div>
              )}
              {session.best_moment && (
                <div>
                  <dt className="eyebrow">一番刺さった瞬間</dt>
                  <dd className="mt-0.5 text-base leading-relaxed text-ink">
                    {session.best_moment}
                  </dd>
                </div>
              )}
              {session.recommend_to && (
                <div>
                  <dt className="eyebrow">誰に勧める</dt>
                  <dd className="mt-0.5 text-base leading-relaxed text-ink">
                    {session.recommend_to}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </>
      )}
    </article>
  );
}

function EditForm({
  workId,
  session,
  onDone,
}: {
  workId: string;
  session: Session;
  onDone: () => void;
}) {
  const [readAt, setReadAt] = useState(session.read_at);
  const [source, setSource] = useState<Source>(session.source);
  const [place, setPlace] = useState(session.place ?? "");
  const [volFrom, setVolFrom] = useState(
    session.volume_from != null ? String(session.volume_from) : "",
  );
  const [volTo, setVolTo] = useState(
    session.volume_to != null ? String(session.volume_to) : "",
  );
  const [volSingle, setVolSingle] = useState(
    session.volume_from != null ? String(session.volume_from) : "",
  );
  const [revisit, setRevisit] = useState<RevisitIntent | null>(
    session.revisit_intent,
  );
  const [oneLine, setOneLine] = useState(session.one_line ?? "");
  const [bestMoment, setBestMoment] = useState(session.best_moment ?? "");
  const [recommendTo, setRecommendTo] = useState(session.recommend_to ?? "");
  const [pending, startTransition] = useTransition();

  const isSingle = SINGLE_VOLUME_SOURCES.includes(source);

  function onSave() {
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

    startTransition(async () => {
      await editSession(workId, session.id, {
        read_at: readAt,
        source,
        place,
        volume_from: from,
        volume_to: to,
        revisit_intent: revisit,
        one_line: oneLine,
        best_moment: bestMoment,
        recommend_to: recommendTo,
      });
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-3 text-ink">
      <div className="grid grid-cols-3 gap-2">
        {SOURCE_ORDER.map((s) => (
          <button
            key={s}
            data-on={source === s}
            onClick={() => setSource(s)}
            className="chip px-2 py-2 text-xs"
          >
            {SOURCE_LABELS[s]}
          </button>
        ))}
      </div>

      {isSingle ? (
        <input
          value={volSingle}
          onChange={(e) => setVolSingle(e.target.value)}
          inputMode="numeric"
          placeholder="巻"
          className="field w-28 px-3 py-2.5"
        />
      ) : (
        <div className="flex items-center gap-2">
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

      <input
        value={place}
        onChange={(e) => setPlace(e.target.value)}
        placeholder="場所（任意）"
        className="field w-full px-3 py-2.5"
      />
      <input
        type="date"
        value={readAt}
        onChange={(e) => setReadAt(e.target.value)}
        className="field w-full px-3 py-2.5"
      />

      <div className="grid grid-cols-2 gap-2">
        {REVISIT_ORDER.map((r) => (
          <button
            key={r}
            data-on={revisit === r}
            onClick={() => setRevisit(revisit === r ? null : r)}
            className="chip px-2 py-2 text-xs"
          >
            {REVISIT_INTENT_LABELS[r]}
          </button>
        ))}
      </div>

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

      <div className="flex gap-2">
        <button
          onClick={onDone}
          className="border border-brass-deep px-4 py-2 text-sm text-ink transition-colors hover:bg-[#f3ecd9]"
        >
          やめる
        </button>
        <button
          disabled={pending}
          onClick={onSave}
          className="seal flex-1 px-4 py-2 text-sm font-bold disabled:opacity-60"
        >
          {pending ? "納めています…" : "書き改める"}
        </button>
      </div>
    </div>
  );
}
