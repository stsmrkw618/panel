-- =========================================================
-- PANEL 初期スキーマ（CLAUDE.md §4 に準拠）
-- 所有物ではなく「読書という出来事」を軸にした4層構造。
-- Supabase ダッシュボード > SQL Editor に貼って実行する。
-- =========================================================

-- pgvector（感覚検索用）
create extension if not exists vector;

-- ---------------------------------------------------------
-- 作品マスタ
-- ---------------------------------------------------------
create table if not exists works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  title_kana text,
  author text,
  publisher text,
  isbn text,
  cover_url text,          -- openBD / Google Books の書影URL
  total_volumes int,       -- 不明なら null
  status text not null default 'reading',
    -- 'reading' | 'completed' | 'paused' | 'want_to_read'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 読書セッション：いつ・どこで・何巻を読んだか
-- 「手元にない本」を記録できるのはこのテーブルのおかげ
-- ---------------------------------------------------------
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id uuid not null references works(id) on delete cascade,
  read_at date not null default current_date,
  -- 巻数は常に範囲で持つ。単巻の場合は from = to とする
  volume_from int,
  volume_to int,
  source text not null,
    -- 'owned' | 'rental' | 'cafe' | 'ebook' | 'borrowed' | 'store'
  place text,              -- 「自遊空間◯◯店」など任意メモ
  revisit_intent text,
    -- 'buy' | 'reread' | 'finished' | 'not_for_me'
  -- 感想は定型3項目
  one_line text,           -- ①一言で言うと
  best_moment text,        -- ②一番刺さった瞬間
  recommend_to text,       -- ③誰に勧めるか
  note text,               -- 追記（記録フローには出さず作品詳細から書く）
  embedding vector(1024),  -- 上記項目を連結してベクトル化（感覚検索用）
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 名シーン：撮影した画像 + 文脈
-- ---------------------------------------------------------
create table if not exists scenes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id uuid not null references works(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  storage_path text not null,   -- Supabase Storage の private bucket 内パス
  volume int,
  caption text,                 -- なぜ刺さったか（一言）
  ocr_text text,                -- Claude vision で抽出したセリフ
  emotion_tags text[],          -- ['熱い','泣ける','伏線回収','鳥肌'] など
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 想起ログ：いつ何を再表示したか（同じものばかり出さないため）
-- ---------------------------------------------------------
create table if not exists recalls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scene_id uuid references scenes(id) on delete cascade,
  shown_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- インデックス
-- ---------------------------------------------------------
create index if not exists sessions_user_read_at_idx on sessions (user_id, read_at desc);
create index if not exists scenes_user_created_at_idx on scenes (user_id, created_at desc);
create index if not exists works_user_updated_at_idx on works (user_id, updated_at desc);

-- =========================================================
-- RLS：全テーブルで有効化し、auth.uid() = user_id を
-- select / insert / update / delete すべてに設定。例外は作らない。
-- =========================================================
alter table works    enable row level security;
alter table sessions enable row level security;
alter table scenes   enable row level security;
alter table recalls  enable row level security;

-- works
create policy "works_select" on works for select using (auth.uid() = user_id);
create policy "works_insert" on works for insert with check (auth.uid() = user_id);
create policy "works_update" on works for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "works_delete" on works for delete using (auth.uid() = user_id);

-- sessions
create policy "sessions_select" on sessions for select using (auth.uid() = user_id);
create policy "sessions_insert" on sessions for insert with check (auth.uid() = user_id);
create policy "sessions_update" on sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_delete" on sessions for delete using (auth.uid() = user_id);

-- scenes
create policy "scenes_select" on scenes for select using (auth.uid() = user_id);
create policy "scenes_insert" on scenes for insert with check (auth.uid() = user_id);
create policy "scenes_update" on scenes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scenes_delete" on scenes for delete using (auth.uid() = user_id);

-- recalls
create policy "recalls_select" on recalls for select using (auth.uid() = user_id);
create policy "recalls_insert" on recalls for insert with check (auth.uid() = user_id);
create policy "recalls_update" on recalls for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recalls_delete" on recalls for delete using (auth.uid() = user_id);
