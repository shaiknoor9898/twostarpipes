# Phase 1 quotation security review

Reviewed branch: fix/quotation-supabase-security. No separate authoritative Phase 1 checklist was found; the inventory below is based on the existing review and requested protections. Scope is repository code and migration drafts, not live infrastructure. SQL was executed only against a disposable in-memory embedded PostgreSQL fixture. No connected/staging/production SQL was run, no credentials were exposed, no branches were merged and nothing was deployed.

| Task | Before this work | Current state |
| --- | --- | --- |
| Shared client/server validation | Implemented | Retained; separate bounded challenge-token schema added |
| Duplicate-click guard and accessible field errors | Implemented | Retained; challenge required and renewed on every attempt |
| Public-key validation and lazy Supabase browser client | Implemented | Retained; privileged public credentials rejected |
| Generic failures, safe logging and insert timeout | Implemented | Retained; no lead/token/key logging |
| Bot prevention | Missing | Turnstile widget and server Siteverify, strict success/action/hostname checks; fail closed |
| Persistent abuse limits | Missing | Atomic Redis EVAL counters via HTTPS, shared across Worker instances; fail closed |
| Direct REST bypass prevention | Missing | Server uses dedicated expiring quote_writer JWT; SQL draft removes public insertion privileges |
| DB field constraints and least-privilege RLS | Partial baseline INSERT policy | Versioned drafts pass embedded PostgreSQL tests; not applied to connected infrastructure |
| Automated application security tests | Local tests existed | 131 tests passing, including protections and widget lifecycle |
| Live policies, grants, views and functions audit | Not inspected | Still manual; preflight script supplied |
| External service and database integration tests | Not performed | Embedded PostgreSQL checks pass; live provider/Auth/Storage verification remains manual |

## Design and limits

The generated build targets Cloudflare Workers with nodejs_compat and compatibility date 2026-11-10. Server secrets are read lazily inside requests through process.env. Redis uses HTTPS and a single atomic Lua INCR/EXPIRE script, never process memory or Cloudflare KV eventual consistency. Use a dedicated Upstash Redis database with non-evicting storage and persistence enabled; do not use a read-only token. Avoid sharing the quotes:v1 namespace across staging and production by using separate databases.

Limits are fixed windows beginning at the first request: 100 validated-form attempts per 60 seconds globally, then 5 verified submissions per 900 seconds per normalized phone. Verified tokens are also claimed with atomic Redis SET NX EX (600 seconds) before any insertion, preventing concurrent token replay across instances. Token keys are HMACs; token contents are not stored. Redis Lua and SET commands execute on the shared service, so server restarts do not reset budgets or claims. Phone keys are HMAC-SHA256 with a server-only random secret; raw phone numbers are not stored in Redis. No client IP or forwarding header is trusted. Global exhaustion stops before Siteverify; phone limits are checked after verification. Rejected database writes consume budget. Changing the HMAC secret resets phone buckets and token replay claims; coordinate rotation accordingly. These defaults need business approval and load testing. Distributed attackers can exhaust the global budget and deny legitimate submissions; configure an edge per-IP WAF rate rule for the server-function route once its deployed path is confirmed. Phone aliases/country-code variations are not a strong identity boundary.

Turnstile tokens are bounded to 2048 characters and sent only to Siteverify, not inserted into the database. The server requires success=true, action=quote and an exact configured hostname. Siteverify checks expiry and prior redemption; because redemption can converge across Cloudflare locations, the independent Redis claim prevents overlapping successful verification responses from causing two inserts. Tests simulate rejection responses and a shared Redis service, not the live providers. Tokens are discarded and the widget remounted after every completed attempt. Missing config, script failure, expired challenge, Redis failure, malformed responses and verification errors never permit insertion. There is no production bypass or test-secret default.

The public Supabase apikey identifies the project; the server adds a signed, expiring quote_writer Bearer JWT. The app checks its role and expiry to catch misconfiguration; Supabase verifies its signature. No service-role/bypass-RLS credential is accepted for submission. The JWT signing key must never be supplied to the app. Before the SQL draft is applied, the old anonymous INSERT route remains a bypass. The new code and database changes must be staged together. The previous anonymous-insert design cannot enforce server-side anti-abuse controls.

