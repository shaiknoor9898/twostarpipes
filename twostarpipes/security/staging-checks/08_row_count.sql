-- READ ONLY. No customer field values are returned. Exact COUNT can scan the table.
-- If row_filtering_applies=true this is only a visible-row count, not a total.
SELECT current_user AS executing_role,
  row_security_active('public.quote_requests'::regclass) AS row_filtering_applies,
  count(*) AS rows_visible_to_current_role
FROM public.quote_requests;
