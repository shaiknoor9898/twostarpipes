-- Versioned draft after 003. No existing leads are removed or backfilled.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
ALTER TABLE public.quote_requests ADD COLUMN request_id uuid;
ALTER TABLE public.quote_requests ALTER COLUMN request_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.quote_requests ADD CONSTRAINT quote_request_id_unique UNIQUE(request_id);
GRANT INSERT(request_id) ON public.quote_requests TO quote_writer;
COMMIT;
