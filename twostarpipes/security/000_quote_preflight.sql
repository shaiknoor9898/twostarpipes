-- Read-only inspection for an operator; do not paste output containing leads.
-- SQL Editor: use staging-checks/01_status.sql through 10_storage_and_defaults.sql
-- one query at a time to keep every result visible and inspect effective/PUBLIC grants.
-- See STAGING_PLAN.md. Do not execute migration 001 before preflight review.
BEGIN READ ONLY;
SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid='public.quote_requests'::regclass;
SELECT policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='quote_requests';
SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='quote_requests';
SELECT grantee, column_name, privilege_type FROM information_schema.role_column_grants WHERE table_schema='public' AND table_name='quote_requests';
SELECT conname, convalidated, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.quote_requests'::regclass;
SELECT rolname, rolcanlogin, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN ('anon','authenticated','authenticator','quote_writer');
-- Count only; never export the existing leads into a review log.
SELECT count(*) AS existing_leads FROM public.quote_requests;
ROLLBACK;
