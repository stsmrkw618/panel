# PANEL — マンガ読書記録アプリ

## 1. プロジェクト概要

マンガの読書体験を記録し、**後から思い出せる**ようにする個人用アプリ。

### 解きたい課題
- 読んだマンガの内容・面白さを数ヶ月で忘れてしまう
- レンタル・マンガ喫茶で読んだ作品は手元に残らず、記録が一切残らない
- 「あのセリフ、何の漫画だっけ」が検索できない

### 設計の中心思想
このアプリは「記録機能」ではなく **「入力の軽さ」と「想起の仕組み」** で成否が決まる。

1. **入力は30秒以内に完了すること。** マンガ喫茶の帰り道、スマホで数タップ。ここが重ければ絶対に続かない
2. **記録は書くより返ってくること。** 保存したものが自分から目の前に現れる導線がなければ、記録は死蔵される
3. **所有と読書体験を分離すること。** 「持っている本」ではなく「読んだという出来事」を一級市民として扱う

### 想定ユーザー
本人1名のみ。マルチユーザー対応は不要だが、Supabase Auth と RLS は最初から入れる（画像の非公開性を担保するため）。

---

## 2. 開発環境と制約

- **OS**: Windows（管理者権限なし）
- **ネットワーク**: 社内は Zscaler 配下。証明書エラーが出る場合は `NODE_EXTRA_CA_CERTS` で対応する前提。開発は原則ローカル
- **コスト**: 追加課金ゼロで組むこと。Supabase Free tier、Vercel Hobby、既存の Anthropic API 利用枠の範囲で完結させる
- **実装環境**: Claude Code
- **デプロイ**: Vercel（個人アカウント）

---

## 3. 技術スタック

| 領域 | 採用 |
|---|---|
| フレームワーク | Next.js 16 (App Router) / TypeScript |
| スタイル | Tailwind CSS |
| DB / 認証 / ストレージ | Supabase (Postgres + Auth + Storage) |
| ベクトル検索 | Supabase pgvector |
| AI | Anthropic API (claude-sonnet-4-6) |
| モバイル | PWA（`next-pwa` もしくは手書き manifest + service worker） |

**PWA は必須要件。** ホーム画面から1タップで記録画面に入れること。デスクトップ前提で作らない。

---

## 4. データモデル

所有物ではなく「読書という出来事」を軸にした4層構造。

```sql
-- 作品マスタ
create table works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  title_kana text,
  author text,
  publisher text,
  isbn text,
  cover_url text,          -- openBD / Google Books の書影URL
  total_volumes int,       -- 既刊巻数（連載中は最新巻、完結は最終巻）。不明なら null
  is_complete boolean not null default false, -- 連載が完結しているか（0003）
  rating smallint,         -- 作品の評価 ★1〜5、未評価は null（0004。§12参照）
  status text not null default 'reading',
    -- 'reading' | 'completed' | 'paused' | 'want_to_read'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 読書セッション：いつ・どこで・何巻を読んだか
-- 「手元にない本」を記録できるのはこのテーブルのおかげ
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id uuid not null references works(id) on delete cascade,
  read_at date not null default current_date,
  -- 巻数は常に範囲で持つ。単巻の場合は from = to とする
  -- （マンガ喫茶でのまとめ読みが主要ユースケースのため、範囲を既定形とする）
  volume_from int,
  volume_to int,
  source text not null,
    -- 'owned'（所有） | 'rental'（レンタル） | 'cafe'（マンガ喫茶）
    -- | 'ebook'（電子） | 'borrowed'（借りた） | 'store'（立ち読み）
  place text,              -- 「自遊空間◯◯店」など任意メモ
  -- セッション単位の星評価は採用しない（作品単位の ★ は works.rating に持つ。§12参照）。
  -- 「熱かったが再読はしない」が普通に成立するため、感情の強度と再読意思を
  -- 1つの数値に潰すと入力時に手が止まる。言葉で意思だけを問う。
  revisit_intent text,
    -- 'buy'      : また買ってでも読む
    -- 'reread'   : また読みたい
    -- 'finished' : 読み切って満足（肯定的な完了）
    -- 'not_for_me' : 合わなかった
    -- ※「途中で止めた」はここに入れない。状態なので works.status = 'paused' で持つ

  -- 感想は定型3項目。30秒フローではこの3つ以外を出さない
  one_line text,           -- ①一言で言うと
  best_moment text,        -- ②一番刺さった瞬間
  recommend_to text,       -- ③誰に勧めるか

  -- 追記。記録フローには出さず、作品詳細から後で書き足す欄（§6参照）
  note text,

  embedding vector(1024),  -- 上記3項目を連結してベクトル化（感覚検索用）
  created_at timestamptz not null default now()
);

-- 名シーン：撮影した画像 + 文脈
create table scenes (
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

-- 想起ログ：いつ何を再表示したか（同じものばかり出さないため）
create table recalls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scene_id uuid references scenes(id) on delete cascade,
  shown_at timestamptz not null default now()
);

create index on sessions (user_id, read_at desc);
create index on scenes (user_id, created_at desc);
create index on works (user_id, updated_at desc);
```

