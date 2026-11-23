create index if not exists rockey_calendar_day_comments_author_idx
 on public.rockey_calendar_day_comments(author_id);
create index if not exists rockey_calendar_day_mentions_room_idx
 on public.rockey_calendar_day_comment_mentions(room_id);
create index if not exists rockey_calendar_day_reads_reader_idx
 on public.rockey_calendar_day_comment_reads(reader_id);
