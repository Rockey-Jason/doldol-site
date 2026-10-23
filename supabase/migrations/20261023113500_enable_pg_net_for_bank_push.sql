-- Supabase's pg_net extension queues HTTPS calls after the current transaction commits.
create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;