### RLS

全テーブルで RLS を有効化し、`auth.uid() = user_id` のポリシーを select / insert / update / delete すべてに設定すること。例外は作らない。

---

## 5. ストレージ（画像の取り扱い）

**この設計は妥協しないこと。** 撮影したページ画像は私的複製の範囲に留める前提であり、外部から到達可能な状態を一切作らない。

- バケット名 `scenes`、**private**（public バケットは使わない）
- 参照は必ず**有効期限付き署名URL**（`createSignedUrl`、TTL 60分）経由
- パス規約: `{user_id}/{work_id}/{scene_id}.webp`
- アップロード時にクライアント側で長辺1600pxにリサイズ、WebP変換してから送る（Free tier 容量対策）
- 画像を含む OGP、共有リンク、公開ページは**作らない**
- `next.config.js` の `images.remotePatterns` に Supabase ドメインを追加

---

## 6. 画面仕様

### `/` ホーム
- 最上部に **今日の再会**：過去のシーン画像を1枚ランダム表示（詳細は §8）
- その下に蔵書一覧。**1作品1枚**（作品ごとに最新セッションを代表）で、表示を切り替えられる（`?view=`）
  - **書棚**（既定）：書影を正面向きに棚板へ並べる。列数・間隔・段数は冊数と画面幅で自動調整
  - **目録**：作品名 / ★ / 連載状態 / 一言 / 巻 / 読んだ場所 / 日付の一覧
- 並び替え（`?sort=`）：最近読んだ順（既定）/ 評価の高い順 / 書名順
- 右下に固定の記録ボタン（FAB）。羽ペンのアイコン（漢字は使わない）

### `/log/new` 記録フロー — 最重要画面
30秒で終わらせる。ステップは3つまで。

1. **作品を特定する**
   - バーコードスキャン（`@zxing/library` でカメラから ISBN 読み取り）
   - またはタイトル検索（過去に登録した works を優先サジェスト → なければ外部API）
   - 続巻を読んだ場合は「前回の続きから」を1タップで選べること
2. **どこで・何巻**
   - `source` はアイコン付きのボタン選択（テキスト入力させない）
   - **`source` に応じて巻数の入力形式を変える。** `owned` / `store` は単巻、`cafe` / `rental` / `ebook` は範囲を既定にする（漫喫は1〜20巻のまとめ読みが普通に起きる）
   - `works.total_volumes` が既知なら「1〜5巻 / 1〜10巻 / 完結まで」のようなショートカットを動的生成する。任意巻数のための数値入力も必ず残す
   - 前回記録がある作品は「前回の続きから」を初期値に入れる
   - **範囲が最終巻に達したら `works.status` を `completed` に自動更新する**（一気読み完結が主要パターンのため、手動で status を変えさせない）
3. **再読意思 + 感想3項目**
   - `revisit_intent` は4択のボタン
   - 作品の ★評価（任意）もここで付けられる。既存作品は現在の評価を初期値にする
   - 感想3項目はすべて任意。空でも保存できること。**保存を阻む必須項目を作らない**
   - **一気読み（5巻以上の範囲）を検出したら、保存後に「刺さったシーンを登録する」導線を出す。** 20巻分の体験は `best_moment` 1つに収まらないため、シーンを複数枚登録できる画面へ直接送る

