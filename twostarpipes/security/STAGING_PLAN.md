# Supabase staging review and execution gates

## Current status: preparation only

The owner now reports PostgreSQL 17.11, the original ten-column quotation table, RLS and
FORCE RLS enabled, public INSERT revoked and zero quotation policies. These are
reported facts, not independently verified live results. No Supabase connection,
SQL execution, deployment or Git publishing is authorized by this plan.

STOP before migration 001. Obtain and review the read-only preflight results first.
The execution steps below are a plan for later explicit approval, not instructions
to run all migrations now.

## How to use Supabase SQL Editor

1. Open the Supabase Dashboard and explicitly select the isolated staging project.
   Check its project name/reference in the dashboard; `current_database()` is often
   `postgres` on multiple projects and does not identify staging by itself.
2. Open **SQL Editor**, then **New query**. Check the selected database/role; use
   the owner/operator context intended for metadata inspection, normally `postgres`.
   Do not switch to `service_role`, reveal keys or change role permissions.
3. Open `security/staging-checks/01_status.sql` locally. Copy that file's complete
   contents, paste into the new query and run it. This is one SELECT and returns
   one result set. Save the query as `Staging preflight 01 - status` if useful.
4. If the status row is already verified, share the existing role-query results
   next (or run `02_roles.sql` if unavailable); do not repeat completed status work.
   Do not execute 001. Run each remaining
   numbered check in a separate new query and share each complete metadata result,
   or say explicitly `0 rows` when appropriate. No passwords, JWTs, API keys,
   connection strings or customer records are needed.
5. If a query errors, stop that step and share the error text with any credentials
   redacted. A permission error is a blocker, not a reason to disable RLS.

The existing `000_quote_preflight.sql` is read-only, but it contains seven SELECTs
inside a read-only transaction followed by ROLLBACK. A client can show only the
last result pane, making the inspection incomplete. The separate files below
remove that ambiguity. Its original grants query also relies on information-schema
visibility; the new ACL and effective-column checks add PUBLIC and inherited grants.

| Check file | Expected before 001 |
| --- | --- |
| `01_status.sql` | Correct table, PostgreSQL 17, 10 columns, RLS=true, FORCE=true, policy_count=0 |
| `02_roles.sql` | `anon`, `authenticated`, `authenticator` exist; both new custom roles absent; public roles are not superuser/bypass-RLS roles. Inspect operator capabilities and every related membership |
| `03_table_grants.sql` | No PUBLIC/anon/authenticated quotation privileges; owner privileges expected. Inspect other grantees instead of automatically revoking managed roles |
| `04_effective_column_grants.sql` | All displayed privileges false for anon/authenticated, including inherited/table-level rights; no custom-role rows yet |
| `05_policies.sql` | Zero rows for this reported restricted setup |
| `06_constraints.sql` | Existing primary key expected; none of the five `quote_*_check` names or `quote_request_id_unique` present |
| `07_columns.sql` | Original UUID/timestamp/text types, defaults and nullability; no status, internal_notes, follow_up_at, updated_at or request_id yet |
| `08_row_count.sql` | Record the baseline count; do not assume zero. If row_filtering_applies=true, this is only the operator-visible count and cannot establish the total |
| `09_prerequisites_and_conflicts.sql` | Auth/Storage prerequisites present; future public tables, functions and indexes absent |
| `10_storage_and_defaults.sql` | Review existing Storage policies and default table/function grants. Zero rows is acceptable on a minimal local fixture; managed Supabase commonly has defaults |
| `11_legacy_constraint_counts.sql` | Run before 002 only: zero invalid-field counts, with row_filtering_applies=false for a complete count. Any nonzero value blocks validation until reviewed |
| `12_routines_and_triggers.sql` | Review existing public functions, owners, SECURITY DEFINER flags, search paths, effective ACLs and public/Storage triggers. No function bodies, keys or customer records are selected |

An unexpected result means stop and review. Do not recreate public INSERT, delete
objects or use `IF NOT EXISTS` to conceal an unknown earlier installation.

## Findings and prerequisites

