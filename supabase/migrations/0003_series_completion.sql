-- =========================================================
-- 連載状態を巻数と分けて持つ（§4 の運用変更）
-- これまで total_volumes の有無で「完結」を兼ねていたが、
-- 連載中の作品でも「既刊◯巻」を記録したいため、完結フラグを独立させる。
--   total_volumes … 既刊巻数（連載中なら最新巻、完結なら最終巻）
--   is_complete   … 連載が完結しているか
-- Supabase ダッシュボード > SQL Editor に貼って実行する。
-- =========================================================

alter table works
  add column if not exists is_complete boolean not null default false;

-- 既存データの引き継ぎ：旧運用では total_volumes が入っていれば「完結」だった
update works set is_complete = true where total_volumes is not null;
