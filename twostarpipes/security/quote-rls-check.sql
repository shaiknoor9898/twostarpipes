-- Post-migration tests. Disposable staging only: psql -v ON_ERROR_STOP=1 -f security/quote-rls-check.sql
-- No persistent fixtures or grants. Any failed assertion aborts this transaction.
BEGIN;
DO $$ DECLARE r text; c text; BEGIN
 IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='public.quote_requests'::regclass) THEN RAISE EXCEPTION 'RLS not enforced'; END IF;
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF has_table_privilege(r,'public.quote_requests','SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Public table privilege for %',r; END IF;
  FOR c IN SELECT attname FROM pg_attribute WHERE attrelid='public.quote_requests'::regclass AND attnum>0 AND NOT attisdropped LOOP
   IF has_column_privilege(r,'public.quote_requests',c,'SELECT,INSERT,UPDATE') THEN RAISE EXCEPTION 'Public column privilege for %',r; END IF;
  END LOOP;
 END LOOP;
END $$;
SET LOCAL ROLE quote_writer;
INSERT INTO public.quote_requests(name,phone,product) VALUES ('Security fixture','1234567890','PVC Pipes');
DO $$ DECLARE item jsonb; expected text; actual text; lead public.quote_requests; BEGIN
 FOR item, expected IN SELECT * FROM (VALUES
  ('{"name":" "}'::jsonb,'quote_name_check'),
  ('{"phone":"------"}'::jsonb,'quote_phone_check'),
  ('{"phone":"1234567890123456"}'::jsonb,'quote_phone_check'),
  ('{"customer_type":"admin"}'::jsonb,'quote_customer_check'),
  ('{"product":"invented"}'::jsonb,'quote_product_check'),
  ('{"email":"bad"}'::jsonb,'quote_optional_check'),
  (jsonb_build_object('email',repeat('x',256)),'quote_optional_check'),
  (jsonb_build_object('name',repeat('x',101)),'quote_name_check'),
  (jsonb_build_object('city',repeat('x',101)),'quote_optional_check'),
  (jsonb_build_object('quantity',repeat('x',101)),'quote_optional_check'),
  (jsonb_build_object('message',repeat('x',1001)),'quote_optional_check')
 ) AS cases(payload,constraint_name) LOOP
  SELECT * INTO lead FROM jsonb_populate_record(NULL::public.quote_requests,
   '{"name":"Fixture","phone":"1234567890","customer_type":"farmer","product":"PVC Pipes"}'::jsonb || item);
  BEGIN
   INSERT INTO public.quote_requests(name,phone,email,city,customer_type,product,quantity,message)
   VALUES (lead.name,lead.phone,lead.email,lead.city,lead.customer_type,lead.product,lead.quantity,lead.message);
   RAISE EXCEPTION 'Invalid lead accepted for %',expected;
  EXCEPTION WHEN check_violation THEN
   GET STACKED DIAGNOSTICS actual = CONSTRAINT_NAME;
   IF actual <> expected THEN RAISE EXCEPTION 'Wrong constraint %, expected %',actual,expected; END IF;
  END;
 END LOOP;
END $$;

DO $$ BEGIN
 BEGIN
  INSERT INTO public.quote_requests(name,phone,product) VALUES (' ', '------','invented');
  RAISE EXCEPTION 'Invalid lead accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.quote_requests(id,name,phone,product) VALUES (gen_random_uuid(),'Fixture','1234567890','PVC Pipes');
  RAISE EXCEPTION 'Caller supplied id accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.quote_requests(created_at,name,phone,product) VALUES (now(),'Fixture','1234567890','PVC Pipes');
  RAISE EXCEPTION 'Caller supplied timestamp accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM 1 FROM public.quote_requests; RAISE EXCEPTION 'Writer can read';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.quote_requests SET name='changed'; RAISE EXCEPTION 'Writer can update';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  DELETE FROM public.quote_requests; RAISE EXCEPTION 'Writer can delete';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN
  INSERT INTO public.quote_requests(name,phone,product) VALUES ('Bypass','1234567890','PVC Pipes');
  RAISE EXCEPTION 'Anonymous bypass allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  INSERT INTO public.quote_requests(name,phone,product) VALUES ('Bypass','1234567890','PVC Pipes');
  RAISE EXCEPTION 'Authenticated bypass allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
