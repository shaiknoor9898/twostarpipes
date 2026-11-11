-- READ ONLY. Metadata only. Existing permissive Storage policies need live review.
-- This does not inspect bucket rows; use the guarded prerequisite step in the plan.
SELECT 'storage policy' AS check_type, policyname AS object_name,
  jsonb_build_object('roles', roles, 'command', cmd, 'using', qual,
    'check', with_check) AS details
FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
UNION ALL
SELECT 'default grants', pg_get_userbyid(d.defaclrole),
  jsonb_build_object('schema', coalesce(n.nspname, '(all schemas)'),
    'object_type', d.defaclobjtype,
    'grantee', CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END,
    'privilege', acl.privilege_type)
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) acl
WHERE d.defaclobjtype IN ('r', 'f')
  AND (d.defaclnamespace = 0 OR n.nspname IN ('public', 'storage'))
ORDER BY check_type, object_name;
