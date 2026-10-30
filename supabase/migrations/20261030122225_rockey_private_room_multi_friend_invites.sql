-- Allow one private room to invite multiple specific friends.
-- Existing invite room codes and Dori Site data remain unchanged.

create table if not exists public.rockey_invite_recipients (
  invite_id uuid not null references public.rockey_invites(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (invite_id,target_user_id),
  constraint rockey_invite_recipient_not_host check (target_user_id <> invited_by)
);

create index if not exists rockey_invite_recipients_target_idx
  on public.rockey_invite_recipients(target_user_id,created_at desc);

alter table public.rockey_invite_recipients enable row level security;
drop policy if exists rockey_invite_recipients_read_participants on public.rockey_invite_recipients;
create policy rockey_invite_recipients_read_participants
  on public.rockey_invite_recipients for select to authenticated
  using (
    target_user_id=(select auth.uid())
    or invited_by=(select auth.uid())
    or exists (
      select 1 from public.rockey_invites i
      where i.id=rockey_invite_recipients.invite_id
        and i.host_user_id=(select auth.uid())
    )
  );

revoke all on public.rockey_invite_recipients from anon,authenticated;
grant select on public.rockey_invite_recipients to authenticated;
grant all on public.rockey_invite_recipients to service_role;
