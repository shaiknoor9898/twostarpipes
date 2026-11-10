-- Separate staging-first, operator-approved step. Reports failure without deleting leads.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
ALTER TABLE public.quote_requests VALIDATE CONSTRAINT quote_name_check;
ALTER TABLE public.quote_requests VALIDATE CONSTRAINT quote_phone_check;
ALTER TABLE public.quote_requests VALIDATE CONSTRAINT quote_customer_check;
ALTER TABLE public.quote_requests VALIDATE CONSTRAINT quote_product_check;
ALTER TABLE public.quote_requests VALIDATE CONSTRAINT quote_optional_check;
COMMIT;
