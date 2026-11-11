# Continuing from the restricted staging bootstrap

The pasted conversation describes an existing ten-column quotation table with public
privileges revoked, no policies, and RLS enabled/forced. Those live settings have not
been independently inspected here.

For the current complete review, use [STAGING_PLAN.md](STAGING_PLAN.md). It provides
separate read-only SQL Editor checks, prerequisites/conflicts, and gated verification
after migrations 001-004. The owner now reports status verified as PostgreSQL 17.11, ten columns, both RLS flags true and zero policies. Share the existing role verification result next, or run `staging-checks/02_roles.sql` if unavailable. Do not execute 001 before the preflight results have been reviewed.

The statement that `001_quote_hardening.sql` requires the original anonymous policy
is incorrect. Its policy check accepts zero policies, and `DROP POLICY IF EXISTS`
accepts an absent original policy. Re-enabling RLS/FORCE RLS is safe when already
enabled. No alternate migration and no restoration of anonymous INSERT are needed.

## Next step: read-only inspection

Run `security/000_quote_preflight.sql` on the isolated staging project and inspect the
entire result. It reports RLS flags, policies, table/column grants, constraints and
role flags without exporting lead details. Check in particular:

- `quote_requests` has the original ten columns and both RLS flags are true.
- There are zero policies, or only the original policy named
  `Anyone can submit a quote request`. Any other policy requires review.
- `quote_writer` does not already exist. If it exists, stop: do not drop or reuse
  it blindly, and do not rerun the migration after a partially understood setup.
- None of `quote_name_check`, `quote_phone_check`, `quote_customer_check`,
  `quote_product_check` or `quote_optional_check` already exists.
- Public roles have no unexpected table, column or inherited privileges. Owner
  privileges are expected; inspect role memberships separately if grants differ.

Do not rerun `drizzle/migrations/0000_migration.sql`: the table already exists, and
that historical migration grants public INSERT.

## Reviewed hardening step, after inspection

For this supported starting state, the existing `001_quote_hardening.sql` is the
complete next migration. It creates the restricted role, grants only insertable
lead columns, denies public table/column access, creates writer-only INSERT RLS
and adds constraints for new writes. It preserves existing leads and does not
grant the writer public reads or service-role access. It is transactional and
deliberately fails on conflicting existing objects instead of silently changing them.

No staging execution was performed here. After the owner reviews the preflight
results and chooses to apply it to staging, run the rollback-only
`quote-rls-check.sql`, then `002_validate_constraints.sql`. Existing invalid rows
can make validation fail; investigate rather than deleting data or disabling
constraints. Later admin and request-ID migrations have separate prerequisites;
follow `docs/LAUNCH.md` rather than running the entire SQL folder at once.

The quotation form also needs a project-trusted expiring `quote_writer` JWT,
Turnstile/Redis configuration, and later application-required schema migrations.
Running 001 alone does not complete application setup.

## Local evidence

`src/test/database.test.ts` contains a dedicated embedded PostgreSQL regression
test reproducing this restricted bootstrap, including a synthetic existing lead,
zero policies and forced RLS. It executes 001, the role/constraint assertions and
002, and verifies that the original row ID is preserved. This is local fixture
evidence, not verification of the live Supabase project.