- **001 supports zero policies.** Its preflight rejects policies with unexpected
  names; zero rows passes. `DROP POLICY IF EXISTS` does not require an old policy.
  Re-enabling RLS/FORCE RLS leaves the reported settings enabled. An existing
  `quote_writer` role deliberately aborts the transaction. Existing check names,
  wrong table ownership/schema, missing authenticator, or insufficient role-creation
  and grant rights also block it. None of these calls for restoring public access.
- **001-004 are versioned, not repeatable repair scripts.** 002 can be repeated to
  validate the same checks, but 001/003/004 create objects and intentionally fail
  on collisions. Each has a transaction and lock/statement timeouts. If a previous
  attempt failed, confirm rollback and inspect its error before retrying unchanged.
- **003's Storage revision is complete locally.** It no longer writes bucket
  metadata. It checks an already configured bucket and aborts before application
  DDL if its name, public setting, size or MIME list differs. It also blocks any
  existing Storage write policy until reviewed. Live approval and supported
  Dashboard/API bucket creation are still pending; follow STORAGE_SETUP.md.
- **003 is broader than quotation hardening.** It creates five public tables,
  functions, triggers, indexes and a custom worker role, and requires a separately
  configured public product-assets bucket. PostgreSQL 17 supports its
  `UNIQUE NULLS NOT DISTINCT`. Auth/Storage must
  exist, object names must be free, and the operator must be permitted to create
  the bucket/policy. Do not alter Supabase-managed table ownership as a workaround.
- **Storage conflicts need their own review.** Existing permissive policies on
  `storage.objects` can combine with the new policy; adding a restrictive-looking
  policy does not cancel another permissive one. The migration stops on existing
  write policies for explicit review, even if intended for another bucket. Do not
  delete policies to bypass that gate. An existing correctly configured bucket is
  now required, not a naming conflict. The local fixture does not model
  the complete hosted Storage service or managed ownership.
- **003 changes product validation.** It replaces the fixed catalogue-name CHECK
  with a bounded nonblank-name CHECK so managed products can be submitted. The
  database also has an INSERT/product-change trigger that allows the preserved
  static names or published managed product names, and rejects arbitrary or draft-only
  custom names. The server additionally restricts choices to the active catalogue.
  Static aliases remain accepted at the database layer for staged rollout/rollback.
  It does not turn off RLS or restore public INSERT. The replacement CHECK starts
  NOT VALID again even though 002 validated the old definition.
- **Admin access is intentional, not public access.** After 003, authenticated has
  SELECT and three UPDATE-column grants. `is_admin()` restricts those operations
  to Auth users in the private allowlist. Nonadmins must still see zero customer
  records. A grant check alone cannot verify row visibility.
- **004 is required by the current form code.** `saveQuote` always inserts
  `request_id`. 001 alone therefore does not make the current form compatible.
  003 adds the admin fields; 004 adds the request column/default/unique constraint
  and grants its insertion to the writer. Do not enable submissions mid-sequence.
- **Index/validation work is not lock-free.** 002 scans existing data; 003 creates
  indexes and 004 builds a unique index. On a large table the timeouts can abort
  safely. Do not remove timeouts, delete data or reset the database to get past it.
- **Manual SQL is not migration-history reconciliation.** These drafts are outside
  the automatic migration directory. SQL Editor does not update a Drizzle journal
  or Supabase CLI history. Record filenames, reviewed revision, date and results;
  agree a future migration-history workflow before any CLI migration push. Do not
  rerun historical 0000 against this existing table.

