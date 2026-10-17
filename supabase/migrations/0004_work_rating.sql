-- =========================================================
-- 作品の評価（★1〜5）を追加する
-- 再読意思（revisit_intent）とは別に、作品そのものへの手応えを
-- 星で軽く付けられるようにする。未評価は null のまま。
-- 既存データは変更しない（列の追加のみ）。
-- Supabase ダッシュボード > SQL Editor に貼って実行する。
-- =========================================================

alter table works
  add column if not exists rating smallint
  check (rating is null or rating between 1 and 5);
