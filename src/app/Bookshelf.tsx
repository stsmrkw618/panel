import Link from "next/link";

export type ShelfBook = {
  workId: string;
  title: string;
  cover: string | null;
  rating: number | null;
  isComplete: boolean;
};

// 書棚：書影を正面に向けて棚板に立てる。
// 列数・間隔・段数は CSS Grid（auto-fill）と棚板の繰り返し背景で、件数と画面幅から自動で決まる。
export default function Bookshelf({ books }: { books: ShelfBook[] }) {
  return (
    <div className="shelf rise-in mt-4">
      {books.map((b, i) => (
        <Link
          key={b.workId}
          href={`/works/${b.workId}`}
          className="shelf-book rise-in"
          style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
        >
          <span className="shelf-title line-clamp-2">{b.title}</span>
          <span className="shelf-cover">
            {b.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.cover} alt="" className="h-full w-full object-cover" />
            ) : (
              // 書影のない書は、羊皮紙の表紙に縦書きで題を入れる
              <span className="shelf-cover-blank">
                <span className="line-clamp-3">{b.title}</span>
              </span>
            )}
            {b.isComplete && (
              <span className="shelf-mark" aria-label="完結">
                完
              </span>
            )}
            {b.rating != null && (
              <span className="shelf-rating" aria-label={`評価 ${b.rating} / 5`}>
                {"★".repeat(b.rating)}
              </span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}
