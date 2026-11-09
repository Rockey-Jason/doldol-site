# Doronium Factory — Security Hardening Record

- Checked: 2026-11-03
- Supabase project: `scttowfhygcpdirrekqm` (돌이사이트)
- Scope: `public.dori_cloud_storage`, the per-user cloud-save table used by Doronium Factory.
- Important: this record describes the live database state observed after the ACL correction. It does not claim that every Supabase security finding has been resolved.

## Verified live database controls

| Control | Verified state |
|---|---|
| Row Level Security | Enabled |
| SELECT | `authenticated` only; `auth.uid() = user_id` |
| INSERT | `authenticated` only; `WITH CHECK auth.uid() = user_id` |
| UPDATE | `authenticated` only; both `USING` and `WITH CHECK` enforce `auth.uid() = user_id` |
| Anonymous table grants | None |
| Authenticated table grants | SELECT, INSERT, UPDATE only |
| Authenticated DELETE / TRUNCATE / REFERENCES / TRIGGER | Revoked |
| Save row uniqueness | Primary key on `(user_id, storage_key)` |

The live privilege correction was applied transactionally:

```sql
BEGIN;
REVOKE ALL PRIVILEGES ON TABLE public.dori_cloud_storage FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.dori_cloud_storage TO authenticated;
COMMIT;
```

The grants and policies were queried again after the change. The authenticated role had only SELECT, INSERT and UPDATE; the row-owner policies and primary key remained in place. PostgreSQL's `postgres` and Supabase `service_role` privileges were intentionally left unchanged.

## Remaining security work

1. **Cloud save concurrency:** the browser still uses an upsert/last-write-wins flow. Add a server-enforced revision/CAS protocol and conflict recovery before claiming safe multi-device concurrent saves.
2. **Function execution audit:** Supabase Security Advisor reports multiple functions in the exposed `public` schema with `SECURITY DEFINER` execution available to authenticated users. Review each function body, ownership checks, fixed `search_path`, grants and intended caller before revoking or changing anything. Do not mass-revoke: several RPCs are used by existing site features.
3. **Leaked password protection:** Supabase Auth's leaked-password protection was reported disabled. Enable and test it in Auth settings.
4. **Server-authoritative economy:** local single-player state remains user-editable by design. Any leaderboard, shared inventory, public reward, trade or competitive result must be recomputed/validated server-side.
5. **Release test hooks:** `window.__doroniumFactoryTest` is now gated to localhost/loopback plus `?e2e`; it is not enabled on GitHub Pages. Keep test helpers out of any future production bundle.
6. **Save validation:** checksums detect accidental corruption but are not signatures. Bound payload size/depth and validate all IDs, numbers, references and state transitions on load.

## Scope limitation

This live ACL update has been verified in the database, but it has not yet been represented as a checked-in Supabase migration. Add it to the project's migration workflow before recreating or resetting the database. The game and database changes have separate deployment lifecycles.