The SQL drafts revoke both table and column public grants, force RLS, replace the known public policy with a writer-only INSERT policy, and grant only eight writable columns. Public reads/updates/deletes remain denied. Caller-supplied id/created_at are denied. Constraints cover nonblank names, phone shape/digit count, customer/product allowlists and optional field lengths; SQL email validation is deliberately coarse, while application Zod validation is stricter. Existing rows are preserved with NOT VALID constraints, then validated separately. Unknown policies or an existing writer role abort the migration for review. Drafts are intentionally not silently rerunnable. Views, SECURITY DEFINER functions, inherited privileges and unrelated roles still require a live audit.

## Manual setup and staging sequence

1. Create separate staging and production Turnstile widgets with approved exact hostnames. Put the public site key in VITE_TURNSTILE_SITE_KEY at build time; place TURNSTILE_SECRET_KEY and comma-separated TURNSTILE_HOSTNAMES in server secrets. Use a real staging widget to test hostname/action checks. Never enable production test keys or localhost hostnames.
2. Provision a persistent, non-evicting Upstash Redis database per environment. Configure HTTPS UPSTASH_REDIS_REST_URL, server-only UPSTASH_REDIS_REST_TOKEN and a random QUOTE_RATE_LIMIT_SECRET of at least 32 characters. Set service quotas/alerts; test simultaneous requests from separate Worker instances and recovery after window expiry/outage. Missing Redis intentionally blocks leads.
3. Inspect a disposable staging copy using 000_quote_preflight.sql. Audit live policies, all table/column grants, role memberships, views and executable SECURITY DEFINER functions for lead access. Back up configuration and data. Confirm product names against src/lib/site.ts.
4. Have a database owner review and apply 001_quote_hardening.sql to staging only, then execute: psql -v ON_ERROR_STOP=1 -f security/quote-rls-check.sql. Fixtures are rolled back. Confirm anon and authenticated REST requests cannot insert/read/update/delete, and the dedicated writer can insert without returning lead data.
5. Provision an expiring, project-trusted JWT with role=quote_writer through an approved offline signing process (imported signing key or supported project JWT signing configuration). Store only that JWT as SUPABASE_QUOTE_WRITER_KEY; never a signing key, service-role key or secret API key. Establish rotation before expiry and test a real staging insert. Modern project-managed private signing keys may not be exportable; an operator must select a supported signing method. Grant role membership to authenticator only, never anon/authenticated.
6. On staging, test each invalid DB field directly under quote_writer, each privileged-column attempt, and existing-data validation with 002_validate_constraints.sql. If old rows violate constraints, investigate and repair with owner approval; do not delete leads or disable constraints automatically.
7. Supply same-project SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY and the other server variables from .env.example through deployment secrets. The generated Worker compatibility settings support process.env. VITE values are public and require a rebuild. If a CSP is added/managed externally, permit challenges.cloudflare.com for the widget script/frame and its required connections. Exercise real challenge success, failure, expiry, replay, network timeout and Redis exhaustion in staging.
8. Before any later production rollout, coordinate application configuration and database cutover in a maintenance window: public inserts must not remain enabled, and the new writer role must exist before accepting new form traffic. No rollout is authorized or performed here. On failure keep submission closed and retain the phone fallback; do not restore anonymous insert as a quick rollback. Monitor generic failure counts, Redis budget exhaustion and JWT expiry without logging leads or credentials.

Request IDs now survive retries in the same form instance. Draft 004 adds a unique request_id constraint; a conflict on that specific constraint is acknowledged as an already-stored request without another INSERT notification. A new form instance/tab still permits another enquiry, so this is not identity-based or exactly-once lead deduplication.

## Validation

- npm.cmd test: PASS, 131 tests across 12 files.
- npx.cmd tsc --noEmit: PASS.
- Targeted ESLint over all changed/new TypeScript source and tests: PASS.
- npm.cmd run lint: PASS, zero errors and six existing UI fast-refresh warnings. Existing formatting failures were corrected with ESLint/Prettier; those extra files are marked in CHANGES.md.
- npm.cmd run build: PASS, Cloudflare production output generated locally. Existing dependency deprecation/chunk-size warnings remain.
- SQL drafts: PASS in disposable PGlite PostgreSQL with synthetic Auth/Storage schemas, roles and fixtures, including RLS, grants, constraints, triggers, uploads, outbox leasing and idempotency. This does not prove live Supabase configuration.
- Playwright: PASS, five local browser scenarios at 390/768/1440 pixels, navigation, search, form validation, reduced motion, keyboard skip link and rejected login. External requests blocked.
- Public bundle boundary: PASS; server-only credential variable references absent from generated client JavaScript.
- Live Cloudflare / Redis / Resend / Supabase Auth and Storage: NOT RUN; owner configuration and staging verification remain required.

