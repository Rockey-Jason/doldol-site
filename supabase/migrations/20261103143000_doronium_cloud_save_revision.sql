alter table public.dori_cloud_storage
  add column if not exists save_revision bigint not null default 0;

alter table public.dori_cloud_storage
  alter column save_revision set default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dori_cloud_storage_save_revision_nonnegative'
      and conrelid = 'public.dori_cloud_storage'::regclass
  ) then
    alter table public.dori_cloud_storage
      add constraint dori_cloud_storage_save_revision_nonnegative
      check (save_revision >= 0);
  end if;
end
$$;

comment on column public.dori_cloud_storage.save_revision is
  'Monotonic optimistic-concurrency revision for per-user cloud saves. Increment only after a compare-and-swap update.';
