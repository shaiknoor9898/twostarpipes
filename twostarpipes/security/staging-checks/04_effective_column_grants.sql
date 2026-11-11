-- READ ONLY. These checks include inherited/PUBLIC and table-level privileges.
-- Privileges alone do NOT prove row access; RLS must also permit the operation.
SELECT r.rolname AS role_name, a.attname AS column_name,
  has_column_privilege(r.oid, c.oid, a.attnum, 'SELECT') AS can_select_column,
  has_column_privilege(r.oid, c.oid, a.attnum, 'INSERT') AS can_insert_column,
  has_column_privilege(r.oid, c.oid, a.attnum, 'UPDATE') AS can_update_column,
  has_column_privilege(r.oid, c.oid, a.attnum, 'REFERENCES') AS can_reference_column,
  has_table_privilege(r.oid, c.oid, 'DELETE') AS can_delete_table,
  has_table_privilege(r.oid, c.oid, 'TRUNCATE') AS can_truncate_table
FROM pg_class c
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
CROSS JOIN pg_roles r
WHERE c.oid = to_regclass('public.quote_requests')
  AND r.rolname IN ('anon', 'authenticated', 'quote_writer', 'notification_worker')
ORDER BY r.rolname, a.attnum;