## Sources

- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/workers/configuration/environment-variables/
- https://upstash.com/docs/redis/features/restapi
- https://supabase.com/docs/guides/auth/jwts
- https://supabase.com/docs/guides/auth/signing-keys
- https://supabase.com/docs/guides/database/postgres/row-level-security

For local development, load server-only variables explicitly: `node --env-file=.env node_modules/vite/bin/vite.js`. Vite loads VITE variables itself; do not assume `npm run dev` loads non-VITE server secrets from .env. The production Worker uses configured runtime secrets instead.

## Latest follow-up review

Retained the existing form fields, layout, validation, feedback and safe database error handling. Added the shared token replay claim and a test exercising concurrent requests through separately loaded server modules against a simulated persistent Redis service. Added widget recovery, timeout, stale-callback and widget-API-failure tests. Widget success now clears its prior error message; callbacks from removed widgets are ignored. Fixed the public Supabase client fallback to avoid referencing process in a browser where the VITE key is missing. Required variables remain those listed in .env.example; no new dependency or secret is needed for replay protection.

## Expanded implementation checkpoints

See [../docs/STATUS.md](../docs/STATUS.md) for all eight phases and [../docs/LAUNCH.md](../docs/LAUNCH.md) for the complete variable matrix, staging sequence, production approval checklist, recovery and Git review instructions. Draft 003 adds allowlisted admin access, least-privilege enquiry management, audit history, published products, restricted uploads, notification settings and an outbox with due-follow-up deduplication. Draft 004 adds form request IDs. All remain unapplied to any connected database. Public customers still submit without Auth through the protected server gateway.

The original Phase 1 table describes the initial quotation checkpoint. Current SQL test results and the broader features supersede earlier statements about unexecuted local database checks. Use quote-rls-check.sql BEFORE draft 003, and admin-rls-check.sql AFTER drafts 003/004. Existing Auth/Storage default policies must still be inspected in live staging: the embedded fixture intentionally models only the documented subset.

## Restricted staging bootstrap clarification

The owner supplied a transcript describing a ten-column staging table created without the original public grants/policy, with RLS enabled and forced. The live state has not been independently verified. Migration 001 already supports this state: its policy preflight accepts zero policies, and DROP POLICY IF EXISTS does not require the old policy. A dedicated embedded PostgreSQL regression test now checks this bootstrap, writer permissions/constraints and preservation of an existing synthetic lead. See [RESTRICTED_STAGING.md](RESTRICTED_STAGING.md) for the read-only inspection and reviewed next-step sequence. No connected SQL was executed.

The current preflight-only review is in [STAGING_PLAN.md](STAGING_PLAN.md), with eleven
single-result-set read-only queries under staging-checks/. Those queries now execute
inside database-enforced read-only transactions in the local regression suite,
covering expected metadata before 001 and after 001-004. This adds evidence for the
operator queries without verifying any live project. Migration 003 has now been revised locally: it uses read-only bucket prerequisite checks and rejects unknown write policies. Supported Dashboard/API bucket setup and live policy/ownership verification still require approval.

## Pending-work completion checkpoint (local only)

Migration 003 no longer INSERTs/UPDATEs/DELETEs managed bucket metadata. Its preconditions reject missing/private/wrong-size/wrong-MIME buckets and existing Storage write policies. Tests install an error-raising metadata write guard to prove the migration only reads bucket records. A SECURITY DEFINER trigger with a fixed search_path now accepts preserved static product names or published managed names and rejects arbitrary/draft-only custom names, without granting public quote access.

New regression cases cover 002 failure/rollback across all field groups, 004 transactional failure on an index-name conflict, form retry request IDs, stale follow-up cancellation and invalid lease acknowledgements. Notification responses/logs expose only delivered/failed counts. Asset URL validation rejects embedded credentials and aligns brochures with HTTPS database requirements. GET /api/health reports liveness only. No live preflight results, environment credentials or provider integration were assumed verified. See LOCAL_COMPLETION_REPORT.md for the exact status matrix, files and next role query.