### `/works/[id]` 作品詳細
- 書影、あらすじ、読書セッションの時系列
- その作品のシーン画像グリッド
- **追記欄（`sessions.note`）**。記録フローには出さず、ここでだけ書ける自由記述。構造や伏線について落ち着いて語りたくなる作品のための場所であり、**記録する瞬間と書きたい瞬間を分離する**ための設計。空のままでも一切催促しない
- 「この作品の記録をまとめて振り返る」→ Claude API で通し要約を生成

### `/scenes/new` シーン登録
- カメラ起動 or ライブラリ選択 → リサイズ → アップロード
- アップロード後、非同期で Claude vision に投げて `ocr_text` と `emotion_tags` を自動生成
- 手入力は caption のみ（任意）

### `/search` 検索
3つのモードをタブで切り替え：
- **セリフ検索**: `scenes.ocr_text` の全文検索。「あのセリフ、何の漫画だっけ」を解く
- **感覚検索**: `sessions.embedding` のベクトル類似度検索。「ハンター×ハンター的な緊張感がある作品」のようなクエリを受け付ける
- **通常検索**: 作品名・作者

### `/review` 振り返り
- 月次サマリ：その月に読んだ作品一覧 + Claude API 生成の振り返り文
- 年間で読んだ冊数、source 別の内訳（グラフ）

---

## 7. 外部API

### 書誌情報の取得
1. **openBD**（`https://api.openbd.jp/v1/get?isbn={isbn}`）を第一候補。日本の書籍に強く、認証不要・無料
2. ヒットしなければ **Google Books API** にフォールバック
3. どちらも失敗したら手入力フォームに落とす（**必ず手入力の逃げ道を残すこと**）

取得結果は `works` にキャッシュし、同じ作品で再フェッチしない。

### Anthropic API
- モデルは `claude-sonnet-4-6`
- 呼び出しは必ず Next.js の Route Handler 経由（`app/api/.../route.ts`）。**APIキーをクライアントに露出させない**
- OCR・タグ付けは登録直後の同期処理にせず、バックグラウンドで実行してUIをブロックしない

---

## 8. 想起の仕組み（このアプリの本体）

記録するだけでは忘れる。以下は「あったら良い機能」ではなく**中核要件**として実装すること。

### 今日の再会
ホーム最上部に過去のシーン画像を1枚表示。選定ロジック：
- `recalls` を参照し、直近30日に表示したシーンは除外
- 登録から時間が経ったものほど重みを高くする（記憶が薄れた頃に出す）
- 表示したら `recalls` に記録

### 月次振り返りの自動生成
月末に、その月の `sessions` の感想3項目をまとめて Claude API に投げ、振り返り文を生成して表示。「今月は◯◯な作品に惹かれていた」といった傾向の言語化まで踏み込ませる。

### 感覚検索
`sessions` の `one_line` / `best_moment` / `recommend_to` / `note` を連結して埋め込みベクトル化し、pgvector で類似検索。作品名を覚えていなくても、印象から辿り着けるようにする。

---

## 9. デザイン方針 — 秘密の書庫 (The Secret Archive)

**この方針は提案ではなく指定。踏襲すること。**

主題は**うす暗い書庫に眠る蔵書**である。一般的なSaaSカードUIにも、フラットで無機質なミニマルUIにも**しない**。ページをめくるような高揚感・発見の悦びを宿す。明朝体の高級感を主役に据える。

### コンセプト
読書の記録は「書庫に一冊を納める」体験として立ち上げる。羊皮紙の**蔵書カード（tome）**を、書庫の闇（濃い地）の上に落ち影で浮かせる。金（真鍮）の細い罫と二重枠で蔵書票の趣を出し、記録の保存は**封蝋の印**で締める。均一に整列した無表情なカードは避け、大小のカードを非対称に組む（読書セッション一覧も同様）。角丸は原則 0（封蝋の印のみ円形）。

### カラー
書庫の闇・羊皮紙・真鍮の金・封蝋の朱。

| 名前 | 用途 | 値 |
|---|---|---|
| `vault` | 背景（書庫の闇） | `#16110B` |
| `vault-2` | 背景グラデ上部 | `#221A11` |
| `parchment` | 蔵書カードの紙（羊皮紙） | `#ECE1C6` |
| `ink` | 羊皮紙上の文字 | `#241C12` |
| `ink-soft` | 同・補助 | `#5C4F39` |
| `brass` | 真鍮の金（罫・ラベル・装飾） | `#C6A561` |
| `brass-deep` | 金の暗部・枠 | `#6E5A30` |
| `seal` | 封蝋の朱（蔵書印・記録の印） | `#9D2B22` |
| `muted` | 補助テキスト（闇の上） | `#8A7C62` |

