"use client";

// ★1〜5 の評価。同じ星をもう一度押すと未評価に戻る。
// onChange を渡さなければ表示専用になる。
export default function StarRating({
  value,
  onChange,
  size = "md",
  disabled = false,
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}) {
  const px = size === "sm" ? 12 : size === "lg" ? 30 : 20;
  const stars = [1, 2, 3, 4, 5];

  if (!onChange) {
    if (value == null) return null;
    return (
      <span
        className="inline-flex items-center gap-px"
        aria-label={`評価 ${value} / 5`}
      >
        {stars.map((n) => (
          <Star key={n} filled={n <= value} px={px} />
        ))}
      </span>
    );
  }

  return (
    <span role="radiogroup" aria-label="評価" className="inline-flex gap-1">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`★${n}`}
          disabled={disabled}
          onClick={() => onChange(value === n ? null : n)}
          className="star-btn p-0.5 disabled:opacity-60"
        >
          <Star filled={value != null && n <= value} px={px} />
        </button>
      ))}
    </span>
  );
}

function Star({ filled, px }: { filled: boolean; px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      aria-hidden
      className={filled ? "text-brass-deep" : "text-brass-dim/60"}
    >
      <path
        d="M12 2.8l2.78 5.64 6.22.9-4.5 4.39 1.06 6.2L12 17.0l-5.56 2.93 1.06-6.2L3 9.34l6.22-.9z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
