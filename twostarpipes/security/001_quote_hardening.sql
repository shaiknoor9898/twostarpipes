-- REVIEW DRAFT. Explicitly apply to disposable staging first. Never auto-run.
-- Requires owner privileges; brief lock timeout avoids waiting on production traffic.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
-- Fail on unexpected policies rather than silently remove unknown operator rules.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_requests'
 AND policyname <> 'Anyone can submit a quote request') THEN
 RAISE EXCEPTION 'Unexpected policies: inspect manually before proceeding'; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='quote_writer') THEN
 RAISE EXCEPTION 'quote_writer already exists: inspect privileges manually'; END IF;
END $$;
CREATE ROLE quote_writer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT quote_writer TO authenticator;
GRANT USAGE ON SCHEMA public TO quote_writer;
-- Explicitly remove table AND column grants (table REVOKE alone is insufficient).
REVOKE ALL ON public.quote_requests FROM PUBLIC, anon, authenticated;
DO $$ DECLARE cols text; BEGIN
 SELECT string_agg(quote_ident(attname), ',') INTO cols FROM pg_attribute
 WHERE attrelid='public.quote_requests'::regclass AND attnum>0 AND NOT attisdropped;
 EXECUTE format('REVOKE SELECT (%s), INSERT (%s), UPDATE (%s), REFERENCES (%s) ON public.quote_requests FROM PUBLIC, anon, authenticated', cols, cols, cols, cols);
END $$;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit a quote request" ON public.quote_requests;
GRANT INSERT (name, phone, email, city, customer_type, product, quantity, message)
 ON public.quote_requests TO quote_writer;
CREATE POLICY quote_writer_insert ON public.quote_requests FOR INSERT TO quote_writer WITH CHECK (true);
-- NOT VALID protects new writes without scanning/modifying old leads.
ALTER TABLE public.quote_requests ADD CONSTRAINT quote_name_check CHECK
 (name = btrim(name) AND char_length(name) BETWEEN 1 AND 100 AND name ~ '[^[:space:]]') NOT VALID;
ALTER TABLE public.quote_requests ADD CONSTRAINT quote_phone_check CHECK
 (char_length(phone) BETWEEN 6 AND 20 AND phone ~ '^\+?[0-9()[:space:]-]+$'
 AND char_length(regexp_replace(phone, '[^0-9]', '', 'g')) BETWEEN 6 AND 15) NOT VALID;
ALTER TABLE public.quote_requests ADD CONSTRAINT quote_customer_check CHECK
 (customer_type IN ('farmer','dealer','wholesaler','contractor','other')) NOT VALID;
ALTER TABLE public.quote_requests ADD CONSTRAINT quote_product_check CHECK
 (product IN ('PVC Pipes','Agricultural Pipes','Casing Pipes','UPVC Pipes','Electrical Pipes','Drip Pipes','Drip Fittings','Multiple products')) NOT VALID;
-- Intentionally coarse email shape: app Zod validation remains stricter.
ALTER TABLE public.quote_requests ADD CONSTRAINT quote_optional_check CHECK
 ((email IS NULL OR (char_length(email)<=255 AND (email='' OR email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')))
 AND (city IS NULL OR char_length(city)<=100)
 AND (quantity IS NULL OR char_length(quantity)<=100)
 AND (message IS NULL OR char_length(message)<=1000)) NOT VALID;
COMMIT;