- 冷たい白背景・純黒は**使わない**（旧「紙とインク」路線は破棄）
- 封蝋の朱は「記録の印（保存ボタン・FAB）」と「今日の再会」にのみ使う。乱用しない
- 背景は上からの淡い燭光と四隅のヴィネットで奥行きを出す

### タイポグラフィ
- **主役＝明朝**: `Shippori Mincho`。見出し・本文・引用・作品名・感想に用い、高級感を担保する
- **極小ラベル・メタのみ**: `Noto Sans JP`。日付やソースなどの微細情報に限定
- 感想3項目（一言／刺さった瞬間／誰に勧める）は**書体・サイズを完全に統一**する
- 英字の小見出しラベル（`The Secret Archive` 等）は真鍮色・字間広めの箔押し風に限り可

### 演出（ワクワクを担う）
- 記録の保存完了時に、**綴じるように閉じる**（矩形が上下から締まる）モーションを1つ。締めの主役演出
- 蔵書カードは登場時にすっと浮かび上がり（`rise-in`）、リンクカードはホバーでそっと持ち上がる
- 封蝋の印はホバー・押下で沈み込む
- `prefers-reduced-motion` を必ず尊重する（上記モーションを無効化）

### 文言
- 書庫の世界観に沿った言い回しを用いる（「書庫に納める」「この書を開く」「近ごろ紐解いた頁」など）
- 空状態は誘導にする。「記録がありません」ではなく「まだ、書庫は静かだ。読んだ本を1冊、ここに納めてみる」
- ボタンは動作を書く。過度な装飾語は避けつつ、世界観に馴染む語を選ぶ

---

## 10. 実装フェーズ

**v1 を作り切って1週間実運用してから v2 に進むこと。** 先に自動化を積むと、使われない機能を作り込むことになる。

### v1 — 手入力で運用を始める（まずここまで）
- Supabase セットアップ、認証、RLS
- `works` / `sessions` の CRUD（作品はすべて手入力）
- ホーム、記録フロー、作品詳細
- PWA 化
- デザイン方針の適用

### v2 — 入力を軽くする
- ISBN バーコードスキャン
- openBD / Google Books 連携
- 「前回の続きから」ショートカット
- `scenes` の画像アップロード（private bucket + 署名URL）

### v3 — 思い出す仕組み
- 今日の再会 + `recalls`
- Claude vision による OCR と感情タグ付与
- セリフ全文検索
- 月次振り返り生成

### v4 — 感覚で辿る
- pgvector による埋め込みと感覚検索
- 年間サマリとグラフ

---

## 11. やらないこと

明示的にスコープ外。実装しない。

- SNS共有、公開プロフィール、他ユーザーへの公開機能（画像を私的利用に閉じるため）
- **記録フロー内**の自由記述欄（30秒フローは定型3項目のみ。自由記述は作品詳細の追記欄に隔離する）
- 読書中タイマー、ページ数トラッキング
- 電子書籍ストア連携、購入リンク
- マルチユーザー運用を前提とした管理画面

---

## 12. 変更履歴（当初仕様からの変更点）

- **2026-09-11 連載状態の分離**: 「total_volumes があれば完結」をやめ、`works.is_complete` を独立列に（`0003_series_completion.sql`）。自動読了は「完結かつ最終巻到達」のときのみ
- **2026-10-18 ★評価・書棚表示**（本人要望により当初の「星は採用しない」方針を一部変更）
  - `works.rating`（★1〜5）を追加（`0004_work_rating.sql`）。作品詳細ではタップで即保存、記録フロー STEP3 でも任意で付けられる。`revisit_intent` は併存
  - ホームを1作品1枚に集約し、書棚／目録の切り替えと並び替え（最近読んだ順・評価順・書名順）を追加
  - 完結／連載中ラベルを形と色で区別（完結＝墨地に金文字＋✓、連載中＝点線枠＋金の点）
  - 記録FABを「記」から羽ペンのSVGアイコンに変更
