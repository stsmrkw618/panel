-- =========================================================
-- シーン画像の格納先（§5）
-- private バケット `scenes`。参照は署名URL経由のみ。
-- パス規約: {user_id}/{work_id}/{scene_id}.webp
-- Supabase ダッシュボード > SQL Editor に貼って実行する。
-- =========================================================

-- private バケットを作成（既にあれば無視）
insert into storage.buckets (id, name, public)
values ('scenes', 'scenes', false)
on conflict (id) do nothing;

-- storage.objects への RLS ポリシー：
-- 先頭フォルダ（= user_id）が本人のものだけを許可する。
create policy "scenes_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'scenes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "scenes_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'scenes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "scenes_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'scenes'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'scenes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "scenes_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'scenes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
