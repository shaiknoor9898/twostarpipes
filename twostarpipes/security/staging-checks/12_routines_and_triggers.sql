-- READ ONLY, one result set. Definitions/bodies and customer data are not selected.
-- Review unexpected existing routines, elevated owners, grants and triggers before 001.
SELECT 'function' AS object_type,
  format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS object_name,
  jsonb_build_object('owner', pg_get_userbyid(p.proowner),
    'security_definer', p.prosecdef, 'search_path',
      (SELECT option FROM unnest(p.proconfig) AS option WHERE option LIKE 'search_path=%' LIMIT 1),
    'acl', coalesce(p.proacl, acldefault('f', p.proowner))::text) AS details
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f'
UNION ALL
SELECT 'trigger', format('%I.%I.%I', n.nspname, c.relname, t.tgname),
  jsonb_build_object('enabled', t.tgenabled,
    'function', format('%I.%I', fn.nspname, p.proname),
    'function_owner', pg_get_userbyid(p.proowner), 'security_definer', p.prosecdef)
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace fn ON fn.oid = p.pronamespace
WHERE NOT t.tgisinternal AND n.nspname IN ('public', 'storage')
ORDER BY object_type, object_name;
