-- READ ONLY. Raw ACL includes PUBLIC; role_table_grants can omit that grantee.
SELECT CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END AS grantee,
  acl.privilege_type, acl.is_grantable,
  pg_get_userbyid(acl.grantor) AS grantor
FROM pg_class c
CROSS JOIN LATERAL aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
WHERE c.oid = to_regclass('public.quote_requests')
ORDER BY grantee, acl.privilege_type;
