// 連載状態の印。完結は濃いインクに金の文字で「閉じた書」、
// 連載中は点線枠に金の点で「まだ続く書」とし、形と色の両方で見分けられるようにする。
export default function SeriesBadge({
  isComplete,
  size = "sm",
}: {
  isComplete: boolean;
  size?: "sm" | "md";
}) {
  const text = size === "md" ? "text-[0.72rem]" : "text-[0.66rem]";
  if (isComplete) {
    return (
      <span
        className={`inline-flex items-center gap-1 border border-ink bg-ink px-1.5 py-0.5 font-sans font-bold tracking-wider text-brass ${text}`}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
          <path
            d="M2.5 6.2l2.4 2.3 4.6-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        完結
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 border border-dashed border-brass-deep px-1.5 py-0.5 font-sans tracking-wider text-ink-soft ${text}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brass-deep" />
      連載中
    </span>
  );
}