Before approving 003, the following additional queries are useful. Run the bucket
query only after check 09 confirms Storage exists; they remain read-only:

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id = 'product-assets';
```

Expected before bucket setup on a fresh project: zero rows. If present, review
without deleting it. After separately approved Dashboard/API setup, 003 requires
this exact bucket configuration rather than inserting its metadata:
public=true, 5242880 bytes, and only image/jpeg, image/png, image/webp,
application/pdf. No private or customer files belong in this public bucket.

```sql
SELECT n.nspname AS schema_name, c.relname,
       pg_get_userbyid(c.relowner) AS owner,
       pg_has_role(current_user, c.relowner, 'USAGE') AS operator_has_owner_role,
       (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS operator_is_superuser
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.oid IN (to_regclass('public.quote_requests'),
               to_regclass('storage.objects'), to_regclass('storage.buckets'));
```

Operator ownership/capabilities on managed Storage may differ. If policy creation
rights are unclear, pause for the supported Supabase workflow; do not escalate
roles or change ownership on the live project.

## Planned execution and verification, only after approval

### Gate 1: migration 001

After the complete preflight is reviewed and explicit staging execution is approved,
run the complete unchanged transaction in `001_quote_hardening.sql` in a new SQL
Editor query. Do not select just the middle of it. Do not append another migration.

Re-run checks 01-08 separately. Expected:

- RLS/FORCE both true; still 10 columns; exactly `quote_writer_insert` policy,
  INSERT only, for quote_writer.
- quote_writer exists, NOLOGIN, NOSUPERUSER, NOBYPASSRLS, NOINHERIT; membership is
  granted to authenticator, never anon/authenticated. No unexpected memberships.
- anon/authenticated still have no quotation privileges. Writer INSERT is true
  only for the eight lead fields; not id/created_at. Writer reads/updates/deletes
  remain denied. INSERT is a column grant, so table-level INSERT checks alone can
  misleadingly report false.
- Five named CHECKs exist with validated=false; new writes already obey them.
  The primary key stays validated. Compare the baseline row count in the same
  trustworthy operator context; constraints do not delete or rewrite leads.

The rollback-only `quote-rls-check.sql` performs actual fixture writes and role
switches, not just inspection. It needs separate approval for staging tests; it is
not part of today's read-only preflight. Its pre-admin assumptions apply before 003.

### Gate 2: migration 002

Approve and run `002_validate_constraints.sql` only after 001 and its checks pass.
If the table is nonempty, validity of those existing records is a prerequisite.
Use check 11 for aggregate-only diagnostics first; never export contact details.
On failure, stop and investigate without exporting customer fields or deleting data.

Re-run 01, 06 and 08. All five named CHECKs should now be validated=true; RLS,
policy/column counts and trusted baseline row count should be unchanged. A failed
validation transaction leaves 001's new-write protection in place.

### Gate 3: migration 003

The Storage revision and its local tests are complete. Resolve the live bucket,
broader prerequisites/conflicts and product-rule review above first. Only after
separate approval run `003_admin_catalogue_notifications.sql`. Do not
enable catalogue or notifications yet, and do not populate admin_members here.

Re-run 01-10. Expected quotation changes: 14 columns, 3 policies, admin SELECT/
UPDATE policies through `is_admin()`, and authenticated UPDATE only on status,
internal_notes and follow_up_at. Anonymous access and direct authenticated INSERT
remain denied. The writer gains no admin-field insertion rights. The replacement
product CHECK is validated=false; the other four named hardening checks remain
validated=true.

The following one-result-set queries verify new objects without reading leads,
recipient emails or internal notes:

```sql
SELECT c.relname, c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN
 ('admin_members','admin_audit','products','notification_settings','notification_outbox')
ORDER BY c.relname;
```

Expect five tables, all with RLS enabled. Their FORCE setting is not required by
this migration; owner-run SECURITY DEFINER functions intentionally mediate access.

```sql
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
  AND tablename IN ('admin_members','admin_audit','products',
                   'notification_settings','notification_outbox')
ORDER BY tablename, policyname;
```

Expect no direct admin_members policy, admin-only audit/settings/outbox policies,
and public SELECT only for published products. Storage should have only reviewed
policies; `admin_asset_insert` must target authenticated admins and product-assets.

```sql
SELECT (SELECT count(*) FROM public.admin_members) AS admin_count,
       (SELECT count(*) FROM public.products) AS product_count,
       (SELECT count(*) FROM public.notification_outbox) AS job_count,
       (SELECT count(*) FROM public.notification_settings) AS settings_rows,
       (SELECT enabled FROM public.notification_settings WHERE id) AS notifications_enabled;
```

On a new, quiescent setup expect 0 admins/products/jobs, one settings row, and false.
As with all counts, check operator row visibility/ownership; empty RLS-filtered
results under an unprivileged identity do not prove the underlying tables are empty.
Re-run the bucket query and expect public=true, 5242880-byte limit and only the
four reviewed JPEG/PNG/WebP/PDF MIME types.

```sql
SELECT event_object_table, trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('quote_requests','products','notification_settings')
ORDER BY event_object_table, trigger_name, event_manipulation;
```

Expect timestamp/audit hooks, the enquiry notification hook and settings audit.
Re-run the five CHECK validations in 002 later if approved to validate the new
product CHECK definition as well; do not misreport it as validated merely because
002 ran earlier. Role-isolation and real Auth/Storage tests remain required.

`admin-rls-check.sql` uses psql variables (`:'admin_uuid'`, `:'user_uuid'`) and is
NOT directly pasteable into SQL Editor. Its synthetic Auth users and rollback-only
writes require a separately approved test plan. Do not substitute customer IDs or
run it as today's read-only step.

### Gate 4: migration 004

After 003 and its checks are reviewed, approve and run
`004_submission_idempotency.sql`. This adds a nullable request_id, sets a default
for future inserts and creates a unique constraint without backfilling old rows.
It grants only that additional INSERT column to quote_writer.

Re-run 01, 04, 06, 07 and 08. Expect 15 columns, the same 3 quotation policies,
RLS/FORCE true, request_id nullable with gen_random_uuid() default, and validated
UNIQUE constraint `quote_request_id_unique`. Writer can insert that ninth column
but still cannot supply id/created_at, read leads, update or delete them. The
trusted row count must stay unchanged. Legacy null IDs are intentional.

The rollback-only idempotency fixture test is an additional approved test, not a
read-only inspection query. After all schema gates, arrange real role/JWT/RLS
and application smoke tests in staging before accepting any customer traffic.

## Application configuration compatibility

- Server Supabase URL/public key and browser VITE URL/key must point to this same
  staging project. Wrong-project values make role and schema checks meaningless.
- SUPABASE_QUOTE_WRITER_KEY must be a valid, expiring project-trusted JWT for the
  restricted role, not a service-role/secret key. Do not paste it in chat or SQL.
- Configure staging Turnstile site/secret keys and exact staging hostnames; the
  production-only hostnames in the example will reject staging challenges.
- Provision separate persistent, non-evicting Redis and a server-only HMAC secret.
  Missing CAPTCHA/Redis configuration intentionally blocks submission.
- Keep MANAGED_CATALOGUE=false and ANALYTICS_ENABLED=false initially. Import and
  verify the existing products only after 003, before opting in to managed mode.
- Leave notification settings disabled and the scheduler paused. Enabling delivery
  requires scoped notification_worker credentials, approved sender/recipients,
  provider and scheduler configuration, and explicit authorization to send tests.
- Admin Auth accounts/allowlist setup is a separate approved operation. Public
  customers still need no login; their submissions use the protected server path.
- The environment file itself was not inspected. Compatibility statements above
  identify required configuration, not a claim that live credentials are correct.

## Evidence and stopping point

Local PostgreSQL tests reproduce both the original migration and the restricted
zero-policy bootstrap and verify preserved fixture rows. Local tests use an
embedded database and synthetic Auth/Storage objects; they do not verify hosted
Supabase ownership, existing policies, privileges, JWT trust or provider behavior.

The basic status is owner-reported as verified. The next action is sharing the
actual role results (check 02), followed by the remaining read-only metadata checks.
No migration 001 execution is approved or performed
until those results have been reviewed.

References: PostgreSQL 17 [privilege inspection](https://www.postgresql.org/docs/17/functions-info.html),
[role memberships](https://www.postgresql.org/docs/17/catalog-pg-auth-members.html),
Supabase [managed permissions](https://supabase.com/docs/guides/platform/permissions),
[migration history](https://supabase.com/docs/guides/deployment/database-migrations),
[Storage schema guidance](https://supabase.com/docs/guides/storage/schema/design),
[supported bucket creation](https://supabase.com/docs/guides/storage/buckets/creating-buckets).
