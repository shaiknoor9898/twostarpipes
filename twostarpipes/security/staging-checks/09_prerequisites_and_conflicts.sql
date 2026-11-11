-- READ ONLY. Missing prerequisites block 003; existing future objects need review.
SELECT category, object_name, object_oid IS NOT NULL AS present
FROM (VALUES
  ('prerequisite', 'auth.users', to_regclass('auth.users')::oid),
  ('prerequisite', 'auth.uid()', to_regprocedure('auth.uid()')::oid),
  ('prerequisite', 'storage.buckets', to_regclass('storage.buckets')::oid),
  ('prerequisite', 'storage.objects', to_regclass('storage.objects')::oid),
  ('future table', 'public.admin_members', to_regclass('public.admin_members')::oid),
  ('future table', 'public.admin_audit', to_regclass('public.admin_audit')::oid),
  ('future table', 'public.products', to_regclass('public.products')::oid),
  ('future table', 'public.notification_settings', to_regclass('public.notification_settings')::oid),
  ('future table', 'public.notification_outbox', to_regclass('public.notification_outbox')::oid),
  ('future index', 'public.quote_status_created_idx', to_regclass('public.quote_status_created_idx')::oid),
  ('future index', 'public.quote_follow_up_idx', to_regclass('public.quote_follow_up_idx')::oid),
  ('future function', 'public.is_admin()', to_regprocedure('public.is_admin()')::oid),
  ('future function', 'public.bounded_product_lines(text[])', to_regprocedure('public.bounded_product_lines(text[])')::oid),
  ('future function', 'public.check_quote_product()', to_regprocedure('public.check_quote_product()')::oid),
  ('future function', 'public.record_admin_change()', to_regprocedure('public.record_admin_change()')::oid),
  ('future function', 'public.touch_updated_at()', to_regprocedure('public.touch_updated_at()')::oid),
  ('future function', 'public.admin_metrics()', to_regprocedure('public.admin_metrics()')::oid),
  ('future function', 'public.queue_enquiry_notification()', to_regprocedure('public.queue_enquiry_notification()')::oid),
  ('future function', 'public.claim_notification_jobs(text,text)', to_regprocedure('public.claim_notification_jobs(text,text)')::oid),
  ('future function', 'public.finish_notification_job(uuid,uuid,boolean,text)', to_regprocedure('public.finish_notification_job(uuid,uuid,boolean,text)')::oid)
) AS checks(category, object_name, object_oid)
ORDER BY category, object_name;
