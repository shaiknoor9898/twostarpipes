-- READ ONLY. Initially expect the primary key, but no quote_* hardening checks.
SELECT conname AS constraint_name, contype AS constraint_type,
  convalidated AS validated, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = to_regclass('public.quote_requests')
ORDER BY conname;
