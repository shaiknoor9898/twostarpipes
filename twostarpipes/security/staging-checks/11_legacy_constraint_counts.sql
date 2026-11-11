-- READ ONLY. Use after 001 / BEFORE 002, against the original fixed-catalogue rules.
-- No customer values returned. If row_filtering_applies=true these counts are incomplete.
-- This is NOT the managed-catalogue validator after 003; inspect its trigger/checks then.
SELECT
  row_security_active('public.quote_requests'::regclass) AS row_filtering_applies,
  count(*) AS rows_visible_to_current_role,
  count(*) FILTER (WHERE NOT (
    name=btrim(name) AND char_length(name) BETWEEN 1 AND 100 AND name ~ '[^[:space:]]'
  )) AS invalid_name,
  count(*) FILTER (WHERE NOT (
    char_length(phone) BETWEEN 6 AND 20 AND phone ~ '^\+?[0-9()[:space:]-]+$'
    AND char_length(regexp_replace(phone,'[^0-9]','','g')) BETWEEN 6 AND 15
  )) AS invalid_phone,
  count(*) FILTER (WHERE customer_type NOT IN
    ('farmer','dealer','wholesaler','contractor','other')) AS invalid_customer_type,
  count(*) FILTER (WHERE product NOT IN
    ('PVC Pipes','Agricultural Pipes','Casing Pipes','UPVC Pipes','Electrical Pipes',
     'Drip Pipes','Drip Fittings','Multiple products')) AS invalid_product,
  count(*) FILTER (WHERE NOT (
    (email IS NULL OR (char_length(email)<=255 AND (email='' OR email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')))
    AND (city IS NULL OR char_length(city)<=100)
    AND (quantity IS NULL OR char_length(quantity)<=100)
    AND (message IS NULL OR char_length(message)<=1000)
  )) AS invalid_optional_fields
FROM public.quote_requests;
