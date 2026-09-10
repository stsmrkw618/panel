import "server-only";

// 書誌情報の正規化型
export type Biblio = {
  title: string;
  title_kana: string | null;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
  cover_url: string | null;
  total_volumes: number | null; // 取得できないことが多いので null 既定
};

const OPENBD = "https://api.openbd.jp/v1/get";
const GBOOKS = "https://www.googleapis.com/books/v1/volumes";

// ハイフン等を除去
function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "");
}

// ---------------------------------------------------------
// ISBN から1件取得：openBD → Google Books の順（§7）
// ---------------------------------------------------------
export async function fetchByIsbn(rawIsbn: string): Promise<Biblio | null> {
  const isbn = normalizeIsbn(rawIsbn);
  if (!isbn) return null;

  const fromOpenBD = await fromOpenbd(isbn).catch(() => null);
  if (fromOpenBD) return fromOpenBD;

  const fromGoogle = await searchGoogle(`isbn:${isbn}`).catch(() => []);
  return fromGoogle[0] ?? null;
}

async function fromOpenbd(isbn: string): Promise<Biblio | null> {
  const res = await fetch(`${OPENBD}?isbn=${encodeURIComponent(isbn)}`, {
    // 書誌はほぼ不変なので長めにキャッシュ
    next: { revalidate: 60 * 60 * 24 * 30 },
  });
  if (!res.ok) return null;
  const arr = (await res.json()) as Array<{
    summary?: {
      title?: string;
      author?: string;
      publisher?: string;
      cover?: string;
      isbn?: string;
    };
  } | null>;
  const s = arr?.[0]?.summary;
  if (!s?.title) return null;
  return {
    title: s.title,
    title_kana: null,
    author: s.author || null,
    publisher: s.publisher || null,
    isbn: s.isbn || isbn,
    cover_url: s.cover || null,
    total_volumes: null,
  };
}

// ---------------------------------------------------------
// タイトルで外部検索：Google Books（openBDはタイトル検索非対応）
// ---------------------------------------------------------
export async function searchExternal(query: string): Promise<Biblio[]> {
  const q = query.trim();
  if (!q) return [];
  return searchGoogle(q).catch(() => []);
}

async function searchGoogle(q: string): Promise<Biblio[]> {
  // 任意：自前クォータ用の API キー（未設定なら共有クォータ。429 になり得る）
  const key = process.env.GOOGLE_BOOKS_API_KEY
    ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}`
    : "";
  const url = `${GBOOKS}?q=${encodeURIComponent(q)}&maxResults=12&country=JP&langRestrict=ja${key}`;
  const res = await fetch(url, {
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    items?: Array<{
      volumeInfo?: {
        title?: string;
        subtitle?: string;
        authors?: string[];
        publisher?: string;
        imageLinks?: { thumbnail?: string; smallThumbnail?: string };
        industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
      };
    }>;
  };
  const items = data.items ?? [];
  const seen = new Set<string>();
  const results: Biblio[] = [];
  for (const it of items) {
    const v = it.volumeInfo;
    if (!v?.title) continue;
    const key = `${v.title}::${(v.authors ?? []).join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const isbn13 = v.industryIdentifiers?.find(
      (x) => x.type === "ISBN_13",
    )?.identifier;
    const isbn10 = v.industryIdentifiers?.find(
      (x) => x.type === "ISBN_10",
    )?.identifier;

    // Google の書影は http のことがあるので https 化
    const rawCover =
      v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || null;
    const cover = rawCover ? rawCover.replace(/^http:/, "https:") : null;

    results.push({
      title: v.title,
      title_kana: null,
      author: (v.authors ?? []).join("、") || null,
      publisher: v.publisher || null,
      isbn: isbn13 || isbn10 || null,
      cover_url: cover,
      total_volumes: null,
    });
  }
  return results;
}
