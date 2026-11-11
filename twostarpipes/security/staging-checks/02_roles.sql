-- READ ONLY. No password hashes or credentials are selected.
SELECT wanted.role_name,
  r.oid IS NOT NULL AS role_exists,
  r.rolcanlogin, r.rolsuper, r.rolcreaterole, r.rolinherit, r.rolbypassrls,
  coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'granted_role', granted.rolname, 'member', member.rolname,
      'admin_option', m.admin_option, 'inherit_option', m.inherit_option,
      'set_option', m.set_option) ORDER BY granted.rolname, member.rolname)
    FROM pg_auth_members m
    JOIN pg_roles granted ON granted.oid = m.roleid
    JOIN pg_roles member ON member.oid = m.member
    WHERE m.roleid = r.oid OR m.member = r.oid
  ), '[]'::jsonb) AS memberships
FROM (VALUES (current_user::text), ('anon'), ('authenticated'),
  ('authenticator'), ('quote_writer'), ('notification_worker')) AS wanted(role_name)
LEFT JOIN pg_roles r ON r.rolname = wanted.role_name
ORDER BY wanted.role_name;
