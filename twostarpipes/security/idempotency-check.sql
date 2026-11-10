-- Disposable staging after 004; fixtures rolled back, no public lead reads required.
BEGIN;
SET LOCAL ROLE quote_writer;
INSERT INTO public.quote_requests(request_id,name,phone,product) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Idempotency fixture','1234567890','PVC Pipes');
DO $$ BEGIN
 BEGIN
  INSERT INTO public.quote_requests(request_id,name,phone,product) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Idempotency fixture','1234567890','PVC Pipes');
  RAISE EXCEPTION 'Duplicate request stored';
 EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
