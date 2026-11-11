-- READ ONLY. Initial restricted staging result should contain ZERO rows.
SELECT policyname, permissive, roles, cmd, qual AS using_expression,
  with_check AS insert_update_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'quote_requests'
ORDER BY policyname;
