-- READ ONLY. Run this single query first in the confirmed STAGING project.
SELECT
  current_database() AS database_name,
  current_user AS executing_role,
  current_setting('server_version') AS postgres_version,
  to_regclass('public.quote_requests') AS quotation_table,
  pg_get_userbyid(c.relowner) AS table_owner,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls,
  (SELECT count(*) FROM pg_attribute a
   WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped) AS column_count,
  (SELECT count(*) FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'quote_requests') AS policy_count
FROM (VALUES (to_regclass('public.quote_requests'))) AS target(oid)
LEFT JOIN pg_class c ON c.oid = target.oid;
